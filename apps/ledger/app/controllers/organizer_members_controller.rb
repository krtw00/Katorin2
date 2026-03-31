class OrganizerMembersController < ApplicationController
  before_action :admin_or_above!
  before_action :set_organizer_member, only: %i[edit update destroy]
  before_action :ensure_can_manage_member!, only: %i[edit update]
  before_action :owner_only!, only: :destroy

  def index
    @organizer_members = current_organizer_account.organizer_members.order(:created_at)
  end

  def new
    @organizer_member = current_organizer_account.organizer_members.new(active: true, role: "staff")
  end

  def create
    @organizer_member = current_organizer_account.organizer_members.new(organizer_member_params)

    if @organizer_member.save
      redirect_to organizer_members_path, notice: t("flash.organizer_members.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @organizer_member.update(organizer_member_params)
      redirect_to organizer_members_path, notice: t("flash.organizer_members.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    unless @organizer_member.destroyable?
      return redirect_to organizer_members_path, alert: t("flash.organizer_members.delete_blocked")
    end

    @organizer_member.destroy_for_management!
    redirect_to organizer_members_path, notice: t("flash.organizer_members.deleted")
  end

  private

  def set_organizer_member
    @organizer_member = current_organizer_account.organizer_members.find(params[:id])
  end

  def organizer_member_params
    permitted_params = params.require(:organizer_member).permit(:display_name, :role, :active, :notes, :admin_password)
    permitted_params[:role] = "staff" unless current_organizer_member.owner?
    permitted_params
  end

  def ensure_can_manage_member!
    return if current_organizer_member.owner?
    return if @organizer_member.staff?

    redirect_to organizer_members_path, alert: t("flash.authorization.denied")
  end
end
