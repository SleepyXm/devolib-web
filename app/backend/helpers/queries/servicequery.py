get_service_query="""
        SELECT
          s.name,
          s.category,
          s.default_start_command,
          s.default_port,
          ps.custom_start_command
        FROM project_services ps
        JOIN services s ON s.id = ps.service_id
        WHERE ps.project_id = :project_id
          AND s.category = :category
        """