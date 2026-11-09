class ProjectVersionPolicy < ApplicationPolicy
  def show? = ProjectPolicy.new(user, record.project).show?
  def download? = show?
end
