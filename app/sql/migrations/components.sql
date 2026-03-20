ALTER TABLE project_metadata
ADD COLUMN components jsonb DEFAULT '[]'::jsonb;