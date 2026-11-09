class RenderCamera < ApplicationRecord
  belongs_to :project
  belongs_to :environment
  belongs_to :project_version
  scope :kept, -> { where(deleted_at: nil) }
  attr_readonly :project_id, :environment_id, :project_version_id
  validates :name, presence: true, length: { maximum: 120 }
  validates :focal_length, numericality: { in: 1..500 }
  validates :field_of_view, numericality: { greater_than: 0, less_than: 180 }
  validates :projection_type, inclusion: { in: %w[perspective orthographic] }
  validate do
    %i[position rotation].each do |field|
      vector = public_send(field)
      errors.add(field, "deve conter três coordenadas finitas") unless vector.is_a?(Array) && vector.size == 3 && vector.all? { |n| n.is_a?(Numeric) && n.finite? && n.abs <= 1_000_000 }
    end
    unless environment&.project_id == project_id && project_version&.project_id == project_id && environment&.environment_versions&.exists?(project_version_id: project_version_id)
      errors.add(:base, "Câmera requer ambiente associado à mesma versão/projeto")
    end
    if metadata["source_node_id"].present? && !project_version&.metadata&.fetch("nodes", [])&.any? { |node| node["id"] == metadata["source_node_id"] }
      errors.add(:metadata, "referência de origem ausente nesta versão")
    end
  end

  def available?
    deleted_at.nil? && environment.deleted_at.nil? && environment.status == "active" &&
      environment.environment_versions.exists?(project_version_id: project_version_id, status: "validated") &&
      (metadata["source_node_id"].blank? || project_version.metadata.fetch("nodes", []).any? { |node| node["id"] == metadata["source_node_id"] })
  end
end
