class EnvironmentPolicy < ApplicationPolicy
  def show? = ProjectPolicy.new(user, record.project).show? && record.deleted_at.nil?
  def update? = show?
  def destroy? = show?
  def duplicate? = show?
end
