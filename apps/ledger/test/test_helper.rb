ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: 1)
end

class ActionDispatch::IntegrationTest
  private

  def login_as!(organizer_account, password: "password")
    post session_path(locale: :ja), params: {
      session: {
        login_id: organizer_account.login_id,
        password: password
      }
    }

    expected_path = organizer_account.organizer_members.exists? ? dashboard_path(locale: :ja) : new_organizer_setup_path(locale: :ja)
    assert_redirected_to expected_path
    follow_redirect!
    assert_response :success
  end
end
