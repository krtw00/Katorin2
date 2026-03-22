class AddAdminPasswordDigestToOrganizerMembers < ActiveRecord::Migration[8.1]
  def up
    add_column :organizer_members, :admin_password_digest, :string

    execute <<~SQL.squish
      UPDATE organizer_members
      SET admin_password_digest = organizer_accounts.password_digest
      FROM organizer_accounts
      WHERE organizer_members.organizer_account_id = organizer_accounts.id
        AND organizer_members.role IN ('owner', 'admin')
        AND organizer_members.admin_password_digest IS NULL
    SQL
  end

  def down
    remove_column :organizer_members, :admin_password_digest, :string
  end
end
