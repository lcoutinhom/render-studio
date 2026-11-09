require "rails_helper"
RSpec.describe "Internal account seed" do
  it "creates a confirmed account and preserves subsequent user changes" do
    load Rails.root.join("db/seeds.rb")
    user = User.find_by!(email: ENV.fetch("SEED_USER_EMAIL", "admin@renderstudio.local").downcase)
    expect(user).to be_confirmed
    expect(user.valid_password?(ENV.fetch("SEED_USER_PASSWORD", "RenderStudio@2026!"))).to be true
    expect(ActionMailer::Base.deliveries).to be_empty
    user.update!(name: "Updated internally", password: "changed-internal-password-123")
    expect { load Rails.root.join("db/seeds.rb") }.not_to change(User, :count)
    expect(user.reload.name).to eq("Updated internally")
    expect(user.valid_password?("changed-internal-password-123")).to be true
  end
end
