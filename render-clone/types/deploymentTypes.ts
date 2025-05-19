export type DeploymentStatus = "pending"| "initializing" | "success" | "failed" | "cancelling" | "cancelled";

export type Deployment = {
    id: string;
    name: string;
    description: string;
    deployed_by: string;
    deployed_at: string;
    status: DeploymentStatus;
    status_message: string;
    expires_at: string;
    github_url: string;
    last_deployed_hash: string;
    last_deployed_at: string;
    created_at: string;
    updated_at: string;
}