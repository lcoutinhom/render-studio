class MaterialTexturesController < ApplicationController
  include DomainForms
  def create
    material = policy_scope(Material).find(params[:material_id])
    authorize material, :update?
    Materials::AttachTexture.call(material, slot: params.dig(:texture, :slot), upload: params.dig(:texture, :file))
    redirect_to material_path(material), notice: "Textura salva; a revisão anterior foi preservada.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(material_path(params[:material_id]), error)
  end
  def show
    material = policy_scope(Material).find(params[:material_id])
    authorize material, :show?
    texture = material.material_textures.find(params[:id])
    raise ActiveRecord::RecordNotFound unless texture.file.attached?
    blob = texture.file.blob
    response.headers["Content-Type"] = blob.content_type
    response.headers["Content-Length"] = blob.byte_size.to_s
    response.headers["Content-Disposition"] = ActionDispatch::Http::ContentDisposition.format(disposition: "inline", filename: blob.filename.to_s)
    response.headers["X-Content-Type-Options"] = "nosniff"
    self.response_body = Enumerator.new { |output| blob.download { |chunk| output << chunk } }
  end
  def destroy
    material = policy_scope(Material).find(params[:material_id])
    authorize material, :update?
    material.material_textures.current.find(params[:id]).update!(deleted_at: Time.current)
    redirect_to material_path(material), notice: "Textura removida do material; revisão preservada.", status: :see_other
  end
end
