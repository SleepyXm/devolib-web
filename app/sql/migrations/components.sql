ALTER TABLE project_metadata
ADD COLUMN components jsonb DEFAULT '[]'::jsonb;

ALTER TABLE project_metadata
ADD COLUMN utils jsonb DEFAULT '[]'::jsonb;


ALTER TABLE users ADD COLUMN github_id TEXT UNIQUE;