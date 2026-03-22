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

    assert_redirected_to dashboard_path(locale: :ja)
    follow_redirect!
    assert_response :success
  end
end
