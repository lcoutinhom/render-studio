module Api
  module V1
    class RenderConfigurationsController < BaseController
      include DomainForms
      def index
        authorize RenderConfiguration
        render json: { configurations: policy_scope(RenderConfiguration).order(id: :desc).limit(100).as_json(only: %i[id project_id project_version_id name mode created_at]) }
      end
      def show
        configuration = policy_scope(RenderConfiguration).find(params[:id])
        authorize configuration
        render json: { configuration: configuration.as_json(only: %i[id project_id project_version_id name mode snapshot created_at]) }
      end
      def create
        authorize RenderConfiguration
        raw = params.require(:configuration)
        project = policy_scope(Project).find(raw[:project_id])
        version = project.project_versions.find(raw[:project_version_id])
        preset = raw[:render_preset_id].present? ? policy_scope(RenderPreset).find(raw[:render_preset_id]) : nil
        configuration = Rendering::CreateConfiguration.call(user: current_user, project: project, version: version, preset: preset,
          name: raw[:name], mode: raw[:mode].presence || "custom", environment_ids: raw[:environment_ids], settings: settings_from(raw[:settings]), camera_ids: Array(raw[:camera_ids]))
        render json: { id: configuration.id, snapshot: configuration.snapshot }, status: :created
      end
    end
  end
end
