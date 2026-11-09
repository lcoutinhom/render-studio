class AddProjectExperiences < ActiveRecord::Migration[8.1]
  def change
    add_column :project_files, :primary, :boolean, null: false, default: false
    add_index :project_files, :project_id, unique: true, where: "\"primary\" = true AND deleted_at IS NULL", name: "index_project_files_one_primary"
    create_table :project_experiences do |t|
      t.references :project, null: false, foreign_key: true
      t.references :project_file, null: false, foreign_key: true
      t.references :project_version, null: false, foreign_key: true
      t.references :render_batch, null: false, foreign_key: true, index: { unique: true }
      t.string :kind, null: false
      t.timestamps
    end
    add_check_constraint :project_experiences, "kind IN ('vr', 'tour')", name: "project_experiences_kind"
  end
end
