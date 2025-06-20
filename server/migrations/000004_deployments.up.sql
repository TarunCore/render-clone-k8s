CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    deployed_by BIGINT REFERENCES users(id),
    project_type VARCHAR(50) NOT NULL,
    subdomain VARCHAR(30),
    port INTEGER,
    status VARCHAR(50) NOT NULL,
    status_message TEXT,
    expires_at TIMESTAMP,
    github_url VARCHAR(200),
    deployed_url VARCHAR(100),
    last_build_id BIGINT REFERENCES builds(id),
    last_deployed_hash VARCHAR(255),
    last_deployed_branch VARCHAR(60),
    last_deployed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    build_commands TEXT,
    run_commands TEXT,
    install_commands TEXT,
    env_variables TEXT
);

CREATE TRIGGER trigger_update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE builds
ADD CONSTRAINT fk_base_project
FOREIGN KEY (project_id) REFERENCES projects(id);