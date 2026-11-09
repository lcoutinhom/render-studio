class RenderConfigurationPolicy < ApplicationPolicy
  def index? = user.present?
  def create? = user.present?
  def show? = user.present? && record.user_id == user.id && record.project.deleted_at.nil?
  def update? = show?
  class Scope < ApplicationPolicy::Scope
    def resolve
      user ? scope.joins(:project).where(projects: { deleted_at: nil }).where(user_id: user.id) : scope.none
    end
  end
end
