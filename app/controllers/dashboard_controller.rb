class DashboardController < ApplicationController
  def show
    authorize current_user, :show?
    projects = policy_scope(Project)
    batches = policy_scope(RenderBatch)
    outputs = policy_scope(RenderOutput)
    render inertia: "dashboard", props: {
      totals: { files: ProjectFile.kept.where(project_id: projects.kept.select(:id)).count, projects: projects.kept.count, environments: Environment.kept.where(project_id: projects.kept.select(:id)).count,
        active_batches: batches.where(status: %w[queued processing]).count, completed_batches: batches.where(status: "completed").count,
        failed_batches: batches.where(status: %w[failed partially_completed]).count, outputs: outputs.count },
      projects: projects.kept.order(updated_at: :desc).limit(6).as_json(only: %i[id name status updated_at]),
      batches: batches.includes(:project).order(id: :desc).limit(8).map { |batch| batch.as_json(only: %i[id status progress created_at]).merge("project_name" => batch.project.name) }
    }
  end
end
