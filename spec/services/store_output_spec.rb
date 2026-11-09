require "rails_helper"
RSpec.describe Rendering::StoreOutput do
  before { fast_simulation }
  let(:batch) { submit_processing(processing_configuration) }
  let(:job) { batch.render_jobs.first }
  let(:bytes) { File.binread(Rails.root.join("spec/fixtures/files/pixel.png")) }
  def store(**options)
    described_class.call(**{ job: job, io: StringIO.new(bytes), filename: "render.png", content_type: "image/png" }.merge(options))
  end
  it "stores checksummed bytes idempotently without reusing artifacts across attempts" do
    ProcessRenderJob.perform_now(job.id)
    job.reload
    output = store
    expect(output.checksum).to eq(Digest::SHA256.hexdigest(bytes))
    expect(output.file.download).to eq(bytes)
    expect { expect(store.id).to eq(output.id) }.not_to change(ActiveStorage::Blob, :count)
    expect { store(metadata: { "different" => true }) }.to raise_error(ArgumentError)
    expect { store(filename: "second.png") }.to change(RenderOutput, :count).by(1)
    with_metadata = store(filename: "metadata.png", metadata: { width: 1 })
    expect(store(filename: "metadata.png", metadata: { "width" => 1 }).id).to eq(with_metadata.id)
  end
  it "rejects unfinished tasks, mismatched signatures and formats, and cleans uncommitted blobs" do
    expect { store }.to raise_error(ArgumentError, /concluída/)
    ProcessRenderJob.perform_now(job.id)
    job.reload
    expect { store(io: StringIO.new("not an image")) }.to raise_error(ArgumentError, /Conteúdo/)
    expect { store(filename: "unsafe.html") }.to raise_error(ActiveRecord::RecordInvalid)
    expect(ActiveStorage::Blob.where(filename: "unsafe.html")).not_to exist
    expect { store(content_type: "text/html") }.to raise_error(ArgumentError)
    expect(RenderOutput.count).to eq(0)
  end
end
