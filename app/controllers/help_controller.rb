class HelpController < ApplicationController
  def show
    authorize current_user, :show?
    render inertia: "help/show"
  end
end
