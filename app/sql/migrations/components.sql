ALTER TABLE project_metadata
ADD COLUMN components jsonb DEFAULT '[]'::jsonb;

ALTER TABLE project_metadata
ADD COLUMN utils jsonb DEFAULT '[]'::jsonb;