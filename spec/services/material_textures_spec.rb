require "rails_helper"
RSpec.describe Materials::AttachTexture do
  let(:material) { create(:material) }
  def attach
    inspect_file(File.binread(Rails.root.join("spec/fixtures/files/pixel.png")), filename: "wood.png", content_type: "image/png") { |upload| described_class.call(material, slot: "base_color", upload: upload) }
  end
  it "validates image content and retains old texture revisions with their blobs" do
    first = attach
    second = attach
    expect(first.reload.superseded_at).to be_present
    expect(first.file).to be_attached
    expect(material.material_textures.current).to contain_exactly(second)
    expect(second.metadata).to include("width" => 1, "height" => 1)
    second.update!(deleted_at: Time.current)
    expect(second.reload.file).to be_attached
    expect(material.material_textures.current).to be_empty
  end
  it "rejects MIME forgery, invalid channels, corrupt PNG, executable files and oversize images" do
    png = File.binread(Rails.root.join("spec/fixtures/files/pixel.png"))
    [ [ png, "wood.png", "image/jpeg" ], [ png.tr("P", "X"), "wood.png", "image/png" ], [ "<script>", "wood.svg", "image/svg+xml" ] ].each do |bytes, name, type|
      inspect_file(bytes, filename: name, content_type: type) do |upload|
        expect { described_class.call(material, slot: "base_color", upload: upload) }.to raise_error(ArgumentError)
      end
    end
    inspect_file(png, filename: "wood.png", content_type: "image/png") do |upload|
      allow(upload).to receive(:size).and_return(21.megabytes)
      expect { described_class.call(material, slot: "base_color", upload: upload) }.to raise_error(ArgumentError)
    end
    expect { described_class.call(material, slot: "bad", upload: nil) }.to raise_error(ArgumentError)
  end
  it "accepts an actual JPEG with validated dimensions" do
    inspect_file(File.binread(Rails.root.join("spec/fixtures/files/pixel.jpg")), filename: "wood.jpg", content_type: "image/jpeg") do |upload|
      texture = described_class.call(material, slot: "roughness", upload: upload)
      expect(texture.metadata).to include("width" => 2, "height" => 2)
    end
  end

  it "preserves uploaded texture revisions inside configuration snapshots" do
    texture = attach
    project = create(:project, user: material.user)
    version = real_version(project)
    environment = create(:environment, project: project)
    create(:environment_version, project: project, environment: environment, project_version: version)
    MaterialMapping.create!(project: project, project_version: version, material: material, source_material_name: "Wood")
    config = Rendering::CreateConfiguration.call(user: material.user, project: project, version: version, environment_ids: [ environment.id ], settings: {}, name: "Test", mode: "simple")
    frozen = config.snapshot.deep_dup
    attach
    expect(config.reload.snapshot).to eq(frozen)
    expect(config.snapshot["environments"].first["materials"].first["textures"].first["blob_id"]).to eq(texture.file.blob_id)
    expect(texture.reload.file).to be_attached
  end
end
