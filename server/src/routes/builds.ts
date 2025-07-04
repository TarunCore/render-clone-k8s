import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, hasProjectPermission, loginUser } from "../services/authServices";
import { client } from "../configs/db";
import k8sApi, { coreApi, networkingApi } from "../configs/k8s";
import { createClusterIPService, deletePodAndService, updateIngress } from "../services/buildService";
import { jwtMiddleware } from "../middleware/auth";
import logger from "../logger";
import { Project } from "../types/deploymentTypes";

const buildRouter = express.Router();
interface Command {
    installCommand?: string;
    buildCommand?: string;
    runCommand?: string;
    envVariables?: string;
    branch?: string;
    commitHash?: string;
    rootPath?: string;
}
function getCommand(githubUrl: string, commands: Command) {
    const repoName = githubUrl.split('/').pop()?.replace(/\.git$/, '') || 'repo';
    const cloneCmd = commands.branch 
        ? `git clone -b ${commands.branch} ${githubUrl}` 
        : `git clone ${githubUrl}`;
    const parts = [
        cloneCmd,
        `cd ${repoName}`
    ];

    if (commands.commitHash) {
        parts.push(`git checkout ${commands.commitHash}`);
    }
    if (commands.rootPath && commands.rootPath !== '/') {
        const relativePath = commands.rootPath.startsWith('/') 
            ? commands.rootPath.slice(1) 
            : commands.rootPath;
        parts.push(`cd ${relativePath}`);
    }

    if (commands.installCommand) {
        parts.push(commands.installCommand);
    }
    if (commands.envVariables) {
        parts.push('touch .env');
        const vars = commands.envVariables
            .split("\n")
            .map(v => v.trim())
            .filter(Boolean)
            .map(v => `echo "${v}" >> .env`);
        parts.push(...vars);
    }
    if (commands.buildCommand) {
        parts.push(commands.buildCommand);
    }
    if (commands.runCommand) {
        parts.push(commands.runCommand);
    }

    return parts.join(' && ');
}


const projectTypeToImage = {
    "nodejs": "node:22.15",
    "python": "python:3.10.17",
    "go": "golang:1.24.4"
}

function getPodManifest(projectId: string, command: string, projectType: keyof typeof projectTypeToImage, port: number) { // TODO: change to project_id
    const podManifest = {
        metadata: {
            name: `pod-${projectId}`,
            labels: { app: projectId }
        },
        spec: {
            containers: [
                {
                    name: projectId,
                    image: projectTypeToImage[projectType],
                    command: ['sh', '-c'],
                    args: [command],
                    ports: [{ containerPort: port }],
                }
            ],
            restartPolicy: 'Never'
        }
    };
    return podManifest;
}

