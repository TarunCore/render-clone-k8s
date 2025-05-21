import express, { Request, Response } from 'express';
const buildRouter = express.Router();


import { asyncHandler } from "../util/common";
import { startBuild } from "../services/buildService";
import { docker } from '../docker/docker';
import { socket } from '../index';
import stripAnsi from 'strip-ansi';

const PROJECT_VS_IMAGE = {
    "nodejs": "node:22.15",
    "node-builder": "node-builder",
}

buildRouter.post("/create", asyncHandler(async (req: Request, res: Response) => {
    const { github_url, to_deploy_commit_hash, project_type } = req.body;
    if (!github_url || !to_deploy_commit_hash || !project_type) {
      return res.status(400).send({ status: "error", message: "Missing required fields" });
    }
    const container = await docker.createContainer({
        Image: PROJECT_VS_IMAGE["nodejs"],
        // Cmd: ['/bin/sh', '-c', 'while true; do sleep 1000; done'],
        Cmd: ['/bin/sh', '-c', 'ls'],
        name: 'node-'+(Math.floor(Math.random() * 1000)).toString(),
      }).catch((err) => {
        console.error("Error creating container:", err);
        res.status(500).send({ status: "error", message: "Error creating container", error: err });
        return null;
      });
      
      if (!container) return;
      
      await container.start().catch((err) => {
        console.error("Error starting container:", err);
        res.status(500).send({ status: "error", message: "Error starting container", error: err });
        return;
      });
      // startBuild(container.id, github_url, to_deploy_commit_hash);
      console.log(`Container created with id: ${container.id} and started`);
      
      res.send({ status: "success", message: "Build created successfully", data: container });
}));

buildRouter.post("/create/v2", asyncHandler(async (req: Request, res: Response) => {
    const { github_url, to_deploy_commit_hash, project_type } = req.body;
    if (!github_url || !to_deploy_commit_hash || !project_type) {
      return res.status(400).send({ status: "error", message: "Missing required fields" });
    }
    const repoName = github_url.split('/').pop()?.replace(/\.git$/, '') || 'repo';
    const nodeCommand = `
        git clone ${github_url} && \
        cd ${repoName} && \
        pwd && \
        git checkout ${to_deploy_commit_hash} && \
        npm install && \
        touch .env && \
        echo "MONGO_URI=mongodb://localhost:27017" > .env && \
        echo "ACCESS_TOKEN_SECRET=adsf" >> .env && \
        node index.js
    `;
    const fullCmd = `build-and-run.sh ${github_url} ${to_deploy_commit_hash} && ls && cd app && ls && ${"node index.js"}`;

    const container = await docker.createContainer({
      Image: 'node-builder',
      Cmd: ['/bin/sh', '-c', nodeCommand],
      name: 'build-'+(Math.floor(Math.random() * 1000)).toString(),
      Tty: true, //TODO : make it false?
    });
    
      console.log(`Container created with id: ${container.id} and started`);
      
      await container.start();
      res.send({ status: "success", containerId: container.id });
  }));


buildRouter.post("/watch-logs/:containerId", asyncHandler(async (req: Request, res: Response) => {
  const { containerId } = req.params;
  const spawn = require('child_process').spawn;
  const logStream = spawn('docker', ['logs', '-f', containerId]);
  console.log("watching logs for: "+containerId);
  logStream.stdout.on('data', (data: any) => {
    // const cleanLogs = stripAnsi(data.toString());
    const cleanLogs = data.toString();

    console.log("cleanLogs");
    socket.send(JSON.stringify({ containerId, logs: cleanLogs, deploymentId: "3", type: "log" }));
  });
  res.send({status: "success", message: "Websocket connection initialized to central server" });
}));

/* Support only nodejs project for now
1. Main backend gives repo link
2. Create a new container
3. Clone the repo inside the container
4. Install dependencies
5. run pm2
6. Give the container id to the main backend
7. Main backend will use this container id to access the container








*/
buildRouter.delete('/all', asyncHandler(async (req: Request, res: Response) => {

    res.send({status: "success", message: "All builds deleted successfully" });
}));

export default buildRouter;