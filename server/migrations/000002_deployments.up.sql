CREATE TABLE deployments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    deployed_by BIGINT REFERENCES users(id),
    deployed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    status_message TEXT,
    expires_at TIMESTAMP,
    github_url VARCHAR(255),
    last_deployed_hash VARCHAR(255),
    last_deployed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON deployments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();