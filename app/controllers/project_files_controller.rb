class ProjectFilesController < ApplicationController
  include DomainForms
  def show
    project = scoped_project; authorize project, :show?
    file = project.project_files.kept.find(params[:id])
    versions = file.project_versions.with_attached_original_file.order(file_revision: :desc)
    version = params[:revision_id].present? ? versions.find(params[:revision_id]) : versions.first
    output_page = [ params[:outputs_page].to_i, 1 ].max
    output_scope = policy_scope(RenderOutput).joins(:render_job).where(render_jobs: { project_version_id: versions.select(:id) })
    render inertia: "files/show", props: { project: ProjectPresenter.project(project), file: file.as_json(only: %i[id name]), revisions: versions.map { |item| ProjectPresenter.version(item).except("metadata") }, version: ProjectPresenter.version(version, reference_types: true),
      schema: RenderingPresenter.schema, presets: policy_scope(RenderPreset).order(system: :desc, name: :asc).map { |item| RenderingPresenter.preset(item) }, settings: Rendering::Settings.validate!(project.settings, complete: true), gemini_enabled: Rendering::GeminiSuggestion.enabled?, submission_key: SecureRandom.uuid, default_render_engine: Rendering::Engines.default, render_engine_label: Rendering::Engines.label(Rendering::Engines.default), local_ai_enabled: Rendering::Engines.enabled?("comfyui"), gemini_render_enabled: Rendering::GeminiImage.enabled?, blender_render_enabled: ENV["BLENDER_RENDER_ENABLED"] == "true",
      outputs_total: output_scope.count, outputs_page: output_page, outputs: output_scope.includes(:file_attachment, render_job: [ :project, :environment, :project_version ]).order(id: :desc).offset((output_page-1)*20).limit(20).map { |output| OutputPresenter.call(output) } }
  end
  def create
    project = scoped_project; authorize project, :update?
    version = ProjectVersions::Create.call(project, upload: params.dig(:upload, :file), description: params.dig(:upload, :description))
    redirect_to project_file_path(project, version.project_file), notice: "Arquivo enviado. Escolha as cenas para renderizar.", status: :see_other
  rescue ProjectVersions::InspectUpload::Invalid, ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(project_path(params[:project_id]), error)
  end
  def revision
    project = scoped_project; authorize project, :update?
    file = project.project_files.kept.find(params[:id])
    ProjectVersions::Create.call(project, project_file: file, upload: params.dig(:upload, :file), description: params.dig(:upload, :description))
    redirect_to project_file_path(project, file), notice: "Nova revisão do arquivo enviada; cenas e resultados anteriores preservados.", status: :see_other
  rescue ProjectVersions::InspectUpload::Invalid, ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(project_file_path(params[:project_id], params[:id]), error)
  end
  def update
    project = scoped_project; authorize project, :update?
    project.project_files.kept.find(params[:id]).update!(params.require(:file).permit(:name))
    redirect_to project_path(project), status: :see_other
  rescue ActiveRecord::RecordInvalid => error
    form_error(project_path(params[:project_id]), error)
  end
  def destroy
    project = scoped_project; authorize project, :update?
    project.project_files.kept.find(params[:id]).update!(deleted_at: Time.current)
    redirect_to project_path(project), notice: "Arquivo arquivado. Originais e resultados preservados.", status: :see_other
  end
  def render_selected
    project = scoped_project; authorize project, :update?
    file = project.project_files.kept.find(params[:id]); version = file.project_versions.find(params[:revision_id])
    choices = params[:choices].is_a?(Array) ? params[:choices].map { |choice| choice.is_a?(ActionController::Parameters) ? choice.to_unsafe_h : choice } : nil
    batch = Rendering::FileRender.call(user: current_user, project_file: file, version: version, choices: choices, settings: settings_from(params[:settings]), key: params[:submission_key], adapter: params[:adapter].presence || Rendering::Engines.default, custom_prompt: params[:custom_prompt], reference_images: params[:reference_images].is_a?(ActionController::Parameters) ? params[:reference_images].to_unsafe_h : {})
    redirect_to render_batch_path(batch), notice: "Cenas enviadas para renderização. Resultados ficarão neste projeto.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(project_file_path(params[:project_id], params[:id], revision_id: params[:revision_id]), error)
  end
end
