import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { client } from "../configs/db";
import k8sApi from "../configs/k8s";

const buildRouter = express.Router();

function getCommand(githubUrl: string, buildCommand: string, runCommand: string) {
    const repoName = githubUrl.split('/').pop()?.replace(/\.git$/, '') || 'repo';
    let command = `
        git clone ${githubUrl} && \
        cd ${repoName} && \
        npm install && \
        echo "MONGO_URI=mongodb+srv://test:test@cluster0.vytqvwl.mongodb.net/" > .env && \
        echo "ACCESS_TOKEN_SECRET=adsf" >> .env && \
        `;
    if (buildCommand) {
        command += `${buildCommand} && \ `;
    }
    if (runCommand) {
        command += `${runCommand}`;
    }
    return command;
}

function getPodManifest(subdomain: string, command: string) {
    const podManifest = {
        metadata: {
            name: `${subdomain}-pod`,
            labels: { app: subdomain }
        },
        spec: {
            containers: [
                {
                    name: subdomain,
                    image: 'node:22.15',
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

buildRouter.post("/create/v2", asyncHandler(async (req: Request, res: Response) => {
    const { github_url, to_deploy_commit_hash, project_type, deploymentId } = req.body;
    if (!github_url || !to_deploy_commit_hash || !project_type) {
        return res.status(400).send({ status: "error", message: "Missing required fields" });
    }
    // Apply podManifest
    const command = getCommand(github_url, "npm install", "node index.js");
    const podManifest = getPodManifest(deploymentId, command);
    const data = await k8sApi.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    });
    // Update DB
    res.status(200).send({ status: "success", message: "Build started", data, podManifest });
}));


// buildRouter.post("/watch-logs/:deploymentId/:containerId", asyncHandler(async (req: Request, res: Response) => {
//     const { containerId, deploymentId } = req.params;
//     const spawn = require('child_process').spawn;
//     const logStream = spawn('docker', ['logs', '-f', containerId]);
//     console.log("watching logs for: " + containerId);
//     logStream.stdout.on('data', (data: any) => {
//         // const cleanLogs = stripAnsi(data.toString());
//         const cleanLogs = data.toString();

//         console.log("cleanLogs");
//         socket.send(JSON.stringify({ containerId, logs: cleanLogs, deploymentId, type: "log" }));
//     });
//     res.send({ status: "success", message: "Websocket connection initialized to central server" });
// }));


export default buildRouter;