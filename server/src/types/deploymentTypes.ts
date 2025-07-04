// CREATE TABLE projects (
//     id SERIAL PRIMARY KEY,
//     name VARCHAR(100) NOT NULL UNIQUE,
//     description TEXT,
//     user_id BIGINT REFERENCES users(id),
//     deployed_at TIMESTAMP,
//     status VARCHAR(50) NOT NULL,
//     status_message TEXT,
//     expires_at TIMESTAMP,
//     github_url VARCHAR(255),
//     last_deployed_hash VARCHAR(255),
//     last_deployed_at TIMESTAMP,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
export type Projectstatus = "pending" | "running" | "success" | "failed" | "cancelled";

export type Project = {
    id: string;
    name: string;
    description: string;
    user_id: string;
    deployed_at: string;
    project_type: string;
    subdomain: string;
    status: Projectstatus;
    status_message: string;
    expires_at: string;
    github_url: string;
    github_branch: string;
    deployed_url: string;
    last_build_id: string;
    build_details: Omit<Build, "project_id" | "logs"> | null;
    created_at: string;
    updated_at: string;
    build_commands: string;
    run_commands: string;
    install_commands: string;
    env_variables: string;
    port: number;
    root_path: string;
  };

  export type Build = {
    id: string;
    git_commit_hash: string;
    git_commit_message: string;
    git_branch: string;
    build_started_at: string;
    build_finished_at: string;
    status: Projectstatus;
    status_message: string;
    logs: string;
    project_id: string;
  }