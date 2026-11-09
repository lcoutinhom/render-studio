class CreateRenderProcessing < ActiveRecord::Migration[8.1]
  def change
    add_index :render_configurations, [ :id, :project_id, :project_version_id, :user_id ], unique: true, name: "render_configuration_owner_version"
    add_index :environment_versions, [ :id, :environment_id, :project_version_id ], unique: true, name: "environment_version_identity"
    create_table :render_batches do |t|
      t.references :user, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.references :project_version, null: false, foreign_key: true
      t.references :render_configuration, null: false
      t.string :idempotency_key, null: false
      t.string :request_digest, null: false
      t.jsonb :environment_ids, null: false
      t.jsonb :failure_environment_ids, null: false, default: []
      t.string :adapter, null: false, default: "simulation"
      t.string :status, null: false, default: "queued"
      t.integer :progress, null: false, default: 0
      t.datetime :started_at
      t.datetime :completed_at
      t.timestamps
    end
    add_index :render_batches, [ :user_id, :idempotency_key ], unique: true
    add_index :render_batches, [ :id, :project_id, :project_version_id, :user_id, :render_configuration_id ], unique: true, name: "render_batch_owner_version"
    add_foreign_key :render_batches, :render_configurations, column: [ :render_configuration_id, :project_id, :project_version_id, :user_id ], primary_key: [ :id, :project_id, :project_version_id, :user_id ], name: "batch_configuration_owner_version_fk"
    add_check_constraint :render_batches, "status IN ('queued','processing','completed','partially_completed','failed','cancelled')", name: "render_batch_status"
    add_check_constraint :render_batches, "progress BETWEEN 0 AND 100", name: "render_batch_progress"
    add_check_constraint :render_batches, "adapter = 'simulation'", name: "render_batch_adapter"
    create_table :render_jobs do |t|
      t.references :render_batch, null: false
      t.references :user, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.references :project_version, null: false, foreign_key: true
      t.references :render_configuration, null: false, foreign_key: true
      t.references :environment, null: false, foreign_key: true
      t.references :environment_version, null: false
      t.references :previous_job, foreign_key: { to_table: :render_jobs }, index: { unique: true }
      t.string :workload_key, null: false
      t.integer :attempt, null: false, default: 1
      t.string :output_type, null: false
      t.bigint :camera_id
      t.string :status, null: false, default: "queued"
      t.integer :progress, null: false, default: 0
      t.jsonb :snapshot, null: false
      t.boolean :simulate_failure, null: false, default: false
      t.uuid :dispatch_token, null: false, default: -> { "gen_random_uuid()" }
      t.datetime :dispatched_at
      t.datetime :next_dispatch_at
      t.integer :dispatch_attempts, null: false, default: 0
      t.string :dispatch_error
      t.uuid :lease_token
      t.datetime :lease_expires_at
      t.datetime :started_at
      t.datetime :completed_at
      t.string :error_code
      t.text :error_message
      t.timestamps
    end
    add_index :render_jobs, [ :render_batch_id, :workload_key, :attempt ], unique: true, name: "unique_render_workload_attempt"
    add_index :render_jobs, :dispatch_token, unique: true
    add_index :render_jobs, [ :status, :next_dispatch_at ]
    add_index :render_jobs, [ :status, :lease_expires_at ]
    add_index :render_jobs, [ :id, :render_batch_id ], unique: true
    add_foreign_key :render_jobs, :render_batches, column: [ :render_batch_id, :project_id, :project_version_id, :user_id, :render_configuration_id ], primary_key: [ :id, :project_id, :project_version_id, :user_id, :render_configuration_id ], name: "job_batch_owner_version_fk"
    add_foreign_key :render_jobs, :environment_versions, column: [ :environment_version_id, :environment_id, :project_version_id ], primary_key: [ :id, :environment_id, :project_version_id ], name: "job_environment_version_fk"
    add_check_constraint :render_jobs, "status IN ('draft','queued','processing','completed','failed','cancelled')", name: "render_job_status"
    add_check_constraint :render_jobs, "progress BETWEEN 0 AND 100 AND attempt > 0", name: "render_job_progress_attempt"
    add_check_constraint :render_jobs, "output_type IN ('image','video','panorama','vr')", name: "render_job_output_type"
    create_table :render_events do |t|
      t.references :render_batch, null: false, foreign_key: true
      t.references :render_job
      t.string :kind, null: false
      t.string :message, null: false
      t.jsonb :details, null: false, default: {}
      t.timestamps
    end
    add_foreign_key :render_events, :render_jobs, column: [ :render_job_id, :render_batch_id ], primary_key: [ :id, :render_batch_id ], name: "event_job_batch_fk"
    add_index :render_events, [ :render_batch_id, :id ]
  end
end
