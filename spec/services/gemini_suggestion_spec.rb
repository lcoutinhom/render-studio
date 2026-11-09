require "rails_helper"
RSpec.describe Rendering::GeminiSuggestion do
  let(:valid) { { "summary" => "Luz quente e redução de ruído.", "settings" => { "samples" => 128, "lighting" => "sunset", "denoising" => true }, "limitations" => [] } }
  it "allows bounded interior fill in manual JSON and Gemini suggestions" do
    expect(Rendering::Settings.validate!({}, complete: true)["interior_fill"]).to eq(0)
    expect(Rendering::Settings.validate!({}, complete: true)["interior_fill_side"]).to eq(0)
    expect(Rendering::Settings.validate!({}, complete: true)["neutral_daylight"]).to eq(false)
    expect(described_class.validate!(valid.merge("settings" => { "neutral_daylight" => true }))["settings"]["neutral_daylight"]).to eq(true)
    expect(described_class.validate!(valid.merge("settings" => { "interior_fill_side" => -1 }))["settings"]["interior_fill_side"]).to eq(-1)
    expect { Rendering::Settings.validate!({ "interior_fill_side" => 2 }) }.to raise_error(ArgumentError)
    expect(described_class.validate!(valid.merge("settings" => { "interior_fill" => 1.0 }))["settings"]["interior_fill"]).to eq(1.0)
    expect { described_class.validate!(valid.merge("settings" => { "interior_fill" => 5.1 })) }.to raise_error(described_class::Error)
    expect { described_class.validate!(valid.merge("settings" => { "interior_fill" => -1 })) }.to raise_error(described_class::Error)
  end
  it "accepts supported rendering settings and rejects executable or unknown fields" do
    expect(described_class.validate!(valid)["settings"]["samples"]).to eq(128)
    expect { described_class.validate!(valid.deep_merge("settings" => { "python" => "print(1)" })) }.to raise_error(described_class::Error)
    expect { described_class.validate!(valid.merge("settings" => {})) }.to raise_error(described_class::Error)
  end
  it "enforces practical limits, types, summary and limitations" do
    [ { "samples" => 513 }, { "resolution_width" => 4097 }, { "samples" => false }, { "lighting" => "invented" } ].each do |settings|
      expect { described_class.validate!(valid.merge("settings" => settings)) }.to raise_error(described_class::Error)
    end
    expect { described_class.validate!(valid.merge("summary" => "x" * 801)) }.to raise_error(described_class::Error)
    expect { described_class.validate!(valid.merge("limitations" => [ "x" * 241 ])) }.to raise_error(described_class::Error)
  end
  it "sends only text and permitted settings and validates the structured response" do
    allow(described_class).to receive(:enabled?).and_return(true)
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("GEMINI_API_KEY").and_return("test-key")
    success = Net::HTTPOK.new("1.1", "200", "OK")
    allow(success).to receive(:body).and_return({ candidates: [ { finishReason: "STOP", content: { parts: [ { text: valid.to_json } ] } } ] }.to_json)
    http = double(:http)
    expect(http).to receive(:request) do |request|
      body = JSON.parse(request.body)
      expect(request["x-goog-api-key"]).to eq("test-key")
      expect(body["contents"].first["parts"].first.keys).to eq([ "text" ])
      expect(body["generationConfig"]["responseJsonSchema"]).to be_present
      success
    end
    allow(Net::HTTP).to receive(:start).and_yield(http)
    expect(described_class.call(description: "Luz suave", settings: { samples: 16 })["summary"]).to eq(valid["summary"])
  end
  it "handles provider failure and malformed responses without exposing response bodies" do
    allow(described_class).to receive(:enabled?).and_return(true)
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("GEMINI_API_KEY").and_return("test-key")
    http = double(:http, request: Net::HTTPUnauthorized.new("1.1", "401", "Unauthorized"))
    allow(Net::HTTP).to receive(:start).and_yield(http)
    expect { described_class.call(description: "Luz suave") }.to raise_error(described_class::Error, /indisponível/)
    expect { described_class.call(description: "x" * 2001) }.to raise_error(ArgumentError)
  end
end
