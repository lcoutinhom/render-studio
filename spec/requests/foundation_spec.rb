require "rails_helper"
RSpec.describe "Foundation", type: :request do
  let(:password) { "secure-password-123" }
  let(:user) { create(:user, password: password) }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }

  it "protects all private pages" do
    [ "/", "/dashboard", "/profile", "/settings" ].each do |path|
      get path
      expect(response).to redirect_to(new_user_session_path)
    end
  end

  it "renders every public authentication page with Inertia" do
    { "/users/sign_in" => "auth/login", "/users/password/new" => "auth/forgot-password", "/users/confirmation/new" => "auth/confirmation" }.each do |path, component|
      get path, headers: inertia
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["component"]).to eq(component)
    end
  end

  it "does not expose public account registration" do
    get "/users/sign_up"
    expect(response).to have_http_status(:not_found)
    expect {
      post "/users", params: { user: { name: "Public", email: "public@example.test", password: password } }
    }.not_to change(User, :count)
    expect(response).to have_http_status(:not_found)
    get "/users/edit"
    expect(response).to have_http_status(:not_found)
    delete "/users"
    expect(response).to have_http_status(:not_found)
  end

  it "requires authentication for account updates" do
    put user_registration_path, params: { user: { name: "Changed", current_password: password } }
    expect(response).to redirect_to(new_user_session_path)
  end

  it "rejects login before confirmation" do
    pending = create(:user, :unconfirmed)
    post user_session_path, params: { user: { email: pending.email, password: password } }
    get dashboard_path
    expect(response).to redirect_to(new_user_session_path)
  end

  it "logs in and out through real Devise endpoints" do
    post user_session_path, params: { user: { email: user.email, password: password } }
    expect(response).to redirect_to(dashboard_path)
    get dashboard_path, headers: inertia
    expect(response.parsed_body["props"].dig("auth", "user", "id")).to eq(user.id)
    expect(response.parsed_body.to_json).not_to include("encrypted_password", "confirmation_token", "reset_password_token")
    delete destroy_user_session_path
    get profile_path
    expect(response).to redirect_to(new_user_session_path)
  end

  it "returns failed login to GET sign in" do
    post user_session_path, params: { user: { email: user.email, password: "wrong" } }, headers: inertia
    expect(response).to have_http_status(:see_other)
    follow_redirect!(headers: inertia)
    expect(response.parsed_body["component"]).to eq("auth/login")
  end

  it "confirms an account with a valid token" do
    pending = create(:user, :unconfirmed)
    get user_confirmation_path, params: { confirmation_token: pending.instance_variable_get(:@raw_confirmation_token) }
    expect(pending.reload).to be_confirmed
    expect(response).to redirect_to(new_user_session_path)
  end

  it "handles invalid confirmation tokens" do
    get user_confirmation_path, params: { confirmation_token: "invalid" }
    expect(response).to redirect_to(new_user_confirmation_path)
  end

  it "does not reveal whether a recovery email exists" do
    [ user.email, "unknown@example.test" ].each do |email|
      post user_password_path, params: { user: { email: email } }
      expect(response).to redirect_to(new_user_session_path)
    end
    expect(ActionMailer::Base.deliveries.last.body.encoded).to include("reset_password_token")
  end

  it "resets passwords with a valid token without auto login" do
    token = user.send_reset_password_instructions
    put user_password_path, params: { user: { reset_password_token: token, password: "new-secure-password-456", password_confirmation: "new-secure-password-456" } }
    expect(user.reload.valid_password?("new-secure-password-456")).to be true
    expect(user.reset_password_token).to be_nil
    get profile_path
    expect(response).to redirect_to(new_user_session_path)
  end

  it "rejects expired reset tokens" do
    token = user.send_reset_password_instructions
    user.update_column(:reset_password_sent_at, 7.hours.ago)
    put user_password_path, params: { user: { reset_password_token: token, password: "new-secure-password-456", password_confirmation: "new-secure-password-456" } }
    expect(user.reload.valid_password?(password)).to be true
  end

  it "limits repeated login attempts" do
    11.times { post user_session_path, params: { user: { email: "unknown@example.test", password: "wrong" } } }
    expect(flash[:alert]).to include("Muitas tentativas")
  end

  it "requires current password to change the profile" do
    sign_in user
    put user_registration_path, params: { user: { name: "Changed", current_password: "wrong" } }
    expect(response).to redirect_to(profile_path)
    expect(user.reload.name).not_to eq("Changed")
  end

  it "updates only the current user and ignores injected identifiers" do
    other = create(:user)
    sign_in user
    put user_registration_path, params: { user: { id: other.id, name: "Updated", current_password: password } }
    expect(user.reload.name).to eq("Updated")
    expect(other.reload.name).not_to eq("Updated")
  end

  it "keeps the current email until a new email is confirmed" do
    sign_in user
    previous = user.email
    put user_registration_path, params: { user: { email: "new@example.test", current_password: password } }
    expect(user.reload.email).to eq(previous)
    expect(user.unconfirmed_email).to eq("new@example.test")
  end

  it "rejects state changes without CSRF tokens" do
    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    post user_session_path, params: { user: { email: user.email, password: password } }
    expect(response).to have_http_status(:unprocessable_content)
  ensure
    ActionController::Base.allow_forgery_protection = previous
  end
end