buildRouter.post("/create/", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const canAccess = await hasProjectPermission(req.body.project_id, req.user);
    if (!canAccess) {
        res.status(401);
        return;
    }

    const { github_url, to_deploy_commit_hash, commit_message, project_type, project_id, branch } = req.body;
    if (!github_url || !to_deploy_commit_hash || !project_type || !project_id || !branch) {
        logger.error("Missing required fields for build creation");
        return res.status(400).send({ status: "error", message: "Missing required fields" });
    }

    const project = await client.query<Project>("SELECT subdomain, build_commands, install_commands, run_commands, env_variables, port, root_path FROM projects WHERE id = $1", [project_id]);
    const command = getCommand(github_url, {
        buildCommand: project.rows[0].build_commands,
        installCommand: project.rows[0].install_commands,
        runCommand: project.rows[0].run_commands,
        envVariables: project.rows[0].env_variables,
        branch: branch,
        commitHash: to_deploy_commit_hash,
        rootPath: project.rows[0].root_path
    });
    if(!project.rows[0].port) {
        return res.status(400).send({ status: "error", message: "Port not found" });
    }
    const podManifest = getPodManifest(project_id, command, project_type, project.rows[0].port);

    await deletePodAndService(project_id);

    // Apply podManifest
    const data = await k8sApi.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    });

    const service = await createClusterIPService(project_id, project.rows[0].port);
    if (!service) {
        return res.status(400).send({ status: "error", message: "Service creation failed", error: service });
    }
    const ingress = await updateIngress(project_id, project.rows[0].subdomain); // subdomain used for first time
    if (!ingress) {
        return res.status(400).send({ status: "error", message: "Ingress update failed" });
    }
    // CREATE TABLE builds (
    //     id SERIAL PRIMARY KEY,
    //     git_commit_hash VARCHAR(255) NOT NULL,
    //     git_commit_message TEXT,
    //     git_branch VARCHAR(60) NOT NULL,
    //     status VARCHAR(50) NOT NULL,
    //     status_message TEXT,
    //     build_started_at TIMESTAMP,
    //     build_finished_at TIMESTAMP,
    //     project_id BIGINT,
    //     logs TEXT DEFAULT ''
    // );

    const buildData = await client.query(`INSERT INTO builds (status, status_message,build_started_at, 
        git_commit_hash, git_commit_message,project_id, git_branch)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, ["running", "Build started", new Date(), to_deploy_commit_hash, commit_message || "No message", project_id, branch]);
    if (buildData.rows.length === 0) {
        return res.status(400).send({ status: "error", message: "DB update failed" });
    }
    await client.query("UPDATE projects SET status = 'running', last_build_id = $1 WHERE id = $2", [buildData.rows[0].id, project_id]);
    res.status(200).send({ status: "success", message: "Pod, Service, Ingress Created. Build started", data, podManifest });
}));
buildRouter.post("/create/service/:project_id", asyncHandler(async (req: Request, res: Response) => {
    res.send("Not available");
    return;
    const { project_id } = req.params;
    const service = {
        metadata: { name: `service-${project_id}` }, // TODO: use proper naming
        spec: {
            selector: { app: `${project_id}` },
            ports: [{ port: 80, targetPort: 3000 }],
            type: 'ClusterIP'
        }
    };

    await coreApi.createNamespacedService({
        namespace: 'default', body: {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: service.metadata,
            spec: service.spec
        }
    });
    res.status(200).send({ status: "success", message: "Service created" });
}));

buildRouter.post("/update-ingress/:project_id/:subdomain", asyncHandler(async (req: Request, res: Response) => {
    res.send("Not available");
    return;
    const { project_id, subdomain } = req.params;
    // const ingress = await networkingApi.readNamespacedIngress({ namespace: 'default', name: 'main-ingress' });
    // if (!ingress.spec) {
    //     return res.status(400).send({ status: "error", message: "Ingress not found" });
    // }
    // if (!ingress.spec.rules) {
    //     ingress.spec.rules = [];
    // }
    // ingress.spec.rules.push({
    //     host: `${subdomain}.my-domain.com`,
    //     http: {
    //         paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: `service-${project_id}`, port: { number: 80 } } } }]
    //     }
    // });
    // await networkingApi.replaceNamespacedIngress({ namespace: 'default', name: 'main-ingress', body: ingress });
    res.status(200).send({ status: "success", message: "Ingress updated" });
}));

buildRouter.get("/status/:project_id", asyncHandler(async (req: Request, res: Response) => {
    const { project_id } = req.params;
    const build = await k8sApi.readNamespacedPod({ namespace: 'default', name: `pod-${project_id}` });
    if (build.status?.phase === 'Error' || build.status?.phase === 'Completed') {
        logger.error(`Build failed for project ${project_id}`);
        await client.query("UPDATE projects SET status = 'failed' WHERE id = $1", [project_id]);
        client.query("UPDATE builds SET status = 'failed' WHERE project_id = $1", [project_id]);
    }

    const data = await client.query("SELECT * FROM projects WHERE id = $1 ORDER BY build_started_at DESC LIMIT 1", [project_id]);
    res.status(200).send({ status: "success", message: "Build status", data: data.rows[0] });
}));



export default buildRouter;