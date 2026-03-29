class MemberSelectionsController < ApplicationController
  skip_before_action :require_member_selection

  def new
    load_members
  end

  def create
    @member = current_organizer_account.organizer_members.active.find(params[:organizer_member_id])

    if admin_password_valid?(@member)
      select_member!(@member)
      redirect_to dashboard_path, notice: t("flash.member_selections.selected")
    else
      load_members
      flash.now[:alert] = t("member_selections.invalid_password")
      render :new, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    load_members
    flash.now[:alert] = t("member_selections.member_not_found")
    render :new, status: :unprocessable_entity
  end

  private

  def load_members
    @members = current_organizer_account.organizer_members.active.order(:created_at)
  end

  def admin_password_valid?(member)
    return true unless member.owner? || member.admin?

    member.authenticate_admin_password(params[:admin_password].to_s)
  end
end
