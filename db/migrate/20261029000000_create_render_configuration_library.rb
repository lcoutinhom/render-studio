class CreateRenderConfigurationLibrary < ActiveRecord::Migration[8.1]
  def change
    add_column :environment_versions, :settings, :jsonb, null: false, default: {}
    add_index :environment_versions, [ :id, :project_version_id ], unique: true
    create_table :render_presets do |t|
      t.references :user, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.string :category, null: false, default: "custom"
      t.boolean :system, null: false, default: false
      t.string :system_key
      t.jsonb :settings, null: false, default: {}
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :render_presets, :system_key, unique: true
    add_check_constraint :render_presets, "(system AND user_id IS NULL AND system_key IS NOT NULL) OR (NOT system AND user_id IS NOT NULL AND system_key IS NULL)", name: "preset_ownership"
    create_table :materials do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :category, null: false
      t.text :description
      t.string :base_color, null: false, default: "#cccccc"
      t.float :roughness, null: false, default: 0.5
      t.float :metallic, null: false, default: 0
      t.float :transmission, null: false, default: 0
      t.float :ior, null: false, default: 1.45
      t.jsonb :metadata, null: false, default: {}
      t.datetime :deleted_at
      t.timestamps
    end
    create_table :material_textures do |t|
      t.references :material, null: false, foreign_key: true
      t.string :slot, null: false
      t.string :checksum, null: false
      t.jsonb :metadata, null: false, default: {}
      t.datetime :superseded_at
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :material_textures, [ :material_id, :slot ], unique: true, where: "superseded_at IS NULL AND deleted_at IS NULL", name: "current_material_texture_slot"
    create_table :material_mappings do |t|
      t.references :project, null: false, foreign_key: true
      t.references :project_version, null: false
      t.references :environment
      t.references :material, null: false, foreign_key: true
      t.string :source_material_name, null: false
      t.timestamps
    end
    add_foreign_key :material_mappings, :project_versions, column: [ :project_id, :project_version_id ], primary_key: [ :project_id, :id ]
    add_foreign_key :material_mappings, :environments, column: [ :project_id, :environment_id ], primary_key: [ :project_id, :id ]
    add_foreign_key :material_mappings, :environment_versions, column: [ :environment_id, :project_version_id ], primary_key: [ :environment_id, :project_version_id ]
    add_index :material_mappings, [ :project_version_id, :environment_id, :source_material_name ], unique: true, nulls_not_distinct: true, name: "unique_source_material_mapping"
    create_table :render_cameras do |t|
      t.references :project, null: false, foreign_key: true
      t.references :environment, null: false
      t.references :project_version, null: false
      t.string :name, null: false
      t.jsonb :position, null: false, default: [ 0, 1.6, 3 ]
      t.jsonb :rotation, null: false, default: [ 0, 0, 0 ]
      t.float :focal_length, null: false, default: 35
      t.float :field_of_view, null: false, default: 50
      t.string :projection_type, null: false, default: "perspective"
      t.jsonb :metadata, null: false, default: {}
      t.datetime :deleted_at
      t.timestamps
    end
    add_foreign_key :render_cameras, :environments, column: [ :project_id, :environment_id ], primary_key: [ :project_id, :id ]
    add_foreign_key :render_cameras, :project_versions, column: [ :project_id, :project_version_id ], primary_key: [ :project_id, :id ]
    add_foreign_key :render_cameras, :environment_versions, column: [ :environment_id, :project_version_id ], primary_key: [ :environment_id, :project_version_id ]
    create_table :render_configurations do |t|
      t.references :user, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.references :project_version, null: false
      t.references :render_preset, foreign_key: true
      t.references :previous_configuration, foreign_key: { to_table: :render_configurations }
      t.string :name, null: false
      t.string :mode, null: false, default: "simple"
      t.jsonb :settings, null: false, default: {}
      t.jsonb :camera_ids, null: false, default: []
      t.jsonb :snapshot, null: false
      t.timestamps
    end
    add_check_constraint :render_configurations, "mode IN ('simple','custom')", name: "render_configuration_mode"
    add_index :render_configurations, [ :id, :project_version_id ], unique: true
    add_foreign_key :render_configurations, :project_versions, column: [ :project_id, :project_version_id ], primary_key: [ :project_id, :id ]
    create_table :render_configuration_environments do |t|
      t.references :render_configuration, null: false
      t.references :environment_version, null: false
      t.references :project_version, null: false, foreign_key: true
      t.timestamps
    end
    add_index :render_configuration_environments, [ :render_configuration_id, :environment_version_id ], unique: true, name: "unique_configuration_environment"
    add_foreign_key :render_configuration_environments, :render_configurations, column: [ :render_configuration_id, :project_version_id ], primary_key: [ :id, :project_version_id ], name: "configuration_environment_version_fk"
    add_foreign_key :render_configuration_environments, :environment_versions, column: [ :environment_version_id, :project_version_id ], primary_key: [ :id, :project_version_id ], name: "configuration_association_version_fk"
  end
end
