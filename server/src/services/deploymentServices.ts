import { client } from "../db/db";
import { Deployment } from "../types/deploymentTypes";
import { z } from "zod";

const createDeploymentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    github_url: z.string().url("Must be a valid URL"),
  });
  
  // 2. Infer the type from the schema (optional)
  type CreateDeploymentType = z.infer<typeof createDeploymentSchema>;


async function createDeployment(deployment: CreateDeploymentType): Promise<Deployment> {
    const parseData = createDeploymentSchema.safeParse(deployment);
    if (!parseData.success) {
        throw new Error("Invalid payload");
        // throw new Error(parseData.error.errors[0].message);
    }
    const { name, description, github_url } = parseData.data;
    const result = await client.query<Deployment>(
        'INSERT INTO deployments (name, description, github_url, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, github_url, "pending"]
    );
    return result.rows[0];
    
}

export { createDeployment };
// export { createDeployment, getDeploymentById, updateDeployment, deleteDeployment };