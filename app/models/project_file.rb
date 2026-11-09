class ProjectFile < ApplicationRecord
  belongs_to :project
  has_many :project_versions, dependent: :restrict_with_error
  scope :kept, -> { where(deleted_at: nil) }
  validates :name, presence: true, length: { maximum: 160 }
  attr_readonly :project_id
end
