class Environment < ApplicationRecord
  include JsonSettings
  TYPES = %w[living_room kitchen bedroom bathroom office dining_room laundry outdoor custom].freeze
  belongs_to :project
  belongs_to :project_file, optional: true
  has_many :render_cameras, dependent: :restrict_with_error
  has_many :environment_versions, dependent: :restrict_with_error
  has_many :project_versions, through: :environment_versions
  scope :kept, -> { where(deleted_at: nil) }
  scope :ordered, -> { order(:position, :id) }
  attr_readonly :project_id, :stable_id
  validates :name, presence: true, length: { maximum: 160 }
  validates :description, length: { maximum: 10_000 }
  validates :environment_type, inclusion: { in: TYPES }
  validates :custom_type, length: { maximum: 80 }
  validates :status, inclusion: { in: %w[active archived] }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate -> { validate_json_object(:settings) }

  def discard!
    update!(deleted_at: Time.current, status: "archived")
  end
end
