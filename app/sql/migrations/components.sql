ALTER TABLE project_metadata
ADD COLUMN components jsonb DEFAULT '[]'::jsonb;

ALTER TABLE project_metadata
ADD COLUMN utils jsonb DEFAULT '[]'::jsonb;

21/03/2026

ALTER TABLE users ADD COLUMN github_id TEXT UNIQUE;

ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_token TEXT;

ALTER TABLE users ADD COLUMN github_access_token TEXT;



22/03/2026
ALTER TABLE project_metadata 
  DROP COLUMN components,
  DROP COLUMN utils,
  ADD COLUMN groups JSONB NOT NULL DEFAULT '[]'::jsonb;


ALTER TABLE users ADD COLUMN github_username VARCHAR(255);