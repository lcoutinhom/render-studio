require "rails_helper"
RSpec.describe User, type: :model do
  it "requires a name and a sufficiently long password" do
    user = build(:user, name: "", password: "short")
    expect(user).not_to be_valid
    expect(user.errors.attribute_names).to include(:name, :password)
  end

  it "normalizes email and prevents duplicates" do
    create(:user, email: "architect@example.test")
    expect(build(:user, email: " ARCHITECT@example.test ")).not_to be_valid
  end

  it "blocks unconfirmed users" do
    expect(build(:user, :unconfirmed)).not_to be_active_for_authentication
  end

  it "confirms an account with the generated token" do
    user = create(:user, :unconfirmed)
    token = user.instance_variable_get(:@raw_confirmation_token)
    expect(token).to be_present
    expect(User.confirm_by_token(token)).to be_confirmed
  end
end
