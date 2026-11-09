class ProjectExperience < ApplicationRecord
  belongs_to :project
  belongs_to :project_file
  belongs_to :project_version
  belongs_to :render_batch
  attr_readonly :project_id, :project_file_id, :project_version_id, :render_batch_id, :kind
  validates :kind, inclusion: { in: %w[vr tour] }
  validate do
    unless project_file&.project_id == project_id && project_version&.project_file_id == project_file_id && render_batch&.project_id == project_id && render_batch&.project_version_id == project_version_id
      errors.add(:base, "Passeio deve usar arquivo, revisão e lote do mesmo projeto")
    end
  end
end
