class RenderCamerasController < ApplicationController
  include DomainForms
  def create
    project, environment, version = context
    RenderCamera.create!(camera_params.merge(project: project, environment: environment, project_version: version))
    redirect_to destination, notice: "Câmera criada para esta versão.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(destination, error)
  end
  def bulk_create
    project, environment, version = context
    entries = params[:cameras]
    raise ArgumentError, "Selecione entre 1 e 100 cenas." unless entries.is_a?(Array) && entries.size.between?(1, 100)
    markers = ProjectVersions::ReferenceCatalog.call(version).fetch("view_markers", []).pluck("id")
    scenes = version.metadata.fetch("scenes", []).pluck("id")
    keys = []
    created = 0
    environment.with_lock do
      entries.each do |raw|
        raise ArgumentError, "Câmera inválida." unless raw.is_a?(ActionController::Parameters)
        key = raw[:recovered_view_key].to_s
        scene_id, node_id = key.split(":", -1)
        unless key.match?(/\A\d+:\d+\z/) && scenes.include?(scene_id) && markers.include?(node_id) && !keys.include?(key)
          raise ArgumentError, "A seleção contém cenas inválidas ou repetidas nesta versão."
        end
        keys << key
        attributes = camera_params(raw).merge(project: project, environment: environment, project_version: version,
          metadata: { "recovered_view_key" => key, "estimated_lens_mm" => "35" })
        candidate = RenderCamera.new(attributes)
        candidate.validate!
        next if environment.render_cameras.kept.where(project_version: version).where("metadata->>'recovered_view_key' = ?", key).exists?
        candidate.save!
        created += 1
      end
    end
    redirect_to batch_destination, notice: "#{created} câmera(s) criada(s). #{entries.size - created} já estava(m) cadastrada(s).", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(batch_destination, error)
  end
  def update
    _, environment, version = context
    camera = environment.render_cameras.kept.where(project_version: version).find(params[:id])
    attributes = camera_params
    attributes["metadata"] = camera.metadata.except("source_node_id").merge(attributes["metadata"])
    camera.update!(attributes)
    redirect_to destination, notice: "Câmera atualizada.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(destination, error)
  end
  def destroy
    _, environment, version = context
    environment.render_cameras.kept.where(project_version: version).find(params[:id]).update!(deleted_at: Time.current)
    redirect_to destination, notice: "Câmera removida; configurações anteriores preservadas.", status: :see_other
  end
  private
  def batch_destination = project_environment_path(params[:project_id], params[:environment_id], version_id: params[:version_id], tab: "cameras")
  def destination = project_environment_path(params[:project_id], params[:environment_id], version_id: params[:version_id])
  def context
    project = scoped_project
    environment = project.environments.kept.find(params[:environment_id])
    authorize environment, :update?
    version = project.project_versions.find(params[:version_id])
    raise ArgumentError, "Associe o ambiente a esta versão antes de criar câmeras" unless environment.environment_versions.exists?(project_version_id: version.id)
    [ project, environment, version ]
  end
  def camera_params(raw = params.require(:camera))
    raise ArgumentError, "Câmera inválida." unless raw.is_a?(ActionController::Parameters)
    attributes = raw.permit(:name, :focal_length, :field_of_view, :projection_type).to_h
    %w[position rotation].each do |key|
      vector = raw[key]
      raise ArgumentError, "#{key}: informe três coordenadas" unless vector.is_a?(Array) && vector.size == 3
      raise ArgumentError, "#{key}: informe coordenadas numéricas" unless vector.all? { |value| value.is_a?(Numeric) || value.is_a?(String) }
      attributes[key] = vector.map { |value| Float(value) }
    end
    attributes["metadata"] = raw[:source_node_id].present? ? { "source_node_id" => raw[:source_node_id].to_s } : {}
    attributes
  end
end
