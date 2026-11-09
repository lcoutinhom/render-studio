require "rails_helper"
RSpec.describe ProjectVersions::ReferenceCatalog do
  it "separates actual geometry, formal cameras and empty transformed markers without inferring from names" do
    result = described_class.classify({ "nodes" => [
      { "name" => "SALA", "children" => [ 1 ] }, { "name" => "Sofá", "mesh" => 0 },
      { "name" => "COZINHA 1", "translation" => [ 1, 2, 3 ] },
      { "name" => "Câmera", "camera" => 0 }, { "name" => "SALA 1" }
    ], "scenes" => [ { "nodes" => [ 0, 2, 3, 4 ] } ], "cameras" => [ {} ] })
    expect(result["nodes"].select { |node| node["has_geometry"] }.pluck("id")).to eq(%w[0 1])
    expect(result["view_markers"]).to eq([ { "id" => "2", "name" => "COZINHA 1" } ])
    expect(result["camera_count"]).to eq(1)
    expect(result["scene_count"]).to eq(1)
  end
  it "propagates geometry through multiple parents and does not loop on cycles" do
    result = described_class.classify({ "nodes" => [ { "children" => [ 1 ] }, { "children" => [ 0, 2 ] }, { "mesh" => 0 }, { "children" => [ 2 ] } ] })
    expect(result["nodes"].all? { |node| node["has_geometry"] }).to be(true)
  end
  it "derives metadata from bounded JSON reads and leaves the immutable original metadata intact" do
    version = real_version(create(:project))
    original = version.metadata.deep_dup
    expect(version.original_file.blob).not_to receive(:download)
    result = described_class.call(version)
    expect(result["reference_types_available"]).to be(true)
    expect(result["nodes"].first["has_geometry"]).to be(true)
    expect(version.reload.metadata).to eq(original)
    expect(ProjectPresenter.version(version, reference_types: true).dig("metadata", "reference_types_available")).to be(true)
  end
end
