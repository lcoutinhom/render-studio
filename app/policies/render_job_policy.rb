class RenderJobPolicy < ApplicationPolicy
  def show? = user.present? && record.user_id == user.id
  def cancel? = show?
  def retry? = show?
  class Scope < ApplicationPolicy::Scope
    def resolve = user ? scope.where(user_id: user.id) : scope.none
  end
end
