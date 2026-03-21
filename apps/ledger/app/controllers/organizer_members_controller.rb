class OrganizerMembersController < ApplicationController
  before_action :set_organizer_member, only: %i[edit update]

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

  private

  def set_organizer_member
    @organizer_member = current_organizer_account.organizer_members.find(params[:id])
  end

  def organizer_member_params
    params.require(:organizer_member).permit(:display_name, :role, :active, :notes)
  end
end
