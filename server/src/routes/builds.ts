import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { hasProjectPermission } from "../services/authServices";
import { client } from "../configs/db";
import k8sApi, { coreApi, networkingApi } from "../configs/k8s";
import { createClusterIPService, createPod, deletePodAndService, K8sServiceError, updateIngress } from "../services/buildService";
import { jwtMiddleware } from "../middleware/auth";
import logger from "../logger";
import { Project, Projectstatus } from "../types/deploymentTypes";

const buildRouter = express.Router();

const PROJECT_TYPE_IMAGES = {
    nodejs: "node:22.15",
    python: "python:3.10.17",
    go: "golang:1.24.4"
} as const;

type ProjectType = keyof typeof PROJECT_TYPE_IMAGES;

interface BuildCommand {
    installCommand?: string;
    buildCommand?: string;
    runCommand?: string;
    envVariables?: string;
    branch?: string;
    commitHash?: string;
    rootPath?: string;
}

interface CreateBuildRequest {
    github_url: string;
    to_deploy_commit_hash: string;
    commit_message?: string;
    project_type: ProjectType;
    project_id: string;
    branch: string;
}

function validateGithubUrl(url: string): boolean {
    return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/.test(url);
}

function buildShellCommand(githubUrl: string, commands: BuildCommand): string {
    const repoName = githubUrl.split('/').pop()?.replace(/\.git$/, '') || 'repo';
    const cloneCmd = commands.branch 
        ? `git clone -b ${commands.branch} ${githubUrl}` 
        : `git clone ${githubUrl}`;
    
    const parts = [cloneCmd, `cd ${repoName}`];

    if (commands.commitHash) {
        parts.push(`git checkout ${commands.commitHash}`);
    }
    
    if (commands.rootPath && commands.rootPath !== '/') {
        //remove leading slash
        const relativePath = commands.rootPath.replace(/^\//, '');
        parts.push(`cd ${relativePath}`);
    }

    if (commands.installCommand) {
        parts.push(commands.installCommand);
    }
    
    if (commands.envVariables) {
        parts.push('touch .env');
        commands.envVariables
            .split("\n")
            .map(v => v.trim())
            .filter(Boolean)
            .forEach(v => parts.push(`echo "${v}" >> .env`));
    }
    
    if (commands.buildCommand) {
        parts.push(commands.buildCommand);
    }
    
    if (commands.runCommand) {
        parts.push(commands.runCommand);
    }

    return parts.join(' && ');
}

buildRouter.post("/create/", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { github_url, to_deploy_commit_hash, commit_message, project_type, project_id, branch } = req.body as Partial<CreateBuildRequest>;
    
    if (!github_url || !to_deploy_commit_hash || !project_type || !project_id || !branch) {
        logger.warn("Build creation failed: missing required fields", { project_id });
        return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    if (!validateGithubUrl(github_url)) {
        return res.status(400).json({ status: "error", message: "Invalid GitHub URL. Only https://github.com URLs are allowed" });
    }

    const canAccess = await hasProjectPermission(project_id, req.user);
    if (!canAccess) {
        return res.status(401).json({ status: "error", message: "Unauthorized access to project" });
    }

    if (!(project_type in PROJECT_TYPE_IMAGES)) {
        return res.status(400).json({ 
            status: "error", 
            message: `Invalid project type. Supported: ${Object.keys(PROJECT_TYPE_IMAGES).join(', ')}` 
        });
    }

    const projectResult = await client.query<Project>(
        `SELECT subdomain, build_commands, install_commands, run_commands, env_variables, port, root_path 
         FROM projects WHERE id = $1`, 
        [project_id]
    );

    if (projectResult.rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Project not found" });
    }

    const projectConfig = projectResult.rows[0];
    if (!projectConfig.port) {
        return res.status(400).json({ status: "error", message: "Project port not configured" });
    }

    const shellCommand = buildShellCommand(github_url, {
        buildCommand: projectConfig.build_commands,
        installCommand: projectConfig.install_commands,
        runCommand: projectConfig.run_commands,
        envVariables: projectConfig.env_variables,
        branch,
        commitHash: to_deploy_commit_hash,
        rootPath: projectConfig.root_path
    });

    const image = PROJECT_TYPE_IMAGES[project_type];

    try {
        await deletePodAndService(project_id);

        await createPod(project_id, shellCommand, image, projectConfig.port);
        await createClusterIPService(project_id, projectConfig.port);
        await updateIngress(project_id, projectConfig.subdomain);
    } catch (error) {
        const message = error instanceof K8sServiceError ? error.message : 'Kubernetes deployment failed';
        logger.error("Build deployment failed", { project_id, error });
        return res.status(500).json({ status: "error", message });
    }

    const buildResult = await client.query<{ id: string }>(
        `INSERT INTO builds (status, status_message, build_started_at, git_commit_hash, git_commit_message, project_id, git_branch)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ["running" as Projectstatus, "Build started", new Date(), to_deploy_commit_hash, commit_message || "No message", project_id, branch]
    );

    if (buildResult.rows.length === 0) {
        logger.error("Failed to create build record", { project_id });
        return res.status(500).json({ status: "error", message: "Failed to create build record" });
    }

    const buildId = buildResult.rows[0].id;
    await client.query(
        "UPDATE projects SET status = $1, last_build_id = $2 WHERE id = $3", 
        ["running" as Projectstatus, buildId, project_id]
    );

    logger.info("Build started successfully", { project_id, build_id: buildId });
    
    res.status(200).json({ 
        status: "success", 
        message: "Build started successfully",
        build_id: buildId
    });
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