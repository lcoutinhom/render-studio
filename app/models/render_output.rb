class RenderOutput < ApplicationRecord
  FORMATS = {
    "image/png" => %w[.png], "image/jpeg" => %w[.jpg .jpeg], "image/x-exr" => %w[.exr],
    "video/mp4" => %w[.mp4], "video/webm" => %w[.webm], "model/gltf-binary" => %w[.glb]
  }.freeze
  belongs_to :render_job
  has_one_attached :file
  attr_readonly :render_job_id, :kind, :checksum, :filename, :content_type, :byte_size, :metadata
  validates :checksum, format: { with: /\A[0-9a-f]{64}\z/ }, uniqueness: { scope: [ :render_job_id, :filename ] }
  validates :filename, presence: true, length: { maximum: 255 }
  validates :kind, inclusion: { in: %w[image video panorama vr] }
  validates :byte_size, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 1.gigabyte }
  validate do
    errors.add(:render_job, "deve estar concluído e corresponder ao tipo de resultado") unless render_job&.status == "completed" && render_job.output_type == kind
    allowed = case kind
    when "image", "panorama" then %w[image/png image/jpeg image/x-exr]
    when "video" then %w[video/mp4 video/webm]
    when "vr" then %w[model/gltf-binary]
    else []
    end
    errors.add(:content_type, "formato incompatível") unless allowed.include?(content_type) && FORMATS.fetch(content_type, []).include?(File.extname(filename.to_s).downcase)
    errors.add(:metadata, "deve ser um objeto JSON de até 16 KiB") unless metadata.is_a?(Hash) && metadata.to_json.bytesize <= 16.kilobytes
    errors.add(:file, "é obrigatório") unless file.attached?
    if file.attached? && [ file.blob.byte_size, file.blob.content_type, file.blob.filename.to_s ] != [ byte_size, content_type, filename ]
      errors.add(:file, "não corresponde aos metadados do resultado")
    end
    errors.add(:file, "não pode substituir um resultado existente") if persisted? && attachment_changes.key?("file")
  end
  def previewable? = %w[image/png image/jpeg video/mp4 video/webm].include?(content_type)
end
