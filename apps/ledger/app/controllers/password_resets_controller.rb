class PasswordResetsController < ApplicationController
  allow_unauthenticated_access
  skip_before_action :require_member_selection
  before_action :set_token, only: %i[edit update]
  before_action :set_organizer_account, only: %i[edit update]

  def new
  end

  def create
    organizer_account = OrganizerAccount.find_by(email: normalized_email)

    if organizer_account.present?
      token = organizer_account.generate_reset_password_token!
      PasswordResetMailer.reset_email(organizer_account, token).deliver_now
    end

    redirect_to new_password_reset_path, notice: t("flash.password_resets.sent")
  end

  def edit
    redirect_with_invalid_token unless valid_reset_request?
  end

  def update
    return redirect_with_invalid_token unless valid_reset_request?

    new_password = password_reset_params[:password].to_s
    if new_password.blank?
      flash.now[:alert] = t("flash.password_resets.invalid_password")
      return render :edit, status: :unprocessable_entity
    end

    @organizer_account.reset_password!(new_password)
    redirect_to new_session_path, notice: t("flash.password_resets.updated")
  rescue ActiveRecord::RecordInvalid
    flash.now[:alert] = t("flash.password_resets.invalid_password")
    render :edit, status: :unprocessable_entity
  end

  private

  def password_reset_params
    source = params[:password_reset].is_a?(ActionController::Parameters) ? params.require(:password_reset) : params
    source.permit(:email, :password)
  end

  def normalized_email
    password_reset_params[:email].to_s.strip.downcase
  end

  def set_token
    @token = params[:token].to_s
  end

  def set_organizer_account
    @organizer_account = OrganizerAccount.find_by_reset_token(@token)
  end

  def valid_reset_request?
    @organizer_account&.reset_token_valid?
  end

  def redirect_with_invalid_token
    redirect_to new_password_reset_path, alert: t("flash.password_resets.invalid_token")
  end
end
