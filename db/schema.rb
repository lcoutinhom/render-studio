# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_03_010000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "clients", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.string "email"
    t.string "phone"
    t.text "notes"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "user_id"], name: "index_clients_on_id_and_user_id", unique: true
    t.index ["user_id"], name: "index_clients_on_user_id"
  end

  create_table "comfy_executions", force: :cascade do |t|
    t.bigint "render_job_id", null: false
    t.string "prompt_id", null: false
    t.string "state", default: "prepared", null: false
    t.jsonb "workflow", default: {}, null: false
    t.jsonb "runtime", default: {}, null: false
    t.jsonb "result", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["prompt_id"], name: "index_comfy_executions_on_prompt_id", unique: true
    t.index ["render_job_id"], name: "index_comfy_executions_on_render_job_id", unique: true
    t.check_constraint "state::text = ANY (ARRAY['prepared'::character varying, 'submitting'::character varying, 'submitted'::character varying, 'completed'::character varying, 'failed'::character varying, 'uncertain'::character varying]::text[])", name: "comfy_execution_state"
  end

  create_table "environment_versions", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "environment_id", null: false
    t.bigint "project_version_id", null: false
    t.string "status", default: "pending", null: false
    t.jsonb "source_reference", default: {}, null: false
    t.jsonb "metadata", default: {}, null: false
    t.jsonb "bounding_box"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "settings", default: {}, null: false
    t.index ["environment_id", "project_version_id"], name: "idx_on_environment_id_project_version_id_2a32b8b5f6", unique: true
    t.index ["environment_id"], name: "index_environment_versions_on_environment_id"
    t.index ["id", "environment_id", "project_version_id"], name: "environment_version_identity", unique: true
    t.index ["id", "project_version_id"], name: "index_environment_versions_on_id_and_project_version_id", unique: true
    t.index ["project_id"], name: "index_environment_versions_on_project_id"
    t.index ["project_version_id"], name: "index_environment_versions_on_project_version_id"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'validated'::character varying, 'invalid'::character varying]::text[])", name: "environment_version_status"
  end

  create_table "environments", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.uuid "stable_id", default: -> { "gen_random_uuid()" }, null: false
    t.string "name", null: false
    t.text "description"
    t.string "environment_type", default: "custom", null: false
    t.string "custom_type"
    t.string "status", default: "active", null: false
    t.integer "position", default: 0, null: false
    t.jsonb "settings", default: {}, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "project_file_id"
    t.string "file_scene_id"
    t.index ["project_file_id", "file_scene_id"], name: "index_environments_on_project_file_id_and_file_scene_id", unique: true
    t.index ["project_file_id"], name: "index_environments_on_project_file_id"
    t.index ["project_id", "id"], name: "index_environments_on_project_id_and_id", unique: true
    t.index ["project_id", "position"], name: "index_environments_on_project_id_and_position"
    t.index ["project_id"], name: "index_environments_on_project_id"
    t.index ["stable_id"], name: "index_environments_on_stable_id", unique: true
    t.check_constraint "\"position\" >= 0", name: "environment_position"
    t.check_constraint "environment_type::text = ANY (ARRAY['living_room'::character varying, 'kitchen'::character varying, 'bedroom'::character varying, 'bathroom'::character varying, 'office'::character varying, 'dining_room'::character varying, 'laundry'::character varying, 'outdoor'::character varying, 'custom'::character varying]::text[])", name: "environment_type"
    t.check_constraint "status::text = ANY (ARRAY['active'::character varying, 'archived'::character varying]::text[])", name: "environment_status"
  end

  create_table "material_mappings", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "project_version_id", null: false
    t.bigint "environment_id"
    t.bigint "material_id", null: false
    t.string "source_material_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["environment_id"], name: "index_material_mappings_on_environment_id"
    t.index ["material_id"], name: "index_material_mappings_on_material_id"
    t.index ["project_id"], name: "index_material_mappings_on_project_id"
    t.index ["project_version_id", "environment_id", "source_material_name"], name: "unique_source_material_mapping", unique: true, nulls_not_distinct: true
    t.index ["project_version_id"], name: "index_material_mappings_on_project_version_id"
  end

  create_table "material_textures", force: :cascade do |t|
    t.bigint "material_id", null: false
    t.string "slot", null: false
    t.string "checksum", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "superseded_at"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["material_id", "slot"], name: "current_material_texture_slot", unique: true, where: "((superseded_at IS NULL) AND (deleted_at IS NULL))"
    t.index ["material_id"], name: "index_material_textures_on_material_id"
  end

  create_table "materials", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.string "category", null: false
    t.text "description"
    t.string "base_color", default: "#cccccc", null: false
    t.float "roughness", default: 0.5, null: false
    t.float "metallic", default: 0.0, null: false
    t.float "transmission", default: 0.0, null: false
    t.float "ior", default: 1.45, null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_materials_on_user_id"
  end

  create_table "project_experiences", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "project_file_id", null: false
    t.bigint "project_version_id", null: false
    t.bigint "render_batch_id", null: false
    t.string "kind", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_file_id"], name: "index_project_experiences_on_project_file_id"
    t.index ["project_id"], name: "index_project_experiences_on_project_id"
    t.index ["project_version_id"], name: "index_project_experiences_on_project_version_id"
    t.index ["render_batch_id"], name: "index_project_experiences_on_render_batch_id", unique: true
    t.check_constraint "kind::text = ANY (ARRAY['vr'::character varying, 'tour'::character varying]::text[])", name: "project_experiences_kind"
  end

  create_table "project_files", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.string "name", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "primary", default: false, null: false
    t.index ["id", "project_id"], name: "index_project_files_on_id_and_project_id", unique: true
    t.index ["project_id"], name: "index_project_files_on_project_id"
    t.index ["project_id"], name: "index_project_files_one_primary", unique: true, where: "((\"primary\" = true) AND (deleted_at IS NULL))"
  end

  create_table "project_versions", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.integer "version_number", null: false
    t.text "description"
    t.string "format", null: false
    t.string "checksum", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "project_file_id"
    t.integer "file_revision"
    t.index ["project_file_id", "file_revision"], name: "index_project_versions_on_project_file_id_and_file_revision", unique: true
    t.index ["project_file_id"], name: "index_project_versions_on_project_file_id"
    t.index ["project_id", "id"], name: "index_project_versions_on_project_id_and_id", unique: true
    t.index ["project_id", "version_number"], name: "index_project_versions_on_project_id_and_version_number", unique: true
    t.index ["project_id"], name: "index_project_versions_on_project_id"
    t.check_constraint "project_file_id IS NULL AND file_revision IS NULL OR project_file_id IS NOT NULL AND file_revision > 0", name: "file_revision_identity"
    t.check_constraint "version_number > 0", name: "version_number_positive"
  end

  create_table "projects", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.text "description"
    t.string "client_name"
    t.string "status", default: "active", null: false
    t.jsonb "settings", default: {}, null: false
    t.datetime "archived_at"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "client_id"
    t.index ["client_id"], name: "index_projects_on_client_id"
    t.index ["id", "user_id"], name: "index_projects_on_id_and_user_id", unique: true
    t.index ["user_id", "deleted_at", "updated_at"], name: "index_projects_on_user_id_and_deleted_at_and_updated_at"
    t.index ["user_id"], name: "index_projects_on_user_id"
    t.check_constraint "status::text = ANY (ARRAY['active'::character varying, 'archived'::character varying]::text[])", name: "projects_status"
  end

  create_table "render_batches", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "project_id", null: false
    t.bigint "project_version_id", null: false
    t.bigint "render_configuration_id", null: false
    t.string "idempotency_key", null: false
    t.string "request_digest", null: false
    t.jsonb "environment_ids", null: false
    t.jsonb "failure_environment_ids", default: [], null: false
    t.string "adapter", default: "simulation", null: false
    t.string "status", default: "queued", null: false
    t.integer "progress", default: 0, null: false
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "project_id", "project_version_id", "user_id", "render_configuration_id"], name: "render_batch_owner_version", unique: true
    t.index ["project_id"], name: "index_render_batches_on_project_id"
    t.index ["project_version_id"], name: "index_render_batches_on_project_version_id"
    t.index ["render_configuration_id"], name: "index_render_batches_on_render_configuration_id"
    t.index ["user_id", "idempotency_key"], name: "index_render_batches_on_user_id_and_idempotency_key", unique: true
    t.index ["user_id"], name: "index_render_batches_on_user_id"
    t.check_constraint "adapter::text = ANY (ARRAY['simulation'::character varying, 'blender'::character varying, 'gemini'::character varying, 'comfyui'::character varying]::text[])", name: "render_batch_adapter"
    t.check_constraint "progress >= 0 AND progress <= 100", name: "render_batch_progress"
    t.check_constraint "status::text = ANY (ARRAY['queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'partially_completed'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])", name: "render_batch_status"
  end

  create_table "render_cameras", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "environment_id", null: false
    t.bigint "project_version_id", null: false
    t.string "name", null: false
    t.jsonb "position", default: [0, 1.6, 3], null: false
    t.jsonb "rotation", default: [0, 0, 0], null: false
    t.float "focal_length", default: 35.0, null: false
    t.float "field_of_view", default: 50.0, null: false
    t.string "projection_type", default: "perspective", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["environment_id"], name: "index_render_cameras_on_environment_id"
    t.index ["project_id"], name: "index_render_cameras_on_project_id"
    t.index ["project_version_id"], name: "index_render_cameras_on_project_version_id"
  end

  create_table "render_configuration_environments", force: :cascade do |t|
    t.bigint "render_configuration_id", null: false
    t.bigint "environment_version_id", null: false
    t.bigint "project_version_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["environment_version_id"], name: "idx_on_environment_version_id_4c933cf7d0"
    t.index ["project_version_id"], name: "index_render_configuration_environments_on_project_version_id"
    t.index ["render_configuration_id", "environment_version_id"], name: "unique_configuration_environment", unique: true
    t.index ["render_configuration_id"], name: "idx_on_render_configuration_id_b647558662"
  end

  create_table "render_configurations", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "project_id", null: false
    t.bigint "project_version_id", null: false
    t.bigint "render_preset_id"
    t.bigint "previous_configuration_id"
    t.string "name", null: false
    t.string "mode", default: "simple", null: false
    t.jsonb "settings", default: {}, null: false
    t.jsonb "camera_ids", default: [], null: false
    t.jsonb "snapshot", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "project_id", "project_version_id", "user_id"], name: "render_configuration_owner_version", unique: true
    t.index ["id", "project_version_id"], name: "index_render_configurations_on_id_and_project_version_id", unique: true
    t.index ["previous_configuration_id"], name: "index_render_configurations_on_previous_configuration_id"
    t.index ["project_id"], name: "index_render_configurations_on_project_id"
    t.index ["project_version_id"], name: "index_render_configurations_on_project_version_id"
    t.index ["render_preset_id"], name: "index_render_configurations_on_render_preset_id"
    t.index ["user_id"], name: "index_render_configurations_on_user_id"
    t.check_constraint "mode::text = ANY (ARRAY['simple'::character varying, 'custom'::character varying]::text[])", name: "render_configuration_mode"
  end

  create_table "render_events", force: :cascade do |t|
    t.bigint "render_batch_id", null: false
    t.bigint "render_job_id"
    t.string "kind", null: false
    t.string "message", null: false
    t.jsonb "details", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["render_batch_id", "id"], name: "index_render_events_on_render_batch_id_and_id"
    t.index ["render_batch_id"], name: "index_render_events_on_render_batch_id"
    t.index ["render_job_id"], name: "index_render_events_on_render_job_id"
  end

  create_table "render_jobs", force: :cascade do |t|
    t.bigint "render_batch_id", null: false
    t.bigint "user_id", null: false
    t.bigint "project_id", null: false
    t.bigint "project_version_id", null: false
    t.bigint "render_configuration_id", null: false
    t.bigint "environment_id", null: false
    t.bigint "environment_version_id", null: false
    t.bigint "previous_job_id"
    t.string "workload_key", null: false
    t.integer "attempt", default: 1, null: false
    t.string "output_type", null: false
    t.bigint "camera_id"
    t.string "status", default: "queued", null: false
    t.integer "progress", default: 0, null: false
    t.jsonb "snapshot", null: false
    t.boolean "simulate_failure", default: false, null: false
    t.uuid "dispatch_token", default: -> { "gen_random_uuid()" }, null: false
    t.datetime "dispatched_at"
    t.datetime "next_dispatch_at"
    t.integer "dispatch_attempts", default: 0, null: false
    t.string "dispatch_error"
    t.uuid "lease_token"
    t.datetime "lease_expires_at"
    t.datetime "started_at"
    t.datetime "completed_at"
    t.string "error_code"
    t.text "error_message"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["dispatch_token"], name: "index_render_jobs_on_dispatch_token", unique: true
    t.index ["environment_id"], name: "index_render_jobs_on_environment_id"
    t.index ["environment_version_id"], name: "index_render_jobs_on_environment_version_id"
    t.index ["id", "render_batch_id"], name: "index_render_jobs_on_id_and_render_batch_id", unique: true
    t.index ["previous_job_id"], name: "index_render_jobs_on_previous_job_id", unique: true
    t.index ["project_id"], name: "index_render_jobs_on_project_id"
    t.index ["project_version_id"], name: "index_render_jobs_on_project_version_id"
    t.index ["render_batch_id", "workload_key", "attempt"], name: "unique_render_workload_attempt", unique: true
    t.index ["render_batch_id"], name: "index_render_jobs_on_render_batch_id"
    t.index ["render_configuration_id"], name: "index_render_jobs_on_render_configuration_id"
    t.index ["status", "lease_expires_at"], name: "index_render_jobs_on_status_and_lease_expires_at"
    t.index ["status", "next_dispatch_at"], name: "index_render_jobs_on_status_and_next_dispatch_at"
    t.index ["user_id"], name: "index_render_jobs_on_user_id"
    t.check_constraint "output_type::text = ANY (ARRAY['image'::character varying, 'video'::character varying, 'panorama'::character varying, 'vr'::character varying]::text[])", name: "render_job_output_type"
    t.check_constraint "progress >= 0 AND progress <= 100 AND attempt > 0", name: "render_job_progress_attempt"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])", name: "render_job_status"
  end

  create_table "render_outputs", force: :cascade do |t|
    t.bigint "render_job_id", null: false
    t.string "kind", null: false
    t.string "checksum", null: false
    t.string "filename", null: false
    t.string "content_type", null: false
    t.bigint "byte_size", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["render_job_id", "checksum", "filename"], name: "idx_on_render_job_id_checksum_filename_f9238adfa4", unique: true
    t.index ["render_job_id"], name: "index_render_outputs_on_render_job_id"
    t.check_constraint "byte_size > 0 AND byte_size <= 1073741824", name: "render_output_size"
    t.check_constraint "kind::text = ANY (ARRAY['image'::character varying, 'video'::character varying, 'panorama'::character varying, 'vr'::character varying]::text[])", name: "render_output_kind"
  end

  create_table "render_presets", force: :cascade do |t|
    t.bigint "user_id"
    t.string "name", null: false
    t.text "description"
    t.string "category", default: "custom", null: false
    t.boolean "system", default: false, null: false
    t.string "system_key"
    t.jsonb "settings", default: {}, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["system_key"], name: "index_render_presets_on_system_key", unique: true
    t.index ["user_id"], name: "index_render_presets_on_user_id"
    t.check_constraint "system AND user_id IS NULL AND system_key IS NOT NULL OR NOT system AND user_id IS NOT NULL AND system_key IS NULL", name: "preset_ownership"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "confirmation_sent_at"
    t.string "unconfirmed_email"
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "render_defaults", default: {}, null: false
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "clients", "users"
  add_foreign_key "comfy_executions", "render_jobs"
  add_foreign_key "environment_versions", "environments", column: ["project_id", "environment_id"], primary_key: ["project_id", "id"]
  add_foreign_key "environment_versions", "project_versions", column: ["project_id", "project_version_id"], primary_key: ["project_id", "id"]
  add_foreign_key "environment_versions", "projects"
  add_foreign_key "environments", "project_files"
  add_foreign_key "environments", "project_files", column: ["project_file_id", "project_id"], primary_key: ["id", "project_id"]
  add_foreign_key "environments", "projects"
  add_foreign_key "material_mappings", "environment_versions", column: ["environment_id", "project_version_id"], primary_key: ["environment_id", "project_version_id"]
  add_foreign_key "material_mappings", "environments", column: ["project_id", "environment_id"], primary_key: ["project_id", "id"]
  add_foreign_key "material_mappings", "materials"
  add_foreign_key "material_mappings", "project_versions", column: ["project_id", "project_version_id"], primary_key: ["project_id", "id"]
  add_foreign_key "material_mappings", "projects"
  add_foreign_key "material_textures", "materials"
  add_foreign_key "materials", "users"
  add_foreign_key "project_experiences", "project_files"
  add_foreign_key "project_experiences", "project_versions"
  add_foreign_key "project_experiences", "projects"
  add_foreign_key "project_experiences", "render_batches"
  add_foreign_key "project_files", "projects"
  add_foreign_key "project_versions", "project_files"
  add_foreign_key "project_versions", "project_files", column: ["project_file_id", "project_id"], primary_key: ["id", "project_id"]
  add_foreign_key "project_versions", "projects"
  add_foreign_key "projects", "clients"
  add_foreign_key "projects", "clients", column: ["client_id", "user_id"], primary_key: ["id", "user_id"]
  add_foreign_key "projects", "users"
  add_foreign_key "render_batches", "project_versions"
  add_foreign_key "render_batches", "projects"
  add_foreign_key "render_batches", "render_configurations", column: ["render_configuration_id", "project_id", "project_version_id", "user_id"], primary_key: ["id", "project_id", "project_version_id", "user_id"], name: "batch_configuration_owner_version_fk"
  add_foreign_key "render_batches", "users"
  add_foreign_key "render_cameras", "environment_versions", column: ["environment_id", "project_version_id"], primary_key: ["environment_id", "project_version_id"]
  add_foreign_key "render_cameras", "environments", column: ["project_id", "environment_id"], primary_key: ["project_id", "id"]
  add_foreign_key "render_cameras", "project_versions", column: ["project_id", "project_version_id"], primary_key: ["project_id", "id"]
  add_foreign_key "render_cameras", "projects"
  add_foreign_key "render_configuration_environments", "environment_versions", column: ["environment_version_id", "project_version_id"], primary_key: ["id", "project_version_id"], name: "configuration_association_version_fk"
  add_foreign_key "render_configuration_environments", "project_versions"
  add_foreign_key "render_configuration_environments", "render_configurations", column: ["render_configuration_id", "project_version_id"], primary_key: ["id", "project_version_id"], name: "configuration_environment_version_fk"
  add_foreign_key "render_configurations", "project_versions", column: ["project_id", "project_version_id"], primary_key: ["project_id", "id"]
  add_foreign_key "render_configurations", "projects"
  add_foreign_key "render_configurations", "render_configurations", column: "previous_configuration_id"
  add_foreign_key "render_configurations", "render_presets"
  add_foreign_key "render_configurations", "users"
  add_foreign_key "render_events", "render_batches"
  add_foreign_key "render_events", "render_jobs", column: ["render_job_id", "render_batch_id"], primary_key: ["id", "render_batch_id"], name: "event_job_batch_fk"
  add_foreign_key "render_jobs", "environment_versions", column: ["environment_version_id", "environment_id", "project_version_id"], primary_key: ["id", "environment_id", "project_version_id"], name: "job_environment_version_fk"
  add_foreign_key "render_jobs", "environments"
  add_foreign_key "render_jobs", "project_versions"
  add_foreign_key "render_jobs", "projects"
  add_foreign_key "render_jobs", "render_batches", column: ["render_batch_id", "project_id", "project_version_id", "user_id", "render_configuration_id"], primary_key: ["id", "project_id", "project_version_id", "user_id", "render_configuration_id"], name: "job_batch_owner_version_fk"
  add_foreign_key "render_jobs", "render_configurations"
  add_foreign_key "render_jobs", "render_jobs", column: "previous_job_id"
  add_foreign_key "render_jobs", "users"
  add_foreign_key "render_outputs", "render_jobs"
  add_foreign_key "render_presets", "users"
end
