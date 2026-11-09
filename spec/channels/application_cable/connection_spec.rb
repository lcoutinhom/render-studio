require "rails_helper"
RSpec.describe ApplicationCable::Connection, type: :channel do
  it "rejects anonymous connections" do
    expect { connect "/cable" }.to have_rejected_connection
  end

  it "identifies confirmed users from the session" do
    user = create(:user)
    connect "/cable", env: { "warden" => instance_double(Warden::Proxy, user: user) }
    expect(connection.current_user).to eq(user)
  end

  it "rejects unconfirmed users" do
    user = create(:user, :unconfirmed)
    expect {
      connect "/cable", env: { "warden" => instance_double(Warden::Proxy, user: user) }
    }.to have_rejected_connection
  end
end
