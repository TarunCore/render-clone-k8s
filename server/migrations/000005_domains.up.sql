CREATE TABLE domains (
    sub_domain VARCHAR(30) PRIMARY KEY,
    deployment_id BIGINT REFERENCES deployments(id),
    ip VARCHAR(40),
    port INTEGER
)