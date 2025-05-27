import { DEP_MANAGER_BASE_URL } from "../config";
import { client } from "../configs/db";
import { Project } from "../types/deploymentTypes";
import { z } from "zod";
// import fetch from "node-fetch"
const createProjectschema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    github_url: z.string().url("Must be a valid URL"),
    project_type: z.enum(["nodejs", "python", "java", "php", "ruby", "go"]),
    subdomain: z.string().min(1, "Subdomain is required")
  });
  
type CreateProjectType = z.infer<typeof createProjectschema>;

async function getProjects(): Promise<Project[]> {
    const result = await client.query<Project>(
        'SELECT * FROM projects'
    );
    return result.rows;
}

async function createProject(deployment: CreateProjectType, user_id: string): Promise<Project> {
    const parseData = createProjectschema.safeParse(deployment);
    if (!parseData.success) {
        throw new Error("Invalid payload");
        // throw new Error(parseData.error.errors[0].message);
    }
    const { name, description, github_url, project_type, subdomain } = parseData.data;
    const result = await client.query<Project>(
        'INSERT INTO projects (name, description, github_url, project_type, status, subdomain, deployed_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, description, github_url, project_type, "pending", subdomain, user_id]
    );
    return result.rows[0];
}

async function startBuild(deploymentId: string, to_deploy_commit_hash: string): Promise<Project | null> {
    const deployment = await client.query<Project>("SELECT * FROM projects WHERE id=$1",[deploymentId]);
    if(deployment.rowCount==0) {throw new Error("Project not found")};
    const {github_url, last_deployed_hash, project_type} = deployment.rows[0];
    if (last_deployed_hash === to_deploy_commit_hash) {
        throw new Error("No new commits to deploy")
    }
    const askProjectManager = await fetch(`${DEP_MANAGER_BASE_URL}/api/v1/build/create`)
    // Support only nodejs backend for now
    // 1. Provision a new container in VM (maybe use k8s in futue. not now)
    // 2. Clone the repo inside the container
    // 3. npm install
    // 4. Build the project => Find out way to stream the logs to the server, then to the frontend client
    // 5. Start the server
    // 6. Return the deployment object with status as "initializing"
    // 7. Fields to update => last_deployed_hash, last_deployed_at, status, 
    // 8. Find out a way to proxy the requests to the container and map it to subdomain (todoapp.myprojects.com)
    // 9. 
    // 10. Update the deployment object with status as "success" or "failed" based on the result of the build

    return null;
}

async function getProjectById(id: string): Promise<Project | null> {
    const result = await client.query<Project>(
        'SELECT * FROM projects WHERE id = $1',
        [id]
    );
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}



export { createProject, getProjects, getProjectById };
// export { createProject, getProjectById, updateProject, deleteProject };