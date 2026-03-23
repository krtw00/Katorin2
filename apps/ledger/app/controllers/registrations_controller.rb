class RegistrationsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  def new
    return redirect_to(post_auth_redirect_path) if organizer_signed_in?

    @organizer_account = OrganizerAccount.new
  end

  def create
    @organizer_account = OrganizerAccount.new(registration_params)

    if @organizer_account.save
      start_session!(@organizer_account)
      redirect_to new_organizer_setup_path, notice: t("flash.registrations.created")
    else
      flash.now[:alert] = t("flash.registrations.invalid")
      render :new, status: :unprocessable_entity
    end
  end

  private

  def registration_params
    params.require(:organizer_account).permit(
      :display_name,
      :login_id,
      :email,
      :password
    )
  end
end
