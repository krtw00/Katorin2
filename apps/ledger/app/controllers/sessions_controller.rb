class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  def new
    return redirect_to dashboard_path if organizer_signed_in?
  end

  def create
    identifier = session_params[:login_id].to_s.strip.downcase
    organizer_account =
      OrganizerAccount.find_by(login_id: identifier) ||
      OrganizerAccount.find_by(email: identifier)

    if organizer_account&.authenticate(session_params[:password].to_s)
      start_session!(organizer_account)
      redirect_to dashboard_path, notice: t("flash.sessions.created")
    else
      flash.now[:alert] = t("flash.sessions.invalid")
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    terminate_session!
    redirect_to root_path, notice: t("flash.sessions.destroyed")
  end

  private

  def session_params
    source = params[:session].is_a?(ActionController::Parameters) ? params.require(:session) : params
    source.permit(:login_id, :password)
  end
end
