require "rails_helper"
RSpec.describe UserPolicy do
  let(:user) { create(:user) }
  let(:other) { create(:user) }

  it "permits viewing and updating only the current user" do
    expect(described_class.new(user, user)).to be_show
    expect(described_class.new(user, user)).to be_update
    expect(described_class.new(user, other)).not_to be_show
    expect(described_class.new(user, other)).not_to be_update
    expect(described_class.new(nil, user)).not_to be_show
  end

  it "scopes queries to the current user" do
    other
    expect(described_class::Scope.new(user, User).resolve.to_a).to eq([ user ])
    expect(described_class::Scope.new(nil, User).resolve).to be_empty
  end

  it "denies operations by default" do
    expect(ApplicationPolicy.new(user, other)).not_to be_destroy
    expect(ApplicationPolicy::Scope.new(user, User).resolve).to be_empty
  end
end
