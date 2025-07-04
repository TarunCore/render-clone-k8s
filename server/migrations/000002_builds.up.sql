CREATE TABLE builds (
    id SERIAL PRIMARY KEY,
    git_commit_hash VARCHAR(255) NOT NULL,
    git_commit_message TEXT,
    git_branch VARCHAR(60) NOT NULL,
    status VARCHAR(50) NOT NULL,
    status_message TEXT,
    build_started_at TIMESTAMP,
    build_finished_at TIMESTAMP,
    project_id BIGINT,
    logs TEXT DEFAULT ''
);