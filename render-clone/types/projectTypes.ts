export type Projectstatus = "pending"| "building" | "success" | "failed" | "cancelling" | "cancelled";

export type Projects = {
    id: string;
    name: string;
    description: string;
    deployed_by: string;
    project_type: string;
    status: Projectstatus;
    status_message: string;
    expires_at: string;
    github_url: string;
    github_branch: string;
    deployed_url: string;
    last_build_id: string;
    last_deployed_hash: string;
    last_deployed_at: string;
    created_at: string;
    updated_at: string;
}