class ProfilesController < ApplicationController
  def show
    authorize current_user, :show?
    render inertia: "profile"
  end
end
