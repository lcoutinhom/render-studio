class Material < ApplicationRecord
  CATEGORIES = %w[wood glass mirror metal stone porcelain fabric paint plastic].freeze
  belongs_to :user
  has_many :material_textures, dependent: :restrict_with_error
  has_many :material_mappings, dependent: :restrict_with_error
  scope :kept, -> { where(deleted_at: nil) }
  validates :name, presence: true, length: { maximum: 120 }
  validates :description, length: { maximum: 5000 }
  validates :category, inclusion: { in: CATEGORIES }
  validates :base_color, format: { with: /\A#[0-9a-fA-F]{6}\z/ }
  validates :roughness, :metallic, :transmission, numericality: { in: 0..1 }
  validates :ior, numericality: { in: 1..3 }
end
