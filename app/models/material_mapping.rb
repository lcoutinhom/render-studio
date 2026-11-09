class MaterialMapping < ApplicationRecord
  belongs_to :project
  belongs_to :project_version
  belongs_to :environment, optional: true
  belongs_to :material
  validates :source_material_name, presence: true, length: { maximum: 160 }, uniqueness: { scope: [ :project_version_id, :environment_id ] }
  validate do
    errors.add(:base, "Material, ambiente e versão devem pertencer ao proprietário/projeto") unless project_version&.project_id == project_id && (!environment || environment.project_id == project_id) && material&.user_id == project&.user_id
    errors.add(:material, "excluído") if material&.deleted_at
    if environment && !environment.environment_versions.exists?(project_version_id: project_version_id)
      errors.add(:environment, "ausente nesta versão")
    end
  end
end
