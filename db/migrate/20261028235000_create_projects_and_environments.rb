class CreateProjectsAndEnvironments < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.string :client_name
      t.string :status, null: false, default: "active"
      t.jsonb :settings, null: false, default: {}
      t.datetime :archived_at
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :projects, [ :user_id, :deleted_at, :updated_at ]
    add_check_constraint :projects, "status IN ('active', 'archived')", name: "projects_status"

    create_table :environments do |t|
      t.references :project, null: false, foreign_key: true
      t.uuid :stable_id, null: false, default: -> { "gen_random_uuid()" }
      t.string :name, null: false
      t.text :description
      t.string :environment_type, null: false, default: "custom"
      t.string :custom_type
      t.string :status, null: false, default: "active"
      t.integer :position, null: false, default: 0
      t.jsonb :settings, null: false, default: {}
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :environments, :stable_id, unique: true
    add_index :environments, [ :project_id, :id ], unique: true
    add_index :environments, [ :project_id, :position ]
    add_check_constraint :environments, "position >= 0", name: "environment_position"
    add_check_constraint :environments, "status IN ('active', 'archived')", name: "environment_status"
    add_check_constraint :environments, "environment_type IN ('living_room','kitchen','bedroom','bathroom','office','dining_room','laundry','outdoor','custom')", name: "environment_type"

    create_table :project_versions do |t|
      t.references :project, null: false, foreign_key: true
      t.integer :version_number, null: false
      t.text :description
      t.string :format, null: false
      t.string :checksum, null: false
      t.jsonb :metadata, null: false, default: {}
      t.timestamps
    end
    add_index :project_versions, [ :project_id, :version_number ], unique: true
    add_index :project_versions, [ :project_id, :id ], unique: true
    add_check_constraint :project_versions, "version_number > 0", name: "version_number_positive"

    create_table :environment_versions do |t|
      t.references :project, null: false, foreign_key: true
      t.references :environment, null: false
      t.references :project_version, null: false
      t.string :status, null: false, default: "pending"
      t.jsonb :source_reference, null: false, default: {}
      t.jsonb :metadata, null: false, default: {}
      t.jsonb :bounding_box
      t.timestamps
    end
    add_index :environment_versions, [ :environment_id, :project_version_id ], unique: true
    add_foreign_key :environment_versions, :environments, column: [ :project_id, :environment_id ], primary_key: [ :project_id, :id ]
    add_foreign_key :environment_versions, :project_versions, column: [ :project_id, :project_version_id ], primary_key: [ :project_id, :id ]
    add_check_constraint :environment_versions, "status IN ('pending','validated','invalid')", name: "environment_version_status"
  end
end
