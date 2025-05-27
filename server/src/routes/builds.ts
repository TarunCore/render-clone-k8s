import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { client } from "../configs/db";
import k8sApi, { coreApi, networkingApi } from "../configs/k8s";

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

function getPodManifest(deploymentId: string, command: string) {
    const podManifest = {
        metadata: {
            name: `${deploymentId}-pod`,
            labels: { app: deploymentId }
        },
        spec: {
            containers: [
                {
                    name: deploymentId,
                    image: 'node:22.15-alpine',
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
    const { github_url, to_deploy_commit_hash, project_type, deploymentId, subdomain } = req.body;
    if (!github_url || !to_deploy_commit_hash || !project_type) {
        return res.status(400).send({ status: "error", message: "Missing required fields" });
    }
    // Apply podManifest
    const command = getCommand(github_url, "npm install", "node index.js");
    const podManifest = getPodManifest(deploymentId, command);
    // if already exists, apply the podManifest
    const existingPod = await k8sApi.readNamespacedPod({namespace: 'default', name: `${deploymentId}-pod`});
    let data;
    if (existingPod) {
        await k8sApi.deleteNamespacedPod({namespace: 'default', name: `${deploymentId}-pod`});
    }
    data = await k8sApi.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    });
      
    // Update DB
    await client.query("UPDATE deployments SET status = 'building' WHERE id = $1", [deploymentId]);
    res.status(200).send({ status: "success", message: "Build started", data, podManifest });
}));
buildRouter.post("/create/service/:subdomain", asyncHandler(async (req: Request, res: Response) => {
    const { subdomain } = req.params;
    const service = {
        metadata: { name: `service-${subdomain}` }, // TODO: use proper naming
        spec: {
          selector: { app: `${subdomain}` },
          ports: [{ port: 80, targetPort: 3000 }],
          type: 'ClusterIP'
        }
      };
      
      await coreApi.createNamespacedService({namespace: 'default', body: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: service.metadata,
        spec: service.spec
      }});
      
    // Update DB
    res.status(200).send({ status: "success", message: "Service created" });
}));
// add the domain to the existing ingress
// apiVersion: networking.k8s.io/v1
// kind: Ingress
// metadata:
//   name: todoapp-ingress
//   annotations:
//     nginx.ingress.kubernetes.io/rewrite-target: /
// spec:
//   rules:
//   - host: todoapp.my-domain.com
//     http:
//       paths:
//       - path: /
//         pathType: Prefix
//         backend:
//           service:
//             name: todoapp-service
//             port:
//               number: 80

buildRouter.post("/update-ingress/:subdomain", asyncHandler(async (req: Request, res: Response) => {
    const { subdomain } = req.params;
    // TODO: use proper naming. change hardcoded ingress name
    const ingress = await networkingApi.readNamespacedIngress({namespace: 'default', name: 'todoapp-ingress'});
    if (!ingress.spec) {
        return res.status(400).send({ status: "error", message: "Ingress not found" });
    }
    if(!ingress.spec.rules) {
        ingress.spec.rules = [];
    }
    ingress.spec.rules.push({
        host: `${subdomain}.my-domain.com`,
        http: {
            paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: `service-${subdomain}`, port: { number: 80 } } } }]
        }
    });
    await networkingApi.replaceNamespacedIngress({namespace: 'default', name: 'todoapp-ingress', body: ingress});
    
    res.status(200).send({ status: "success", message: "Ingress updated" });
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