require "rails_helper"
RSpec.describe Rendering::LocalAi::Client do
  let(:client) { described_class.new }
  let(:http) { double("HTTP") }
  let(:png) { Base64.strict_decode64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4p8AAAAASUVORK5CYII=") }
  before do
    allow(Net::HTTP).to receive(:new).with("127.0.0.1", 8188, nil).and_return(http)
    allow(http).to receive(:open_timeout=)
    allow(http).to receive(:read_timeout=)
    allow(http).to receive(:write_timeout=)
    allow(http).to receive(:start).and_yield(http)
  end
  def response(body, code: "200")
    result = code == "200" ? Net::HTTPOK.new("1.1", code, "OK") : Net::HTTPBadRequest.new("1.1", code, "Error")
    allow(result).to receive(:read_body).and_yield(body)
    allow(http).to receive(:request).and_yield(result)
  end
  it "only accepts loopback HTTP without credentials or alternate paths" do
    ["https://example.com", "http://192.168.1.2:8188", "http://localhost:8188/other", "http://user@localhost:8188", "http://localhost:8188?url=other"].each do |url|
      expect { described_class.new(url: url) }.to raise_error(ArgumentError)
    end
  end
  it "uses the preassigned UUID and does not retry a timed out submission" do
    id = SecureRandom.uuid
    expect(http).to receive(:request).once do |req|
      expect(JSON.parse(req.body)).to include("prompt_id" => id, "client_id" => id)
      expect(req["x-goog-api-key"]).to be_nil
      raise Net::ReadTimeout
    end
    expect { client.submit(workflow: {}, prompt_id: id) }.to raise_error(described_class::UncertainSubmission)
  end
  it "distinguishes a rejected graph from an uncertain submission" do
    response('{}', code: "400")
    expect { client.submit(workflow: {}, prompt_id: SecureRandom.uuid) }.to raise_error(described_class::Rejected, /HTTP 400/)
  end
  it "rejects invalid confirmations after an accepted POST" do
    response('{}')
    expect { client.submit(workflow: {}, prompt_id: SecureRandom.uuid) }.to raise_error(described_class::UncertainSubmission)
  end
  it "checks ROCm, GPU and runtime compatibility" do
    response({ system: { comfyui_version: "0.42.5", pytorch_version: "2.12.0+rocm7.14.0" }, devices: [{ name: "cuda:0 AMD Radeon RX 9060 XT", type: "cuda" }] }.to_json)
    expect(client.gpu_runtime!["gpu"]).to include("RX 9060 XT")
    response({ system: { comfyui_version: "0.42.5", pytorch_version: "2.12.0+cpu" }, devices: [] }.to_json)
    expect { client.gpu_runtime! }.to raise_error(described_class::Failure, /GPU AMD/)
  end
  it "uploads deterministic PNG names and validates the returned name" do
    name = "reference-#{Digest::SHA256.hexdigest(png)}.png"
    response({ name: name, subfolder: "" }.to_json)
    expect(client.upload(png)).to eq(name)
    response({ name: "other.png" }.to_json)
    expect { client.upload(png) }.to raise_error(described_class::Failure, /referência/)
  end
  it "rejects unsafe output paths and fake images" do
    expect { client.download("filename" => "../other.png", "subfolder" => "", "type" => "output") }.to raise_error(described_class::Failure, /Caminho/)
    response('not a png')
    expect { client.download("filename" => "result.png", "subfolder" => "render-studio/1", "type" => "output") }.to raise_error(described_class::Failure, /PNG/)
  end
  it "bounds control responses before parsing JSON" do
    response('x' * (4.megabytes + 1))
    expect { client.history(SecureRandom.uuid) }.to raise_error(described_class::Failure, /limite/)
  end
  it "retries GET reads on network errors" do
    expect(http).to receive(:request).exactly(3).times.and_raise(Net::ReadTimeout)
    allow(client).to receive(:sleep)
    expect { client.history(SecureRandom.uuid) }.to raise_error(described_class::Unavailable)
  end
end
