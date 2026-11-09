require "rails_helper"
RSpec.describe "Project operations" do
  it "duplicates project identities and associations without copying binary models" do
    project = create(:project, settings: { quality: "high" })
    environment = create(:environment, project: project, settings: { lighting: "day" })
    version = real_version(project)
    create(:environment_version, project: project, environment: environment, project_version: version)
    count = ActiveStorage::Blob.count
    copy = Projects::Duplicate.call(project)
    expect(copy.user).to eq(project.user)
    expect(copy.settings).to eq(project.settings)
    expect(copy.environments.first.stable_id).not_to eq(environment.stable_id)
    expect(copy.project_versions.first.original_file.blob_id).to eq(version.original_file.blob_id)
    expect(ActiveStorage::Blob.count).to eq(count)
    mapping = copy.project_versions.first.environment_versions.first
    expect(mapping.project_id).to eq(copy.id)
    expect(mapping.environment_id).to eq(copy.environments.first.id)
  end

  it "optionally copies associations when duplicating an environment" do
    mapping = create(:environment_version)
    copy = Environments::Duplicate.call(mapping.environment)
    expect(copy.environment_versions).to be_empty
    with_associations = Environments::Duplicate.call(mapping.environment, copy_associations: true)
    expect(with_associations.environment_versions.first.project_version).to eq(mapping.project_version)
    expect(with_associations.stable_id).not_to eq(mapping.environment.stable_id)
  end

  it "reorders exactly the project environments atomically" do
    project = create(:project)
    first = create(:environment, project: project, position: 0)
    second = create(:environment, project: project, position: 1)
    Environments::Reorder.call(project, [ second.id, first.id ])
    expect(project.environments.kept.ordered.pluck(:id)).to eq([ second.id, first.id ])
    expect { Environments::Reorder.call(project, [ first.id, first.id ]) }.to raise_error(ArgumentError)
    expect { Environments::Reorder.call(project, [ create(:environment).id ]) }.to raise_error(ArgumentError)
    expect(project.environments.kept.ordered.pluck(:id)).to eq([ second.id, first.id ])
  end

  it "copies cameras, version overrides and mappings with coherent new identities" do
    project = create(:project)
    environment = create(:environment, project: project)
    version = real_version(project)
    association = create(:environment_version, project: project, environment: environment, project_version: version, settings: { "samples" => 300 })
    create(:render_camera, project: project, environment: environment, project_version: version)
    material = create(:material, user: project.user)
    MaterialMapping.create!(project: project, project_version: version, environment: environment, material: material, source_material_name: "Piso")
    copy = Projects::Duplicate.call(project)
    copied_environment = copy.environments.first
    copied_version = copy.project_versions.first
    expect(copied_environment.render_cameras.first.project_version).to eq(copied_version)
    expect(copied_environment.environment_versions.first.settings).to eq(association.settings)
    expect(copied_version.material_mappings.first.environment).to eq(copied_environment)
    same_project_copy = Environments::Duplicate.call(environment, copy_associations: true)
    expect(same_project_copy.render_cameras.first.project_version).to eq(version)
    expect(MaterialMapping.find_by!(environment: same_project_copy).material).to eq(material)
  end

  it "allocates increasing versions without changing the previous file or mapping" do
    project = create(:project)
    environment = create(:environment, project: project)
    first = real_version(project)
    mapping = create(:environment_version, project: project, environment: environment, project_version: first)
    second = real_version(project)
    expect([ first.version_number, second.version_number ]).to eq([ 1, 2 ])
    expect(second.environment_versions).to be_empty
    expect(mapping.reload.project_version).to eq(first)
    expect(first.original_file).to be_attached
  end
end
