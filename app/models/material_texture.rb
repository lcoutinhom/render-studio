class MaterialTexture < ApplicationRecord
  SLOTS = %w[base_color roughness metallic normal displacement ambient_occlusion transmission].freeze
  belongs_to :material
  has_one_attached :file
  scope :current, -> { where(superseded_at: nil, deleted_at: nil) }
  attr_readonly :material_id, :slot, :checksum, :metadata
  validates :slot, inclusion: { in: SLOTS }
  validates :checksum, presence: true
  validate do
    errors.add(:file, "não pode substituir uma revisão de textura") if persisted? && attachment_changes.key?("file")
  end
end
