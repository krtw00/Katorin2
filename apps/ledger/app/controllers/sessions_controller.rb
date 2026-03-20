class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  def new
  end

  def create
    identifier = session_params[:login_id].to_s.strip.downcase
    organizer_account =
      OrganizerAccount.find_by(login_id: identifier) ||
      OrganizerAccount.find_by(email: identifier)

    if organizer_account&.authenticate(session_params[:password].to_s)
      start_session!(organizer_account)
      redirect_to dashboard_path, notice: "ログインしました。"
    else
      flash.now[:alert] = "メールアドレスまたはパスワードが違います。"
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    terminate_session!
    redirect_to root_path, notice: "ログアウトしました。"
  end

  private

  def session_params
    source = params[:session].is_a?(ActionController::Parameters) ? params.require(:session) : params
    source.permit(:login_id, :password)
  end
end
