// CREATE TABLE projects (
//     id SERIAL PRIMARY KEY,
//     name VARCHAR(100) NOT NULL UNIQUE,
//     description TEXT,
//     deployed_by BIGINT REFERENCES users(id),
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
    deployed_by: string;
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
    last_deployed_hash: string;
    last_deployed_at: string;
    created_at: string;
    updated_at: string;
    build_commands: string;
    run_commands: string;
    install_commands: string;
    env_variables: string;
  };