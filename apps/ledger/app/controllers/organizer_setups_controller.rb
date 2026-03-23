class OrganizerSetupsController < ApplicationController
  def new
    return redirect_to dashboard_path unless organizer_setup_required?

    @organizer_member = current_organizer_account.organizer_members.new(role: "owner", active: true)
  end

  def create
    return redirect_to dashboard_path unless organizer_setup_required?

    @organizer_member = current_organizer_account.organizer_members.new(setup_params.merge(role: "owner", active: true))

    if @organizer_member.save
      redirect_to dashboard_path, notice: t("flash.organizer_setup.completed")
    else
      flash.now[:alert] = t("flash.organizer_setup.invalid")
      render :new, status: :unprocessable_entity
    end
  end

  private

  def setup_params
    params.require(:organizer_member).permit(:display_name, :admin_password)
  end
end
