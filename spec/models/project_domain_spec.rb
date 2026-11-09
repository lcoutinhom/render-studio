require "rails_helper"
RSpec.describe "Project domain" do
  it "validates names, types, status and settings objects" do
    expect(build(:project, name: "", settings: [])).not_to be_valid
    expect(build(:environment, environment_type: "invalid", settings: "invalid")).not_to be_valid
    expect(build(:environment, position: -1)).not_to be_valid
    expect(build(:environment, settings: { huge: "x" * 17.kilobytes })).not_to be_valid
  end

  it "keeps one environment identity across a subset of versions" do
    environment = create(:environment)
    first = create(:project_version, project: environment.project)
    second = create(:project_version, project: environment.project)
    stable_id = environment.stable_id
    create(:environment_version, environment: environment, project: environment.project, project_version: first)
    expect(environment.project_versions).to include(first)
    expect(environment.project_versions).not_to include(second)
    environment.update!(name: "Sala principal")
    expect(environment.reload.stable_id).to eq(stable_id)
  end

  it "rejects cross-project associations in the model" do
    env = create(:environment)
    foreign_version = create(:project_version)
    mapping = build(:environment_version, environment: env, project: env.project, project_version: foreign_version)
    expect(mapping).not_to be_valid
  end

  it "rejects cross-project associations at the database boundary" do
    env = create(:environment)
    foreign = create(:project_version)
    expect {
      EnvironmentVersion.transaction(requires_new: true) do
        EnvironmentVersion.insert_all!([ { project_id: env.project_id, environment_id: env.id, project_version_id: foreign.id } ])
      end
    }.to raise_error(ActiveRecord::InvalidForeignKey)
  end

  it "rejects duplicate version numbers and duplicate environment-version pairs" do
    association = create(:environment_version)
    expect(build(:environment_version, environment: association.environment, project: association.project, project_version: association.project_version)).not_to be_valid
    expect(build(:project_version, project: association.project, version_number: association.project_version.version_number)).not_to be_valid
  end

  it "validates regions and existing GLB node identifiers" do
    mapping = build(:environment_version)
    mapping.source_reference = { kind: "region", coordinate_system: "model" }.stringify_keys
    mapping.bounding_box = { min: [ 0, 0, 0 ], max: [ 1, 1, 1 ] }.stringify_keys
    expect(mapping).to be_valid
    mapping.bounding_box = { min: [ 2, 0, 0 ], max: [ 1, 1, 1 ] }.stringify_keys
    expect(mapping).not_to be_valid
    mapping.source_reference = { kind: "objects", references: [ "999" ] }.stringify_keys
    mapping.bounding_box = nil
    expect(mapping).not_to be_valid
  end

  it "soft-deletes environments and projects while retaining associations" do
    mapping = create(:environment_version)
    mapping.environment.discard!
    mapping.project.discard!
    expect(mapping.reload.environment.stable_id).to be_present
    expect(Environment.kept).not_to include(mapping.environment)
    expect(Project.kept).not_to include(mapping.project)
    expect(mapping.project_version).to be_persisted
  end

  it "preserves files and metadata on existing versions" do
    project = create(:project)
    version = real_version(project)
    expect { version.update!(checksum: "changed") }.to raise_error(ActiveRecord::ReadonlyAttributeError)
    original_blob = version.original_file.blob
    version.original_file.attach(original_blob)
    expect(version.errors[:original_file]).to be_present
    expect(version.reload.original_file.blob).to eq(original_blob)
  end
end
