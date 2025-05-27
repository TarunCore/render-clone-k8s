CREATE TABLE domains (
    sub_domain VARCHAR(30) PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id),
    ip VARCHAR(40),
    port INTEGER
)