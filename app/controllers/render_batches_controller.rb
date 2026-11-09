class RenderBatchesController < ApplicationController
  include DomainForms
  rate_limit to: 20, within: 1.minute, only: :create, by: -> { current_user.id }, with: -> { redirect_to renderings_path, alert: "Aguarde um minuto antes de enviar mais solicitações.", status: :see_other }
  def index
    authorize RenderBatch
    scope = policy_scope(RenderBatch).includes(:project, :project_version, :render_configuration)
    scope = scope.where(status: params[:status]) if RenderBatch::STATUSES.include?(params[:status])
    filters = params.permit(:status, :project_id, :environment_id, :version_id).to_h
    scope = scope.where(project_id: filters["project_id"]) if filters["project_id"].present?
    scope = scope.where(project_version_id: filters["version_id"]) if filters["version_id"].present?
    scope = scope.where(id: policy_scope(RenderJob).where(environment_id: filters["environment_id"]).select(:render_batch_id)) if filters["environment_id"].present?
    projects = current_user.projects.order(:name)
    environments = Environment.where(project_id: projects.select(:id))
    versions = ProjectVersion.where(project_id: projects.select(:id)).includes(:project)
    page = [ params[:page].to_i, 1 ].max
    batches = scope.order(id: :desc).offset((page - 1) * 20).limit(20)
    render inertia: "processing/index", props: { batches: batches.map { |batch| batch.as_json(only: %i[id status progress created_at]).merge("name" => batch.render_configuration.name, "project_name" => batch.project.name, "version_number" => batch.project_version.version_number, "environment_count" => batch.environment_ids.size) },
      total: scope.count, page: page, filter: params[:status].to_s, filters: filters,
      projects: projects.map { |project| { id: project.id, name: project.name } },
      environments: environments.order(:name).map { |environment| { id: environment.id, name: environment.name, project_id: environment.project_id } },
      versions: versions.order(version_number: :desc).map { |version| { id: version.id, project_id: version.project_id, name: "#{version.project.name} · v#{version.version_number}" } } }
  end
  def create
    authorize RenderBatch
    configuration = policy_scope(RenderConfiguration).find(params[:rendering_id])
    raw = params.require(:submission)
    batch = Rendering::Submit.call(user: current_user, configuration: configuration, idempotency_key: raw[:idempotency_key], custom_prompt: raw[:custom_prompt], reference_images: raw[:reference_images].is_a?(ActionController::Parameters) ? raw[:reference_images].to_unsafe_h : {},
      environment_ids: raw[:environment_ids], failure_environment_ids: raw[:failure_environment_ids] || [], adapter: raw[:adapter].presence || "simulation")
    redirect_to render_batch_path(batch), notice: batch.adapter == "simulation" ? "Simulação solicitada. Nenhum arquivo real será produzido." : "Renderização Blender enviada à fila.", status: :see_other
  rescue Rendering::LocalAi::Client::Failure, ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(rendering_path(params[:rendering_id]), error)
  end
  def show
    batch = policy_scope(RenderBatch).find(params[:id])
    authorize batch
    render inertia: "processing/show", props: { batch: ProcessingPresenter.batch(batch),
      jobs: batch.render_jobs.includes(:next_attempt).order(id: :desc).limit(100).map { |job| ProcessingPresenter.job(job) },
      attempt_count: batch.render_jobs.count, events: ProcessingPresenter.events(batch.render_events) }
  end
  def cancel
    batch = policy_scope(RenderBatch).find(params[:id])
    authorize batch
    Rendering::Lifecycle.cancel(batch)
    redirect_to render_batch_path(batch), notice: "Tarefas pendentes ou em andamento foram canceladas.", status: :see_other
  end
  def retry
    batch = policy_scope(RenderBatch).find(params[:id])
    authorize batch
    attempts = Rendering::Lifecycle.retry(batch)
    redirect_to render_batch_path(batch), notice: attempts.any? ? "Novas tentativas solicitadas; o histórico foi preservado." : "Não há falhas ou cancelamentos para repetir.", status: :see_other
  end
end
