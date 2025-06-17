import { DEP_MANAGER_BASE_URL } from "../config";
import { client } from "../configs/db";
import k8sApi from "../configs/k8s";
import logger from "../logger";
import { Project } from "../types/deploymentTypes";
import { z } from "zod";
// import fetch from "node-fetch"
const createProjectschema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    github_url: z.string().url("Must be a valid URL"),
    project_type: z.enum(["nodejs", "python","go"]),
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

async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    // Build dynamic set clause and values array
    const fields = Object.keys(updates);
    if (fields.length === 0) {
        throw new Error("No fields to update");
    }
    const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(", ");
    const values = fields.map((field) => (updates as any)[field]);
    const query = `UPDATE projects SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const result = await client.query<Project>(query, [id, ...values]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}

async function checkAndUpdatePodStatus(projectId: string) {
    try {
        const pod = await k8sApi.readNamespacedPod({
            namespace: 'default',
            name: `pod-${projectId}`
        });
        // logger.info(`Pod status for project ${projectId}: ${pod.status?.phase}`);
        if (pod.status?.phase === 'Failed' || pod.status?.phase === 'Succeeded') {
            client.query("UPDATE projects SET status = 'failed' WHERE id = $1  RETURNING last_build_id", [projectId]).then((data) => {
                const last_build_id = data.rows[0]?.last_build_id;
                if (last_build_id) {
                  client.query("UPDATE builds SET status = 'failed' WHERE id = $1", [last_build_id]);
                }
            })
            // client.query("UPDATE builds SET status = 'failed' WHERE project_id = $1 &", [projectId]);
        }
    }
    catch (error) {
        console.error("Error fetching pod status:", error);
        return { status: "error", message: "Failed while fetching pod status" };
    }
    return { status: "success", message: "Pod status checked successfully" };
}

export { createProject, getProjects, getProjectById, updateProject, checkAndUpdatePodStatus };