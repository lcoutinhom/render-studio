class ComfyExecution < ApplicationRecord
  belongs_to :render_job
  attr_readonly :render_job_id, :prompt_id
  validates :render_job_id, uniqueness: true
  validates :prompt_id, format: { with: /\A[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/ }, uniqueness: true
  validates :state, inclusion: { in: %w[prepared submitting submitted completed failed uncertain] }
end
