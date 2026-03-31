require 'test_helper'

class OrganizerMembersFlowTest < ActionDispatch::IntegrationTest
  setup do
    @password = "password"
    @organizer_account = OrganizerAccount.create!(
      display_name: "Members Flow Organizer",
      login_id: "members-test-admin",
      email: "members-test-admin@example.com",
      password: @password
    )
    @owner = @organizer_account.organizer_members.create!(
      display_name: "Owner",
      role: "owner",
      active: true,
      admin_password: "1234"
    )
    @admin = @organizer_account.organizer_members.create!(
      display_name: "Admin",
      role: "admin",
      active: true,
      admin_password: "1234"
    )
    @staff = @organizer_account.organizer_members.create!(
      display_name: "Staff",
      role: "staff",
      active: true
    )
  end

  test 'owner can list members' do
    login_as!(@organizer_account, password: @password, member: @owner)

    get organizer_members_path(locale: :ja)

    assert_response :success
  end

  test 'owner can create staff member' do
    login_as!(@organizer_account, password: @password, member: @owner)

    get new_organizer_member_path(locale: :ja)
    assert_response :success

    assert_difference("OrganizerMember.count", 1) do
      post organizer_members_path(locale: :ja), params: {
        organizer_member: {
          display_name: "New Staff",
          role: "staff",
          active: true,
          notes: "created by owner"
        }
      }
    end

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success

    member = @organizer_account.organizer_members.find_by!(display_name: "New Staff")
    assert_equal "staff", member.role
  end

  test 'owner can create admin member' do
    login_as!(@organizer_account, password: @password, member: @owner)

    assert_difference("OrganizerMember.count", 1) do
      post organizer_members_path(locale: :ja), params: {
        organizer_member: {
          display_name: "New Admin",
          role: "admin",
          active: true,
          notes: "created by owner",
          admin_password: "5678"
        }
      }
    end

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success

    member = @organizer_account.organizer_members.find_by!(display_name: "New Admin")
    assert_equal "admin", member.role
    assert member.admin_password_configured?
  end

  test 'owner can edit admin member' do
    login_as!(@organizer_account, password: @password, member: @owner)

    get edit_organizer_member_path(locale: :ja, id: @admin)
    assert_response :success

    patch organizer_member_path(locale: :ja, id: @admin), params: {
      organizer_member: {
        display_name: "Admin Updated",
        role: @admin.role,
        active: @admin.active,
        notes: @admin.notes
      }
    }

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success

    assert_equal "Admin Updated", @admin.reload.display_name
  end

  test 'owner can delete staff member' do
    login_as!(@organizer_account, password: @password, member: @owner)

    assert_difference("OrganizerMember.count", -1) do
      delete organizer_member_path(locale: :ja, id: @staff), headers: {
        "HTTP_REFERER" => organizer_members_path(locale: :ja)
      }
    end

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success
  end

  test 'admin can list members' do
    login_as!(@organizer_account, password: @password, member: @admin)

    get organizer_members_path(locale: :ja)

    assert_response :success
  end

  test 'admin can create staff member' do
    login_as!(@organizer_account, password: @password, member: @admin)

    assert_difference("OrganizerMember.count", 1) do
      post organizer_members_path(locale: :ja), params: {
        organizer_member: {
          display_name: "Admin Created Staff",
          role: "staff",
          active: true,
          notes: "created by admin"
        }
      }
    end

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success

    member = @organizer_account.organizer_members.find_by!(display_name: "Admin Created Staff")
    assert_equal "staff", member.role
  end

  test 'admin cannot create admin member' do
    login_as!(@organizer_account, password: @password, member: @admin)

    assert_difference("OrganizerMember.count", 1) do
      post organizer_members_path(locale: :ja), params: {
        organizer_member: {
          display_name: "Attempted Admin",
          role: "admin",
          active: true,
          notes: "forced to staff",
          admin_password: "5678"
        }
      }
    end

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success

    member = @organizer_account.organizer_members.find_by!(display_name: "Attempted Admin")
    assert_equal "staff", member.reload.role
  end

  test 'admin can edit staff member' do
    login_as!(@organizer_account, password: @password, member: @admin)

    patch organizer_member_path(locale: :ja, id: @staff), params: {
      organizer_member: {
        display_name: "Staff Updated",
        role: "staff",
        active: true,
        notes: @staff.notes
      }
    }

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success

    assert_equal "Staff Updated", @staff.reload.display_name
  end

  test 'admin cannot edit admin member' do
    other_admin = @organizer_account.organizer_members.create!(
      display_name: "Admin Two",
      role: "admin",
      active: true,
      admin_password: "1234"
    )
    login_as!(@organizer_account, password: @password, member: @admin)

    get edit_organizer_member_path(locale: :ja, id: other_admin)

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success
  end

  test 'admin cannot edit owner member' do
    login_as!(@organizer_account, password: @password, member: @admin)

    get edit_organizer_member_path(locale: :ja, id: @owner)

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success
  end

  test 'admin cannot delete staff member' do
    login_as!(@organizer_account, password: @password, member: @admin)

    assert_no_difference("OrganizerMember.count") do
      delete organizer_member_path(locale: :ja, id: @staff), headers: {
        "HTTP_REFERER" => organizer_members_path(locale: :ja)
      }
    end

    assert_redirected_to organizer_members_path(locale: :ja)
    follow_redirect!
    assert_response :success
  end

  test 'staff cannot access member list' do
    login_as!(@organizer_account, password: @password, member: @staff)

    get organizer_members_path(locale: :ja), headers: {
      "HTTP_REFERER" => dashboard_path(locale: :ja)
    }

    assert_redirected_to dashboard_path(locale: :ja)
    follow_redirect!
    assert_response :success
  end
end
