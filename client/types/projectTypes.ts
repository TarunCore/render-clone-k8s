export type Projectstatus = "pending"| "running" | "success" | "failed" | "cancelling" | "cancelled";

export type Projects = {
    id: string;
    name: string;
    description: string;
    user_id: string;
    project_type: string;
    subdomain: string;
    status: Projectstatus;
    status_message: string;
    port: number;
    expires_at: string;
    github_url: string;
    root_path: string | "/";
    deployed_url: string;
    last_build_id: string;
    build_details: {
        id: string;
        commit_hash: string;
        commit_message: string;
        build_started_at: string;
        build_finished_at: string;
        status: Projectstatus;
        status_message: string;
        deployed_branch: string;
        deployed_hash: string;
        deployed_at: string;
    }
    created_at: string;
    updated_at: string;
    build_commands: string;
    run_commands: string;
    install_commands: string;
    env_variables: string;
}