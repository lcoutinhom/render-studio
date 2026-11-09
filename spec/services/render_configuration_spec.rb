require "rails_helper"
RSpec.describe Rendering::CreateConfiguration do
  let(:user) { create(:user) }
  let(:project) { create(:project, user: user, settings: { "samples" => 200 }) }
  let(:version) { real_version(project) }
  let(:room) { create(:environment, project: project, name: "Sala", settings: { "intensity" => 2 }) }
  let(:kitchen) { create(:environment, project: project, name: "Cozinha", settings: { "intensity" => 3 }) }
  let!(:association) { create(:environment_version, project: project, environment: room, project_version: version, settings: { "temperature" => 5000 }) }
  let!(:other_association) { create(:environment_version, project: project, environment: kitchen, project_version: version) }
  def save_configuration(**options)
    described_class.call(**{ user: user, project: project, version: version, environment_ids: [ room.id, kitchen.id ], settings: {}, camera_ids: [], name: "Proposta", mode: "custom" }.merge(options))
  end

  it "resolves system/preset/project/environment/version/request precedence independently" do
    preset = create(:render_preset, user: user, settings: { "samples" => 50, "intensity" => 1.5 })
    configuration = save_configuration(preset: preset, settings: { "samples" => 512 })
    rooms = configuration.snapshot.fetch("environments").index_by { |item| item["environment_id"] }
    expect(rooms[room.id]["effective_settings"]).to include("samples" => 512, "intensity" => 2, "temperature" => 5000)
    expect(rooms[kitchen.id]["effective_settings"]).to include("samples" => 512, "intensity" => 3, "temperature" => 6500)
    expect(rooms[room.id]["origins"]).to include("samples" => "Solicitação", "temperature" => "Versão do ambiente")
    expect(configuration.environment_versions).to contain_exactly(association, other_association)
    expect(configuration.project_version_id).to eq(version.id)
  end

  it "snapshots materials with per-environment overrides and selected cameras without enqueuing jobs" do
    general = create(:material, user: user)
    specific = create(:material, user: user, name: "Vidro", category: "glass")
    MaterialMapping.create!(project: project, project_version: version, material: general, source_material_name: "Piso")
    MaterialMapping.create!(project: project, project_version: version, environment: room, material: specific, source_material_name: "Piso")
    camera = create(:render_camera, project: project, project_version: version, environment: room)
    before_jobs = ActiveJob::Base.queue_adapter.enqueued_jobs.size
    configuration = save_configuration(camera_ids: [ camera.id ])
    expect(ActiveJob::Base.queue_adapter.enqueued_jobs.size).to eq(before_jobs)
    snapshots = configuration.snapshot["environments"].index_by { |item| item["environment_id"] }
    expect(snapshots[room.id]["materials"].first["material"]["id"]).to eq(specific.id)
    expect(snapshots[kitchen.id]["materials"].first["material"]["id"]).to eq(general.id)
    expect(snapshots[room.id]["cameras"].first["id"]).to eq(camera.id)
    expect(snapshots[kitchen.id]["cameras"]).to eq([])
    original = configuration.reload.snapshot.deep_dup
    project.update!(settings: { "samples" => 1 })
    room.update!(settings: {})
    specific.update!(roughness: 0.1)
    camera.update!(name: "Alterada")
    association.update!(source_reference: { "kind" => "scene", "references" => [ "0" ] })
    expect(configuration.reload.snapshot).to eq(original)
    expect { configuration.update!(settings: { "samples" => 1 }) }.to raise_error(ActiveRecord::ReadonlyAttributeError)
  end

  it "supports new immutable revisions without replacing prior configurations" do
    first = save_configuration
    second = save_configuration(settings: { "samples" => 256 }, previous: first)
    expect(second.previous_configuration).to eq(first)
    expect(first.reload.snapshot["environments"].first["effective_settings"]["samples"]).to eq(200)
    expect(second.snapshot["environments"].first["effective_settings"]["samples"]).to eq(256)
  end

  it "rejects missing, duplicated, archived, deleted, unconfirmed or foreign environments" do
    foreign = create(:environment)
    [ [], [ room.id, room.id ], [ foreign.id ] ].each { |ids| expect { save_configuration(environment_ids: ids) }.to raise_error(ArgumentError) }
    room.update!(status: "archived")
    expect { save_configuration }.to raise_error(ArgumentError)
    room.update!(status: "active")
    association.update!(status: "pending")
    expect { save_configuration }.to raise_error(ArgumentError)
    association.update!(status: "validated")
    room.discard!
    expect { save_configuration }.to raise_error(ArgumentError)
  end

  it "does not reuse environments or cameras from another model version" do
    new_version = real_version(project)
    expect { save_configuration(version: new_version) }.to raise_error(ArgumentError)
    camera = create(:render_camera, project: project, project_version: version, environment: room)
    new_mapping = create(:environment_version, project: project, project_version: new_version, environment: room)
    expect { save_configuration(version: new_version, environment_ids: [ room.id ], camera_ids: [ camera.id ]) }.to raise_error(ArgumentError)
    new_mapping.update!(status: "invalid")
    expect(camera).to be_available
  end

  it "rejects foreign presets, cameras, material ownership and deleted materials" do
    foreign_preset = create(:render_preset)
    foreign_camera = create(:render_camera)
    expect { save_configuration(preset: foreign_preset) }.to raise_error(ArgumentError)
    expect { save_configuration(camera_ids: [ foreign_camera.id ]) }.to raise_error(ArgumentError)
    material = create(:material, user: user)
    MaterialMapping.create!(project: project, project_version: version, material: material, source_material_name: "Piso")
    material.update!(deleted_at: Time.current)
    expect { save_configuration }.to raise_error(ArgumentError, /excluído/)
    foreign_material = create(:material)
    expect(MaterialMapping.new(project: project, project_version: version, material: foreign_material, source_material_name: "Parede")).not_to be_valid
  end

  it "enforces selected environment-version consistency at the database boundary" do
    configuration = save_configuration(environment_ids: [ room.id ])
    different = real_version(project)
    new_association = create(:environment_version, project: project, environment: room, project_version: different)
    expect {
      RenderConfigurationEnvironment.transaction(requires_new: true) do
        RenderConfigurationEnvironment.insert_all!([ { render_configuration_id: configuration.id, environment_version_id: new_association.id, project_version_id: version.id } ])
      end
    }.to raise_error(ActiveRecord::InvalidForeignKey)
  end
end
