class CreateRenderOutputs < ActiveRecord::Migration[8.1]
  def change
    create_table :render_outputs do |t|
      t.references :render_job, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :checksum, null: false
      t.string :filename, null: false
      t.string :content_type, null: false
      t.bigint :byte_size, null: false
      t.jsonb :metadata, null: false, default: {}
      t.timestamps
    end
    add_index :render_outputs, [ :render_job_id, :checksum, :filename ], unique: true
    add_check_constraint :render_outputs, "kind IN ('image', 'video', 'panorama', 'vr')", name: "render_output_kind"
    add_check_constraint :render_outputs, "byte_size > 0 AND byte_size <= 1073741824", name: "render_output_size"
  end
end
