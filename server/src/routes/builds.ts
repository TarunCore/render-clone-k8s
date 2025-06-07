import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, hasProjectPermission, loginUser } from "../services/authServices";
import { client } from "../configs/db";
import k8sApi, { coreApi, networkingApi } from "../configs/k8s";
import { createClusterIPService, updateIngress } from "../services/buildService";
import { jwtMiddleware } from "../middleware/auth";
import logger from "../logger";

const buildRouter = express.Router();
interface Command {
    installCommand?: string;
    buildCommand?: string;
    runCommand?: string;
    envVariables?: string;
}
function getCommand(githubUrl: string, commands: Command) {
    const repoName = githubUrl.split('/').pop()?.replace(/\.git$/, '') || 'repo';
    const parts = [
        `git clone ${githubUrl}`,
        `cd ${repoName}`
    ];

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
    "go": "golang:1.20"
}

function getPodManifest(projectId: string, command: string, projectType: keyof typeof projectTypeToImage) { // TODO: change to project_id
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
                    ports: [{ containerPort: 3000 }],
                }
            ],
            restartPolicy: 'Never'
        }
    };
    return podManifest;
}

buildRouter.post("/create/", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const canAccess = await hasProjectPermission(req.body.project_id, req.user);
    if(!canAccess) {
        res.status(401);
        return;
    }

    const { github_url, to_deploy_commit_hash, project_type, project_id } = req.body;
    if (!github_url || !to_deploy_commit_hash || !project_type || !project_id) {
        return res.status(400).send({ status: "error", message: "Missing required fields" });
    }
    
    const project = await client.query("SELECT subdomain, build_commands, install_commands, run_commands, env_variables FROM projects WHERE id = $1", [project_id]);
    const command = getCommand(github_url, {
        buildCommand: project.rows[0].build_commands,
        installCommand: project.rows[0].install_commands,
        runCommand: project.rows[0].run_commands,
        envVariables: project.rows[0].env_variables
    });
    const podManifest = getPodManifest(project_id, command, project_type);
    
    try {
        const existingPod = await k8sApi.readNamespacedPod({ namespace: 'default', name: `pod-${project_id}` });
        if (existingPod) {
            await k8sApi.deleteNamespacedPod({ namespace: 'default', name: `pod-${project_id}` });
        }
        const existingService = await coreApi.readNamespacedService({ namespace: 'default', name: `service-${project_id}` });
        if (existingService) {
            await coreApi.deleteNamespacedService({ namespace: 'default', name: `service-${project_id}` });
        }
    } catch (e) {
        console.log("Pod not found. Creating new pod.")
    }

    // Apply podManifest
    const data = await k8sApi.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    });

    const service = await createClusterIPService(project_id);
    if (!service) {
        return res.status(400).send({ status: "error", message: "Service creation failed", error: service });
    }
    const ingress = await updateIngress(project_id, project.rows[0].subdomain); // subdomain used for first time
    if (!ingress) {
        return res.status(400).send({ status: "error", message: "Ingress update failed" });
    }

    await client.query("UPDATE projects SET status = 'building' WHERE id = $1", [project_id]);
    await client.query(`INSERT INTO builds (status, status_message,build_started_at, 
        commit_hash, commit_message,project_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, ["building", "Build started", new Date(), to_deploy_commit_hash, "samsple msg", project_id]);
    res.status(200).send({ status: "success", message: "Build started", data, podManifest });

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