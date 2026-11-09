class IntegrateComfyuiRendering < ActiveRecord::Migration[8.1]
  def up
    remove_check_constraint :render_batches, name: "render_batch_adapter"
    add_check_constraint :render_batches, "adapter IN ('simulation', 'blender', 'gemini', 'comfyui')", name: "render_batch_adapter"
    create_table :comfy_executions do |t|
      t.references :render_job, null: false, foreign_key: true, index: { unique: true }
      t.string :prompt_id, null: false
      t.string :state, null: false, default: "prepared"
      t.jsonb :workflow, null: false, default: {}
      t.jsonb :runtime, null: false, default: {}
      t.jsonb :result, null: false, default: {}
      t.timestamps
    end
    add_index :comfy_executions, :prompt_id, unique: true
    add_check_constraint :comfy_executions, "state IN ('prepared', 'submitting', 'submitted', 'completed', 'failed', 'uncertain')", name: "comfy_execution_state"
  end

  def down
    drop_table :comfy_executions
    remove_check_constraint :render_batches, name: "render_batch_adapter"
    add_check_constraint :render_batches, "adapter IN ('simulation', 'blender', 'gemini')", name: "render_batch_adapter"
  end
end
