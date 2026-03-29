ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: 1)
end

class ActionDispatch::IntegrationTest
  private

  def login_as!(organizer_account, password: "password", member: nil, admin_password: nil)
    post session_path(locale: :ja), params: {
      session: {
        login_id: organizer_account.login_id,
        password: password
      }
    }

    if organizer_account.organizer_members.exists?
      assert_redirected_to new_member_selection_path(locale: :ja)
      follow_redirect!
      assert_response :success

      target_member = member || organizer_account.organizer_members.active.order(:created_at).first
      member_password = admin_password || (target_member.owner? || target_member.admin? ? "1234" : nil)

      post member_selection_path(locale: :ja), params: {
        organizer_member_id: target_member.id,
        admin_password: member_password
      }
      assert_redirected_to dashboard_path(locale: :ja)
      follow_redirect!
      assert_response :success
    else
      assert_redirected_to new_organizer_setup_path(locale: :ja)
      follow_redirect!
      assert_response :success
    end
  end
end
