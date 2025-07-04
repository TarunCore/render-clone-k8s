CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    user_id BIGINT REFERENCES users(id),
    project_type VARCHAR(50) NOT NULL,
    subdomain VARCHAR(30),
    port INTEGER,
    status VARCHAR(50) NOT NULL,
    status_message TEXT,
    expires_at TIMESTAMP,
    github_url VARCHAR(200),
    deployed_url VARCHAR(100),
    root_path VARCHAR(100) DEFAULT '/',
    last_build_id BIGINT REFERENCES builds(id),
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