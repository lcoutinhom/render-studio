class RenderConfiguration < ApplicationRecord
  has_many :render_batches, dependent: :restrict_with_error
  belongs_to :user
  belongs_to :project
  belongs_to :project_version
  belongs_to :render_preset, optional: true
  belongs_to :previous_configuration, class_name: "RenderConfiguration", optional: true
  has_many :render_configuration_environments, dependent: :restrict_with_error
  has_many :environment_versions, through: :render_configuration_environments
  attr_readonly :user_id, :project_id, :project_version_id, :render_preset_id, :previous_configuration_id, :name, :mode, :settings, :camera_ids, :snapshot
  validates :name, presence: true, length: { maximum: 160 }
  validates :mode, inclusion: { in: %w[simple custom] }
  validate do
    errors.add(:base, "Projeto e versão incompatíveis") unless project&.user_id == user_id && project_version&.project_id == project_id
    errors.add(:snapshot, "deve registrar a versão e os ambientes") unless snapshot.is_a?(Hash) && snapshot["project_version_id"] == project_version_id && snapshot["environments"].is_a?(Array) && snapshot["environments"].any?
    if previous_configuration && (previous_configuration.user_id != user_id || previous_configuration.project_id != project_id)
      errors.add(:previous_configuration, "incompatível")
    end
    begin
      Rendering::Settings.validate!(settings)
    rescue ArgumentError => error
      errors.add(:settings, error.message)
    end
  end
end
