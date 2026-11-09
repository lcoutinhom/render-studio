class Client < ApplicationRecord
  belongs_to :user
  has_many :projects, dependent: :restrict_with_error
  scope :kept, -> { where(deleted_at: nil) }
  validates :name, presence: true, length: { maximum: 160 }
  validates :email, length: { maximum: 254 }, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validates :phone, length: { maximum: 80 }
  validates :notes, length: { maximum: 10_000 }
end
