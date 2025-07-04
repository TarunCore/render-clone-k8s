import { client } from "../configs/db";
import k8sApi from "../configs/k8s";
import logger from "../logger";
import { Project } from "../types/deploymentTypes";
import { z } from "zod";
import { deletePodAndService } from "./buildService";
// import fetch from "node-fetch"
const createProjectschema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    github_url: z.string().url("Must be a valid URL"),
    project_type: z.enum(["nodejs", "python", "go"]),
    subdomain: z.string().min(1, "Subdomain is required")
});

type CreateProjectType = z.infer<typeof createProjectschema>;

async function getProjects(user_id: string): Promise<Project[]> {
    const result = await client.query<Project>(
        'SELECT * FROM projects WHERE deployed_by = $1',
        [user_id]
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

async function updateDBStatus(projectId: string, status: string) {
    client.query("UPDATE projects SET status = $1 WHERE id = $2  RETURNING last_build_id", [status, projectId]).then((data) => {
        const last_build_id = data.rows[0]?.last_build_id;
        if (last_build_id) {
            client.query("UPDATE builds SET status = $1 WHERE id = $2", [status, last_build_id]);
        }
    })
}

async function checkAndUpdatePodStatus(projectId: string) {
    let podStatus = "failed";
    try {
        const pod = await k8sApi.readNamespacedPod({
            namespace: 'default',
            name: `pod-${projectId}`
        });
        // logger.info(`Pod status for project ${projectId}: ${pod.status?.phase}`);
        if (pod.status?.phase === 'Running') {
            updateDBStatus(projectId, "running");
            podStatus = "running";
        } else {
            updateDBStatus(projectId, "failed");
            podStatus = "failed";
        }
    }
    catch (error) {
        podStatus = "failed";
        logger.error(`Error fetching pod status for project ${projectId}:`, error);
        updateDBStatus(projectId, "failed");
        return { status: "error", message: "Failed while fetching pod status", podStatus };
    }
    return { status: "success", message: "Pod status checked successfully", podStatus };
}

async function deleteProject(projectId: string) {
    deletePodAndService(projectId);

    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE projects SET last_build_id = NULL WHERE id = $1`,
            [projectId]
        );

        await client.query(
            `DELETE FROM builds WHERE project_id = $1`,
            [projectId]
        );

        await client.query(
            `DELETE FROM projects WHERE id = $1`,
            [projectId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
    }
}

export { createProject, getProjects, getProjectById, updateProject, checkAndUpdatePodStatus, deleteProject };