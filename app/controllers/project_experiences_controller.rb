class ProjectExperiencesController < ApplicationController
  include DomainForms
  def primary
    project = scoped_project; authorize project, :update?
    project.with_lock do
      file = project.project_files.kept.find(params[:file_id])
      project.project_files.kept.where(primary: true).update_all(primary: false)
      file.update!(primary: true)
    end
    redirect_to project_path(project, tab: "experiences"), status: :see_other
  end
  def new
    project = scoped_project; authorize project, :show?
    file = project.project_files.kept.find_by(primary: true)
    raise ArgumentError, "Escolha o arquivo principal do projeto" unless file
    version = file.project_versions.with_attached_original_file.order(file_revision: :desc).first
    raise ArgumentError, "Envie uma revisão GLB no arquivo principal" unless version&.format == "glb"
    kind = params[:kind].to_s
    raise ArgumentError, "Tipo inválido" unless %w[vr tour].include?(kind)
    render inertia: "experiences/new", props: { project: ProjectPresenter.project(project), file: file.as_json(only: %i[id name]), version: ProjectPresenter.version(version, reference_types: true), kind: kind, submission_key: SecureRandom.uuid }
  rescue ArgumentError => error
    form_error(project_path(params[:project_id], tab: "experiences"), error)
  end
  def create
    project = scoped_project; authorize project, :update?
    choices = params[:choices].is_a?(Array) ? params[:choices].map { |choice| choice.is_a?(ActionController::Parameters) ? choice.to_unsafe_h : choice } : nil
    experience = ProjectExperiences::Create.call(user: current_user, project: project, kind: params[:kind], revision_id: params[:revision_id], choices: choices, key: params[:submission_key])
    redirect_to project_experience_path(project, experience), status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(project_path(params[:project_id], tab: "experiences"), error)
  end
  def show
    project = scoped_project; authorize project, :show?
    experience = project.project_experiences.includes(:project_version, :project_file, :render_batch).find(params[:id])
    outputs = policy_scope(RenderOutput).joins(:render_job).where(render_jobs: { render_batch_id: experience.render_batch_id }).includes(:file_attachment, render_job: [ :project, :environment, :project_version ])
    cameras = experience.render_batch.render_configuration.snapshot.fetch("environments").flat_map { |environment| environment.fetch("cameras", []) }
    order = experience.render_batch.render_configuration.snapshot.dig("file_request", "choices").to_a.map { |choice| choice["key"] }
    cameras.sort_by! { |camera| order.index(camera.dig("metadata", "source_choice")) || order.size }
    sorted_outputs = outputs.order(:id).sort_by { |output| order.index(output.render_job.snapshot.dig("camera", "metadata", "source_choice")) || order.size }
    render inertia: "experiences/show", props: { project: ProjectPresenter.project(project), experience: ProjectExperiencePresenter.call(experience), outputs: sorted_outputs.map { |output| OutputPresenter.call(output) }, cameras: cameras }
  end
end
