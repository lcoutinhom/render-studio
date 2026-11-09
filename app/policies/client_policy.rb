class ClientPolicy < ApplicationPolicy
  def index? = user.present?
  def create? = user.present?
  def show? = user.present? && record.user_id == user.id && record.deleted_at.nil?
  def update? = show?
  def destroy? = show?
  class Scope < ApplicationPolicy::Scope
    def resolve = user ? scope.kept.where(user: user) : scope.none
  end
end
