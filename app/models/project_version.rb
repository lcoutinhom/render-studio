class ProjectVersion < ApplicationRecord
  belongs_to :project
  belongs_to :project_file, optional: true
  has_many :material_mappings, dependent: :restrict_with_error
  has_many :render_cameras, dependent: :restrict_with_error
  has_one_attached :original_file
  has_many :environment_versions, dependent: :restrict_with_error
  has_many :environments, through: :environment_versions
  attr_readonly :project_id, :version_number, :format, :checksum, :metadata, :project_file_id, :file_revision
  validates :version_number, numericality: { only_integer: true, greater_than: 0 }, uniqueness: { scope: :project_id }
  validates :format, inclusion: { in: %w[glb gltf_zip obj_zip dae] }
  validates :description, length: { maximum: 10_000 }
  validates :checksum, presence: true
  validate :preserve_original

  private

  def preserve_original
    if persisted? && attachment_changes.key?("original_file")
      errors.add(:original_file, "não pode substituir o original; envie uma nova versão")
    end
  end
end
