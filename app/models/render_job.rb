class RenderJob < ApplicationRecord
  STATUSES = %w[draft queued processing completed failed cancelled].freeze
  TERMINAL = %w[completed failed cancelled].freeze
  TRANSITIONS = { "draft" => %w[queued cancelled], "queued" => %w[processing failed cancelled], "processing" => TERMINAL }.freeze
  belongs_to :render_batch
  belongs_to :user
  belongs_to :project
  belongs_to :project_version
  belongs_to :render_configuration
  belongs_to :environment
  belongs_to :environment_version
  belongs_to :previous_job, class_name: "RenderJob", optional: true
  has_one :next_attempt, class_name: "RenderJob", foreign_key: :previous_job_id
  has_one :comfy_execution, dependent: :restrict_with_error
  has_many :render_outputs, dependent: :restrict_with_error
  has_many :render_events, dependent: :restrict_with_error
  attr_readonly :render_batch_id, :user_id, :project_id, :project_version_id, :render_configuration_id, :environment_id, :environment_version_id, :previous_job_id, :workload_key, :attempt, :output_type, :camera_id, :snapshot, :simulate_failure, :dispatch_token
  validates :status, inclusion: { in: STATUSES }
  validates :output_type, inclusion: { in: %w[image video panorama vr] }
  validates :progress, numericality: { only_integer: true, in: 0..100 }
  validates :attempt, numericality: { only_integer: true, greater_than: 0 }
  validates :workload_key, presence: true, uniqueness: { scope: [ :render_batch_id, :attempt ] }
  validate do
    batch = render_batch
    unless batch && [ user_id, project_id, project_version_id, render_configuration_id ] == [ batch.user_id, batch.project_id, batch.project_version_id, batch.render_configuration_id ] && environment_version&.environment_id == environment_id && environment_version&.project_version_id == project_version_id
      errors.add(:base, "Job deve usar o mesmo usuário, projeto, versão e ambiente do lote")
    end
    unless snapshot.is_a?(Hash) && snapshot["project_id"] == project_id && snapshot["project_version_id"] == project_version_id && snapshot.dig("environment", "environment_id") == environment_id && snapshot.dig("environment", "environment_version_id") == environment_version_id && snapshot["output_type"] == output_type && snapshot["adapter"] == batch&.adapter && snapshot.dig("camera", "id") == camera_id
      errors.add(:snapshot, "deve preservar a identidade, versão, câmera e saída da tarefa")
    end
    errors.add(:attempt, "primeira tentativa deve ser 1") if previous_job.nil? && attempt != 1
    if status == "processing" && (lease_token.blank? || lease_expires_at.nil? || started_at.nil?)
      errors.add(:status, "processamento requer um lease e início registrados")
    end
    if previous_job && (previous_job.render_batch_id != render_batch_id || previous_job.workload_key != workload_key || previous_job.attempt + 1 != attempt)
      errors.add(:previous_job, "tentativa anterior incompatível")
    end
    if persisted? && will_save_change_to_status?
      from, to = status_change_to_be_saved
      errors.add(:status, "transição inválida de #{from} para #{to}") unless TRANSITIONS.fetch(from, []).include?(to)
    end
    if persisted? && will_save_change_to_progress? && progress < progress_in_database
      errors.add(:progress, "não pode retroceder na mesma tentativa")
    end
    errors.add(:progress, "deve ser 100 ao concluir") if status == "completed" && progress != 100
  end
  def terminal? = TERMINAL.include?(status)
end
