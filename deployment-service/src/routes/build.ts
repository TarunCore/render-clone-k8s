import express, { Request, Response } from 'express';
const buildRouter = express.Router();


import { asyncHandler } from "../util/common";
import { getUnusedPort, startBuild, stopAndRemove } from "../services/buildService";
import { docker } from '../docker/docker';
import { socket } from '../index';
import stripAnsi from 'strip-ansi';
import { client } from '../docker/db';

const PROJECT_VS_IMAGE = {
    "nodejs": "node:22.15",
    "node-builder": "node-builder",
}

buildRouter.post("/create/v2", asyncHandler(async (req: Request, res: Response) => {
    const { github_url, to_deploy_commit_hash, project_type, deploymentId } = req.body;
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
    const prevBuilds = await client.query("SELECT * FROM builds WHERE base_deployment_id = $1", [deploymentId]);
    // kill all previous builds
    for (const build of prevBuilds.rows) {
        if(build.status=="cancelled") continue;
        stopAndRemove(build.container_id); // TODO: this takes lot of time with await. check it
        client.query("UPDATE builds SET status = $1, status_message = $2, build_finished_at = $3 WHERE id = $4", ["cancelled", "Build Deleted as new build started", new Date(), build.id]);
    }
    const port = await getUnusedPort();
    // create a new container

    const container = await docker.createContainer({
      Image: 'node-builder',
      Cmd: ['/bin/sh', '-c', nodeCommand],
      name: 'build-'+(Math.floor(Math.random() * 1000)).toString(),
      ExposedPorts: {
        [`3000/tcp`]: {}, // TODO: Get port number from user
      },
      Tty: true, //TODO : make it false?
      HostConfig: {
        PortBindings: {
          [`3000/tcp`]: [
            {
              HostPort: `${port}`,
            },
          ],
        },
      },
    });
    
      console.log(`Container created id: ${container.id} and started with port: ${port}=>3000`);
      
      await container.start();
      const buildData = await client.query(`INSERT INTO builds (status, status_message,build_started_at, 
        commit_hash, commit_message,base_deployment_id, container_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, ["pending", "Build started", new Date(), to_deploy_commit_hash, "com msg", deploymentId, container.id]);
      // TODO: validate buildData
      await client.query(`UPDATE deployments SET last_build_id = $1, last_deployed_hash = $2, last_deployed_at = $3 WHERE id = $4`, [buildData.rows[0].id, to_deploy_commit_hash, new Date(), deploymentId]);
      const randomString = Math.random().toString(36).substring(2, 9);
      await client.query(`INSERT INTO domains (sub_domain, deployment_id, ip, port) VALUES($1, $2, $3, $4)`, [randomString, deploymentId, "localhost", port]);
      res.send({ status: "success", containerId: container.id, port });
  }));


buildRouter.post("/watch-logs/:deploymentId/:containerId", asyncHandler(async (req: Request, res: Response) => {
  const { containerId, deploymentId } = req.params;
  const spawn = require('child_process').spawn;
  const logStream = spawn('docker', ['logs', '-f', containerId]);
  console.log("watching logs for: "+containerId);
  logStream.stdout.on('data', (data: any) => {
    // const cleanLogs = stripAnsi(data.toString());
    const cleanLogs = data.toString();

    console.log("cleanLogs");
    socket.send(JSON.stringify({ containerId, logs: cleanLogs, deploymentId, type: "log" }));
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