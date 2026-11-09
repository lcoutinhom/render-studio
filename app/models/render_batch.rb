class RenderBatch < ApplicationRecord
  STATUSES = %w[queued processing completed partially_completed failed cancelled].freeze
  TERMINAL = %w[completed partially_completed failed cancelled].freeze
  belongs_to :user
  belongs_to :project
  belongs_to :project_version
  belongs_to :render_configuration
  has_many :render_jobs, dependent: :restrict_with_error
  has_many :render_events, dependent: :restrict_with_error
  attr_readonly :user_id, :project_id, :project_version_id, :render_configuration_id, :idempotency_key, :request_digest, :environment_ids, :failure_environment_ids, :adapter
  validates :status, inclusion: { in: STATUSES }
  validates :adapter, inclusion: { in: Rendering::Engines::NAMES }
  validates :progress, numericality: { only_integer: true, in: 0..100 }
  validates :idempotency_key, format: { with: /\A[a-zA-Z0-9_-]{16,128}\z/ }, uniqueness: { scope: :user_id }
  validates :request_digest, presence: true
  validate do
    unless render_configuration&.user_id == user_id && render_configuration&.project_id == project_id && render_configuration&.project_version_id == project_version_id
      errors.add(:base, "Configuração, usuário, projeto e versão incompatíveis")
    end
  end
  def terminal? = TERMINAL.include?(status)
  def latest_jobs
    render_jobs.select("DISTINCT ON (workload_key) render_jobs.*").order(:workload_key, attempt: :desc, id: :desc).includes(:next_attempt).to_a
  end
end
