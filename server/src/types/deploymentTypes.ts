// CREATE TABLE deployments (
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
export type DeploymentStatus = "pending" | "initializing" | "success" | "failed" | "cancelling" | "cancelled";

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