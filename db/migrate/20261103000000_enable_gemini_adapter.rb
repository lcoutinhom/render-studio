class EnableGeminiAdapter < ActiveRecord::Migration[8.1]
  def up
    remove_check_constraint :render_batches, name: "render_batch_adapter"
    add_check_constraint :render_batches, "adapter IN ('simulation', 'blender', 'gemini')", name: "render_batch_adapter"
  end
  def down
    remove_check_constraint :render_batches, name: "render_batch_adapter"
    add_check_constraint :render_batches, "adapter IN ('simulation', 'blender')", name: "render_batch_adapter"
  end
end
