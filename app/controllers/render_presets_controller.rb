class RenderPresetsController < ApplicationController
  include DomainForms
  def index
    authorize RenderPreset
    render inertia: "presets/index", props: { presets: policy_scope(RenderPreset).order(system: :desc, name: :asc).map { |item| RenderingPresenter.preset(item) } }
  end
  def new
    authorize RenderPreset
    render inertia: "presets/form", props: { preset: nil, schema: RenderingPresenter.schema }
  end
  def create
    authorize RenderPreset
    RenderPreset.create!(preset_params.merge(user: current_user, system: false))
    redirect_to presets_path, notice: "Preset salvo.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(new_preset_path, error)
  end
  def edit
    preset = policy_scope(RenderPreset).find(params[:id])
    authorize preset, :update?
    render inertia: "presets/form", props: { preset: RenderingPresenter.preset(preset), schema: RenderingPresenter.schema }
  end
  def update
    preset = policy_scope(RenderPreset).find(params[:id])
    authorize preset
    preset.update!(preset_params)
    redirect_to presets_path, notice: "Preset atualizado.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(edit_preset_path(params[:id]), error)
  end
  def destroy
    preset = policy_scope(RenderPreset).find(params[:id])
    authorize preset
    preset.update!(deleted_at: Time.current)
    redirect_to presets_path, notice: "Preset removido; configurações anteriores preservadas.", status: :see_other
  end
  private
  def preset_params
    raw = params.require(:preset)
    raw.permit(:name, :description, :category).to_h.merge(settings: Rendering::Settings.validate!(settings_from(raw[:settings])))
  end
end
