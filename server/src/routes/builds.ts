import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { client } from "../configs/db";
import k8sApi, { coreApi, networkingApi } from "../configs/k8s";

const buildRouter = express.Router();
interface Command {
    installCommand?: string;
    buildCommand?: string | null;
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
    if (commands.buildCommand) {
        parts.push(commands.buildCommand);
    }
    if (commands.runCommand) {
        parts.push(commands.runCommand);
    }
    if (commands.envVariables) {
        const vars = commands.envVariables
            .split("\n")
            .map(v => v.trim())
            .filter(Boolean)
            .map(v => `echo "${v}" >> .env`);
        parts.unshift('touch .env');
        parts.push(...vars);
    }

    return parts.join(' && ');
}


const projectTypeToImage = {
    "nodejs": "node:22.15",
    "python": "python:3.10",
    "go": "golang:1.20"
}

function getPodManifest(projectId: string, command: string, projectType: keyof typeof projectTypeToImage) { // TODO: change to project_id
    const podManifest = {
        metadata: {
            name: `${projectId}-pod`,
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

const env =`MONGO_URI=mongodb+srv://test:test@cluster0.vytqvwl.mongodb.net/
ACCESS_TOKEN_SECRET=adsf`

buildRouter.post("/create/v2", asyncHandler(async (req: Request, res: Response) => {
    const { github_url, to_deploy_commit_hash, project_type, project_id, subdomain } = req.body;
    if (!github_url || !to_deploy_commit_hash || !project_type || !project_id) {
        return res.status(400).send({ status: "error", message: "Missing required fields" });
    }
    // Apply podManifest
    const project = await client.query("SELECT build_commands, install_commands, run_commands, env_variables FROM projects WHERE id = $1", [project_id]);
    const command = getCommand(github_url, {
        buildCommand: project.rows[0].build_commands,
        installCommand: project.rows[0].install_commands,
        runCommand: project.rows[0].run_commands,
        envVariables: project.rows[0].env_variables
    });
    // const command = getCommand(github_url, {
    //     buildCommand: null,
    //     installCommand: "npm install",
    //     runCommand: "node index.js",
    //     envVariables: env
    // });
    const podManifest = getPodManifest(project_id, command, project_type);
    // if already exists, apply the podManifest
    // const existingPod = await k8sApi.readNamespacedPod({namespace: 'default', name: `${deploymentId}-pod`});
    // let data;
    // if (existingPod) {
    //     await k8sApi.deleteNamespacedPod({namespace: 'default', name: `${deploymentId}-pod`});
    // }
    console.dir(podManifest, { depth: null });

    const data = await k8sApi.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    });
    // Update DB
    await client.query("UPDATE projects SET status = 'building' WHERE id = $1", [project_id]);
    await client.query(`INSERT INTO builds (status, status_message,build_started_at, 
        commit_hash, commit_message,project_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, ["building", "Build started", new Date(), to_deploy_commit_hash, "samsple msg", project_id]);        
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