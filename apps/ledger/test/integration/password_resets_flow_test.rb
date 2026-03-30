require "test_helper"

class PasswordResetsFlowTest < ActionDispatch::IntegrationTest
  setup do
    ActionMailer::Base.deliveries.clear

    @password = "password"
    @organizer_account = OrganizerAccount.create!(
      display_name: "Reset Flow Organizer",
      login_id: "reset-flow-admin",
      email: "reset-flow-admin@example.com",
      password: @password
    )
    @organizer_account.organizer_members.create!(
      display_name: "Owner User",
      role: "owner",
      active: true,
      admin_password: "1234"
    )
  end

  test "login screen has a link to the password reset form" do
    get new_session_path(locale: :ja)

    assert_response :success
    assert_select "a[href='#{new_password_reset_path(locale: :ja)}']", text: I18n.t("sessions.forgot_password", locale: :ja)
  end

  test "requesting a password reset sends a reset email for a known address" do
    post password_resets_path(locale: :ja), params: { email: @organizer_account.email.upcase }

    assert_redirected_to new_password_reset_path(locale: :ja)
    assert_equal I18n.t("flash.password_resets.sent", locale: :ja), flash[:notice]
    assert_equal 1, ActionMailer::Base.deliveries.size

    @organizer_account.reload
    assert @organizer_account.reset_password_token.present?
    assert @organizer_account.reset_token_valid?

    mail = ActionMailer::Base.deliveries.last
    assert_equal [@organizer_account.email], mail.to
    assert_includes mail.subject, I18n.t("password_resets.email.subject", locale: :ja)
    assert_includes mail.body.parts.map(&:decoded).join, "/ja/password_resets/#{@organizer_account.reset_password_token}/edit"
  end

  test "requesting a password reset still returns the generic response for an unknown address" do
    post password_resets_path(locale: :ja), params: { email: "missing@example.com" }

    assert_redirected_to new_password_reset_path(locale: :ja)
    assert_equal I18n.t("flash.password_resets.sent", locale: :ja), flash[:notice]
    assert_empty ActionMailer::Base.deliveries
  end

  test "visiting the edit page with an invalid token redirects back to the request form" do
    get edit_password_reset_path("missing-token", locale: :ja)

    assert_redirected_to new_password_reset_path(locale: :ja)
    assert_equal I18n.t("flash.password_resets.invalid_token", locale: :ja), flash[:alert]
  end

  test "visiting the edit page with an expired token redirects back to the request form" do
    token = @organizer_account.generate_reset_password_token!
    @organizer_account.update_column(:reset_password_sent_at, 3.hours.ago)

    get edit_password_reset_path(token, locale: :ja)

    assert_redirected_to new_password_reset_path(locale: :ja)
    assert_equal I18n.t("flash.password_resets.invalid_token", locale: :ja), flash[:alert]
  end

  test "updating the password with a valid token clears the token and allows login" do
    token = @organizer_account.generate_reset_password_token!

    patch password_reset_path(token, locale: :ja), params: { password: "new-password-123" }

    assert_redirected_to new_session_path(locale: :ja)
    assert_equal I18n.t("flash.password_resets.updated", locale: :ja), flash[:notice]

    @organizer_account.reload
    assert_nil @organizer_account.reset_password_token
    assert_nil @organizer_account.reset_password_sent_at
    assert @organizer_account.authenticate("new-password-123")
    assert_not @organizer_account.authenticate(@password)
  end

  test "updating the password with invalid input re-renders the form and keeps the token" do
    token = @organizer_account.generate_reset_password_token!

    patch password_reset_path(token, locale: :ja), params: { password: "" }

    assert_response :unprocessable_entity
    assert_equal I18n.t("flash.password_resets.invalid_password", locale: :ja), flash[:alert]

    @organizer_account.reload
    assert_equal token, @organizer_account.reset_password_token
    assert @organizer_account.reset_token_valid?
  end
end
