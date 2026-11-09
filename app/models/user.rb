class User < ApplicationRecord
  has_many :clients, dependent: :restrict_with_error
  has_many :projects, dependent: :restrict_with_error
  devise :database_authenticatable, :registerable,
    :recoverable, :rememberable, :validatable, :confirmable

  normalizes :email, with: ->(email) { email.strip.downcase }
  validates :name, presence: true, length: { maximum: 120 }
end
