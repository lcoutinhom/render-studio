class EnvironmentsController < ApplicationController
  include DomainForms

  def index
    project = scoped_project
    authorize project, :show?
    policy_scope(Project)
    redirect_to project_path(project)
  end

  def new
    project = scoped_project
    authorize project, :update?
    render inertia: "environments/form", props: { project: ProjectPresenter.project(project), environment: nil, types: Environment::TYPES, schema: RenderingPresenter.schema }
  end

  def create
    project = scoped_project
    authorize project, :update?
    environment = project.with_lock do
      project.environments.create!(environment_params.merge(position: project.environments.maximum(:position).to_i + 1))
    end
    redirect_to project_environment_path(project, environment), notice: "Ambiente criado.", status: :see_other
  rescue ActiveRecord::RecordInvalid, ArgumentError => error
    form_error(new_project_environment_path(params[:project_id]), error)
  end

  def show
    project, environment = find_environment
    authorize environment
    versions = project.project_versions.with_attached_original_file.order(version_number: :desc)
    version = params[:version_id].present? ? versions.find(params[:version_id]) : versions.first
    render inertia: "environments/show", props: { project: ProjectPresenter.project(project), environment: ProjectPresenter.environment(environment),
      versions: versions.map { |item| ProjectPresenter.version(item).except("metadata") }, selected_version: ProjectPresenter.version(version, reference_types: true),
      processing_history: policy_scope(RenderJob).where(environment: environment, project_version_id: version&.id).includes(:next_attempt).order(id: :desc).limit(20).map { |job| ProcessingPresenter.job(job) },
      schema: RenderingPresenter.schema, cameras: version ? environment.render_cameras.kept.where(project_version: version).map { |item| RenderingPresenter.camera(item) } : [],
      mappings: version ? version.material_mappings.where(environment_id: [ nil, environment.id ]).includes(:material).map { |item| RenderingPresenter.mapping(item) } : [],
      association: version && environment.environment_versions.find_by(project_version: version)&.then { |item| ProjectPresenter.association(item) } }
  end

  def edit
    project, environment = find_environment
    authorize environment
    render inertia: "environments/form", props: { project: ProjectPresenter.project(project), environment: ProjectPresenter.environment(environment), types: Environment::TYPES, schema: RenderingPresenter.schema }
  end

  def update
    project, environment = find_environment
    authorize environment
    environment.update!(environment_params)
    redirect_to project_environment_path(project, environment), notice: "Ambiente atualizado.", status: :see_other
  rescue ActiveRecord::RecordInvalid, ArgumentError => error
    form_error(edit_project_environment_path(params[:project_id], params[:id]), error)
  end

  def duplicate
    project, environment = find_environment
    authorize environment
    copy = Environments::Duplicate.call(environment, copy_associations: ActiveModel::Type::Boolean.new.cast(params[:copy_associations]))
    redirect_to project_environment_path(project, copy), notice: "Ambiente duplicado.", status: :see_other
  end

  def reorder
    project = scoped_project
    authorize project, :update?
    Environments::Reorder.call(project, params[:ids])
    redirect_to project_path(project, version_id: params[:version_id]), notice: "Ordem atualizada.", status: :see_other
  rescue ActiveRecord::RecordInvalid, ArgumentError => error
    form_error(project_path(params[:project_id]), error)
  end

  def destroy
    project, environment = find_environment
    authorize environment
    environment.discard!
    redirect_to project_path(project), notice: "Ambiente excluído; identidade e associações anteriores preservadas.", status: :see_other
  end

  private

  def find_environment
    project = scoped_project
    [ project, project.environments.kept.find(params[:id]) ]
  end

  def environment_params
    permitted = params.require(:environment).permit(:name, :description, :environment_type, :custom_type, :status).to_h
    permitted[:settings] = Rendering::Settings.validate!(settings_from(params[:environment][:settings])) if params[:environment].key?(:settings)
    permitted
  end
end
