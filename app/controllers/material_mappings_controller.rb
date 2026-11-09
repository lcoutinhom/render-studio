class MaterialMappingsController < ApplicationController
  include DomainForms
  def create
    project, version = context
    mapping = MaterialMapping.new(project: project, project_version: version)
    assign(mapping, project)
    mapping.save!
    redirect_to project_path(project, version_id: version.id), notice: "Mapeamento salvo.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(project_path(params[:project_id], version_id: params[:version_id]), error)
  end
  def update
    project, version = context
    mapping = version.material_mappings.find(params[:id])
    assign(mapping, project)
    mapping.save!
    redirect_to project_path(project, version_id: version.id), notice: "Mapeamento atualizado.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(project_path(params[:project_id], version_id: params[:version_id]), error)
  end
  def destroy
    project, version = context
    version.material_mappings.find(params[:id]).destroy!
    redirect_to project_path(project, version_id: version.id), notice: "Mapeamento removido.", status: :see_other
  end
  private
  def context
    project = scoped_project
    authorize project, :update?
    [ project, project.project_versions.find(params[:version_id]) ]
  end
  def assign(mapping, project)
    raw = params.require(:mapping)
    mapping.assign_attributes(source_material_name: raw[:source_material_name], material: policy_scope(Material).find(raw[:material_id]),
      environment: raw[:environment_id].present? ? project.environments.kept.find(raw[:environment_id]) : nil)
  end
end
