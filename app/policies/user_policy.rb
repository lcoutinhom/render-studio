class UserPolicy < ApplicationPolicy
  def show? = user.present? && user.id == record.id
  def update? = show?

  class Scope < ApplicationPolicy::Scope
    def resolve
      user ? scope.where(id: user.id) : scope.none
    end
  end
end
