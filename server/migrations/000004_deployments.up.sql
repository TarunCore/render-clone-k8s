CREATE TABLE deployments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    deployed_by BIGINT REFERENCES users(id),
    project_type VARCHAR(50) NOT NULL,
    subdomain VARCHAR(30),
    status VARCHAR(50) NOT NULL,
    status_message TEXT,
    expires_at TIMESTAMP,
    github_url VARCHAR(200),
    github_branch VARCHAR(60),
    deployed_url VARCHAR(100),
    last_build_id BIGINT REFERENCES builds(id),
    last_deployed_hash VARCHAR(255),
    last_deployed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON deployments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE builds
ADD CONSTRAINT fk_base_deployment
FOREIGN KEY (deployment_id) REFERENCES deployments(id);