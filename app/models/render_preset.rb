class RenderPreset < ApplicationRecord
  belongs_to :user, optional: true
  scope :kept, -> { where(deleted_at: nil) }
  scope :available_to, ->(user) { kept.where(system: true).or(kept.where(user: user)) }
  attr_readonly :user_id, :system, :system_key
  validates :name, presence: true, length: { maximum: 120 }
  validates :description, length: { maximum: 2000 }
  validates :category, inclusion: { in: %w[quality lighting custom] }
  validate do
    errors.add(:user, "inválido") unless system? ? user_id.nil? && system_key.present? : user_id.present? && system_key.nil?
    begin
      Rendering::Settings.validate!(settings)
    rescue ArgumentError => error
      errors.add(:settings, error.message)
    end
  end
end
