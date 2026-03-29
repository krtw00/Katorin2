require "test_helper"

class MemberSelectionFlowTest < ActionDispatch::IntegrationTest
  setup do
    @password = "password"
    @organizer_account = OrganizerAccount.create!(
      display_name: "Member Selection Organizer",
      login_id: "member-selection-admin",
      email: "member-selection-admin@example.com",
      password: @password
    )
    @owner = @organizer_account.organizer_members.create!(
      display_name: "Owner User",
      role: "owner",
      active: true,
      admin_password: "1234"
    )
    @staff = @organizer_account.organizer_members.create!(
      display_name: "Staff User",
      role: "staff",
      active: true
    )
  end

  test "member selection page renders stimulus hooks and hidden password field" do
    post session_path(locale: :ja), params: {
      session: {
        login_id: @organizer_account.login_id,
        password: @password
      }
    }

    assert_redirected_to new_member_selection_path(locale: :ja)
    follow_redirect!
    assert_response :success

    assert_select "form.login-form[data-controller='member-selection']" do
      assert_select "select[data-member-selection-target='select'][data-action='change->member-selection#toggle']" do
        assert_select "option[value='']", 1
        assert_select "option[value='#{@owner.id}'][data-privileged='true']", text: /Owner User/
        assert_select "option[value='#{@staff.id}']", text: /Staff User/
      end

      assert_select "div.login-form__row[data-member-selection-target='passwordField'][hidden]", 1 do
        assert_select "input[type='password'][name='admin_password']"
      end

      assert_select "input[type='submit'][data-member-selection-target='submit'][disabled]"
    end
  end
end
