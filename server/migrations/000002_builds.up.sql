CREATE TABLE builds (
    id SERIAL PRIMARY KEY,
    commit_hash VARCHAR(255) NOT NULL,
    commit_message TEXT,
    status VARCHAR(50) NOT NULL,
    status_message TEXT,
    build_started_at TIMESTAMP,
    build_finished_at TIMESTAMP,
    base_deployment_id BIGINT
);