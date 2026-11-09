class AddClientAndFileWorkflow < ActiveRecord::Migration[8.1]
  def up
    create_table :clients do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :email
      t.string :phone
      t.text :notes
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :clients, [ :id, :user_id ], unique: true
    add_reference :projects, :client, foreign_key: true
    add_index :projects, [ :id, :user_id ], unique: true
    add_foreign_key :projects, :clients, column: [ :client_id, :user_id ], primary_key: [ :id, :user_id ]
    add_column :users, :render_defaults, :jsonb, null: false, default: {}
    create_table :project_files do |t|
      t.references :project, null: false, foreign_key: true
      t.string :name, null: false
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :project_files, [ :id, :project_id ], unique: true
    add_reference :project_versions, :project_file, foreign_key: true
    add_column :project_versions, :file_revision, :integer
    add_index :project_versions, [ :project_file_id, :file_revision ], unique: true
    add_foreign_key :project_versions, :project_files, column: [ :project_file_id, :project_id ], primary_key: [ :id, :project_id ]
    add_check_constraint :project_versions, "(project_file_id IS NULL AND file_revision IS NULL) OR (project_file_id IS NOT NULL AND file_revision > 0)", name: "file_revision_identity"
    add_reference :environments, :project_file, foreign_key: true
    add_column :environments, :file_scene_id, :string
    add_index :environments, [ :project_file_id, :file_scene_id ], unique: true
    add_foreign_key :environments, :project_files, column: [ :project_file_id, :project_id ], primary_key: [ :id, :project_id ]
    # Derive file identities without modifying original bytes, metadata, or historical snapshots.
    select_all("SELECT id, project_id FROM project_versions ORDER BY id").each do |version|
      name = select_value("SELECT b.filename FROM active_storage_attachments a JOIN active_storage_blobs b ON b.id=a.blob_id WHERE a.record_type='ProjectVersion' AND a.record_id=#{version['id'].to_i} AND a.name='original_file' LIMIT 1") || "Arquivo #{version['id']}"
      id = select_value("INSERT INTO project_files(project_id,name,created_at,updated_at) VALUES(#{version['project_id'].to_i},#{quote(name.to_s.first(160))},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id")
      execute "UPDATE project_versions SET project_file_id=#{id.to_i},file_revision=1 WHERE id=#{version['id'].to_i}"
    end
    select_all("SELECT DISTINCT user_id,client_name FROM projects WHERE client_name IS NOT NULL AND client_name<>''").each do |row|
      id=select_value("INSERT INTO clients(user_id,name,created_at,updated_at) VALUES(#{row['user_id'].to_i},#{quote(row['client_name'].to_s.first(160))},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id")
      execute "UPDATE projects SET client_id=#{id.to_i} WHERE user_id=#{row['user_id'].to_i} AND client_name=#{quote(row['client_name'])}"
    end
  end
  def down
    raise ActiveRecord::IrreversibleMigration, "Preserve client/file identities and historical results"
  end
end
