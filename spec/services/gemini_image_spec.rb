require "rails_helper"
RSpec.describe Rendering::GeminiImage do
  it "distinguishes quota, access, model and request errors without exposing provider data" do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("GEMINI_API_KEY").and_return("private-test-key")
    http = double("HTTP")
    allow(Net::HTTP).to receive(:start).and_yield(http)
    { 400 => /parâmetros/, 403 => /negou acesso/, 404 => /não encontrado/, 429 => /cota/, 503 => /mais tarde/ }.each do |code, message|
      response = double("response", code: code.to_s)
      allow(response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(false)
      allow(http).to receive(:request).and_yield(response)
      expect {
        described_class.call(reference: "reference", prompt: Rendering::PromptBuilder.new.snapshot, model: "test-image")
      }.to raise_error(described_class::Failure, message)
    end
  end
end
