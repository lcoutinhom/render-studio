class ProjectPolicy < ApplicationPolicy
  def index? = user.present?
  def create? = user.present?
  def show? = user.present? && record.user_id == user.id && record.deleted_at.nil?
  def update? = show?
  def destroy? = show?
  def duplicate? = show?
  def archive? = show?

  class Scope < ApplicationPolicy::Scope
    def resolve
      user ? scope.kept.where(user_id: user.id) : scope.none
    end
  end
end
