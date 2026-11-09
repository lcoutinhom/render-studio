require "rails_helper"
RSpec.describe Rendering::Settings do
  it "validates typed partial settings and normalizes form values" do
    expect(described_class.validate!({ "samples" => "256", "denoising" => "false", "quality" => "high" })).to eq("samples" => 256, "denoising" => false, "quality" => "professional")
    expect(described_class.validate!({})).to eq({})
    [ { "samples" => 0 }, { "samples" => 2.5 }, { "samples" => Float::INFINITY }, { "width" => 100 }, { "denoising" => nil }, { "lighting" => "bad" }, [] ].each do |settings|
      expect { described_class.validate!(settings) }.to raise_error(ArgumentError)
    end
  end
  it "validates panorama proportions and explicit video paths after inheritance" do
    expect { described_class.validate!({ "panorama_enabled" => true, "panorama_width" => 4000 }, complete: true) }.to raise_error(ArgumentError, /2:1/)
    expect { described_class.validate!({ "video_enabled" => true, "video_path" => [ { "position" => [ 0, 0, 0 ], "rotation" => [ 0, 0, 0 ] } ] }, complete: true) }.to raise_error(ArgumentError, /dois/)
    expect { described_class.validate!({ "video_path" => [ { "position" => [ 0, "x", 0 ], "rotation" => [ 0, 0, 0 ] } ] }) }.to raise_error(ArgumentError)
  end
end
