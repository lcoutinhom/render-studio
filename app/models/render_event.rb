class RenderEvent < ApplicationRecord
  belongs_to :render_batch
  belongs_to :render_job, optional: true
  validates :kind, :message, presence: true
  attr_readonly :render_batch_id, :render_job_id, :kind, :message, :details
end
