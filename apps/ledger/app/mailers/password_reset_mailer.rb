class PasswordResetMailer < ApplicationMailer
  def reset_email(organizer_account, token)
    @organizer_account = organizer_account
    @reset_url = edit_password_reset_url(token:, locale: I18n.locale)

    mail(to: organizer_account.email, subject: I18n.t("password_resets.email.subject"))
  end
end
