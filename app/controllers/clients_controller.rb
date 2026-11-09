class ClientsController < ApplicationController
  include DomainForms
  def index
    authorize Client
    scope = policy_scope(Client)
    scope = scope.where("name ILIKE ?", "%#{Client.sanitize_sql_like(params[:q].to_s.first(160))}%") if params[:q].present?
    render inertia: "clients/index", props: { clients: scope.order(:name).limit(200).map { |client| client.as_json(only: %i[id name email phone]) }, filters: { q: params[:q].to_s } }
  end
  def new
    authorize Client
    render inertia: "clients/form", props: { client: nil }
  end
  def create
    authorize Client
    client = current_user.clients.create!(attributes)
    redirect_to client_path(client), notice: "Cliente cadastrado.", status: :see_other
  rescue ActiveRecord::RecordInvalid => error
    form_error(new_client_path, error)
  end
  def show
    client = policy_scope(Client).find(params[:id]); authorize client
    render inertia: "clients/show", props: { client: client.as_json(only: %i[id name email phone notes]), projects: client.projects.kept.order(updated_at: :desc).map { |project| ProjectPresenter.project(project) } }
  end
  def edit
    client = policy_scope(Client).find(params[:id]); authorize client
    render inertia: "clients/form", props: { client: client.as_json(only: %i[id name email phone notes]) }
  end
  def update
    client = policy_scope(Client).find(params[:id]); authorize client
    client.update!(attributes)
    redirect_to client_path(client), notice: "Cliente atualizado.", status: :see_other
  rescue ActiveRecord::RecordInvalid => error
    form_error(edit_client_path(params[:id]), error)
  end
  def destroy
    client = policy_scope(Client).find(params[:id]); authorize client
    client.update!(deleted_at: Time.current)
    redirect_to clients_path, notice: "Cliente arquivado; projetos e resultados preservados.", status: :see_other
  end
  private
  def attributes = params.require(:client).permit(:name, :email, :phone, :notes)
end
