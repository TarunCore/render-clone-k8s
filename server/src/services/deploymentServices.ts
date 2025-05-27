import { DEP_MANAGER_BASE_URL } from "../config";
import { client } from "../configs/db";
import { Deployment } from "../types/deploymentTypes";
import { z } from "zod";
// import fetch from "node-fetch"
const createDeploymentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    github_url: z.string().url("Must be a valid URL"),
    project_type: z.enum(["nodejs", "python", "java", "php", "ruby", "go"]),
    subdomain: z.string().min(1, "Subdomain is required")
  });
  
type CreateDeploymentType = z.infer<typeof createDeploymentSchema>;

async function getDeployments(): Promise<Deployment[]> {
    const result = await client.query<Deployment>(
        'SELECT * FROM deployments'
    );
    return result.rows;
}

async function createDeployment(deployment: CreateDeploymentType): Promise<Deployment> {
    const parseData = createDeploymentSchema.safeParse(deployment);
    if (!parseData.success) {
        throw new Error("Invalid payload");
        // throw new Error(parseData.error.errors[0].message);
    }
    const { name, description, github_url, project_type, subdomain } = parseData.data;
    const result = await client.query<Deployment>(
        'INSERT INTO deployments (name, description, github_url, project_type, status, subdomain) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, description, github_url, project_type, "pending", subdomain]
    );
    return result.rows[0];
}

async function startBuild(deploymentId: string, to_deploy_commit_hash: string): Promise<Deployment | null> {
    const deployment = await client.query<Deployment>("SELECT * FROM deployments WHERE id=$1",[deploymentId]);
    if(deployment.rowCount==0) {throw new Error("Deployment not found")};
    const {github_url, last_deployed_hash, project_type} = deployment.rows[0];
    if (last_deployed_hash === to_deploy_commit_hash) {
        throw new Error("No new commits to deploy")
    }
    const askDeploymentManager = await fetch(`${DEP_MANAGER_BASE_URL}/api/v1/build/create`)
    // Support only nodejs backend for now
    // 1. Provision a new container in VM (maybe use k8s in futue. not now)
    // 2. Clone the repo inside the container
    // 3. npm install
    // 4. Build the project => Find out way to stream the logs to the server, then to the frontend client
    // 5. Start the server
    // 6. Return the deployment object with status as "initializing"
    // 7. Fields to update => last_deployed_hash, last_deployed_at, status, 
    // 8. Find out a way to proxy the requests to the container and map it to subdomain (todoapp.mydeployments.com)
    // 9. 
    // 10. Update the deployment object with status as "success" or "failed" based on the result of the build

    return null;
}

async function getDeploymentById(id: string): Promise<Deployment | null> {
    const result = await client.query<Deployment>(
        'SELECT * FROM deployments WHERE id = $1',
        [id]
    );
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}



export { createDeployment, getDeployments, getDeploymentById };
// export { createDeployment, getDeploymentById, updateDeployment, deleteDeployment };