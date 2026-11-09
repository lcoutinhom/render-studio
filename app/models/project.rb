class Project < ApplicationRecord
  include JsonSettings
  belongs_to :user
  belongs_to :client, optional: true
  has_many :project_files, dependent: :restrict_with_error
  has_many :project_experiences, dependent: :restrict_with_error
  has_many :render_configurations, dependent: :restrict_with_error
  has_many :environments, dependent: :restrict_with_error
  has_many :project_versions, dependent: :restrict_with_error
  scope :kept, -> { where(deleted_at: nil) }
  validates :name, presence: true, length: { maximum: 160 }
  validates :description, length: { maximum: 10_000 }
  validates :client_name, length: { maximum: 160 }
  validates :status, inclusion: { in: %w[active archived] }
  validate -> { validate_json_object(:settings) }

  validate do
    errors.add(:client, "pertence a outra conta ou foi excluído") if client && (client.user_id != user_id || (client.deleted_at && (new_record? || will_save_change_to_client_id?())))
  end

  def archive!
    update!(status: "archived", archived_at: Time.current)
  end

  def discard!
    update!(deleted_at: Time.current, status: "archived", archived_at: archived_at || Time.current)
  end
end
