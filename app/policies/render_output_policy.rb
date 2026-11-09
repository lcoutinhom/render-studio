class RenderOutputPolicy < ApplicationPolicy
  def index? = user.present?
  def show? = user.present? && record.render_job.user_id == user.id
  def download? = show?
  def preview? = show?
  class Scope < ApplicationPolicy::Scope
    def resolve = user ? scope.where(render_job_id: RenderJob.where(user_id: user.id).select(:id)) : scope.none
  end
end
