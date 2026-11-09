class MaterialsController < ApplicationController
  include DomainForms
  def index
    authorize Material
    scope = policy_scope(Material)
    scope = scope.where("name ILIKE ?", "%#{Material.sanitize_sql_like(params[:q].to_s.first(120))}%") if params[:q].present?
    scope = scope.where(category: params[:category]) if Material::CATEGORIES.include?(params[:category])
    page = [ params[:page].to_i, 1 ].max
    render inertia: "materials/index", props: { materials: scope.order(:name, :id).offset((page - 1) * 24).limit(24).map { |item| RenderingPresenter.material(item) }, total: scope.count, page: page,
      categories: Material::CATEGORIES, filters: { q: params[:q].to_s, category: params[:category].to_s } }
  end
  def new
    authorize Material
    render inertia: "materials/form", props: { material: nil, textures: [], categories: Material::CATEGORIES, slots: MaterialTexture::SLOTS }
  end
  def create
    authorize Material
    material = Material.create!(material_params.merge(user: current_user))
    redirect_to material_path(material), notice: "Material criado.", status: :see_other
  rescue ActiveRecord::RecordInvalid => error
    form_error(new_material_path, error)
  end
  def show
    material = policy_scope(Material).find(params[:id])
    authorize material
    render inertia: "materials/form", props: { material: RenderingPresenter.material(material), categories: Material::CATEGORIES, slots: MaterialTexture::SLOTS,
      textures: material.material_textures.current.with_attached_file.map { |texture| texture.as_json(only: %i[id slot metadata]).merge("url" => material_texture_path(material, texture), "filename" => texture.file.filename.to_s) } }
  end
  def edit
    material = policy_scope(Material).find(params[:id])
    authorize material
    redirect_to material_path(material)
  end
  def update
    material = policy_scope(Material).find(params[:id])
    authorize material
    material.update!(material_params)
    redirect_to material_path(material), notice: "Material atualizado.", status: :see_other
  rescue ActiveRecord::RecordInvalid => error
    form_error(material_path(params[:id]), error)
  end
  def destroy
    material = policy_scope(Material).find(params[:id])
    authorize material
    material.update!(deleted_at: Time.current)
    redirect_to materials_path, notice: "Material removido; revisões anteriores preservadas.", status: :see_other
  end
  private
  def material_params
    params.require(:material).permit(:name, :description, :category, :base_color, :roughness, :metallic, :transmission, :ior)
  end
end
