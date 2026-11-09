module Api
  module V1
    class ProjectsController < BaseController
      def index
        authorize Project
        projects = policy_scope(Project).order(id: :desc).limit(100)
        render json: { projects: projects.as_json(only: %i[id name description status client_name updated_at]) }
      end
      def show
        project = policy_scope(Project).find(params[:id])
        authorize project
        render json: { project: project.as_json(only: %i[id name description status client_name]),
          environments: project.environments.kept.ordered.as_json(only: %i[id stable_id name description environment_type status position]),
          versions: project.project_versions.order(version_number: :desc).map { |version| version.as_json(only: %i[id version_number format checksum]).merge("environments" => version.environment_versions.as_json(only: %i[environment_id status source_reference bounding_box])) } }
      end
    end
  end
end
