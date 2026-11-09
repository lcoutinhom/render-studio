class RenderPresetPolicy < ApplicationPolicy
  def index? = user.present?
  def create? = user.present?
  def show? = user.present? && record.deleted_at.nil? && (record.system? || record.user_id == user.id)
  def update? = show? && !record.system? && record.user_id == user.id
  def destroy? = update?
  class Scope < ApplicationPolicy::Scope
    def resolve = user ? scope.available_to(user) : scope.none
  end
end
