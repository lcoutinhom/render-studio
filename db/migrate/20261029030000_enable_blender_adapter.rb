class EnableBlenderAdapter < ActiveRecord::Migration[8.1]
  def change
    remove_check_constraint :render_batches, "adapter = 'simulation'", name: "render_batch_adapter"
    add_check_constraint :render_batches, "adapter IN ('simulation', 'blender')", name: "render_batch_adapter"
  end
end
