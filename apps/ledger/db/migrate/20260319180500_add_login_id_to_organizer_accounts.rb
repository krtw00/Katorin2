class AddLoginIdToOrganizerAccounts < ActiveRecord::Migration[8.1]
  class MigrationOrganizerAccount < ApplicationRecord
    self.table_name = "organizer_accounts"
  end

  def up
    add_column :organizer_accounts, :login_id, :string

    MigrationOrganizerAccount.reset_column_information

    MigrationOrganizerAccount.find_each do |organizer_account|
      fallback_login_id =
        organizer_account.email.to_s.split("@").first.presence ||
        organizer_account.display_name.to_s.parameterize.presence ||
        organizer_account.id

      organizer_account.update_columns(login_id: fallback_login_id.downcase)
    end

    change_column_null :organizer_accounts, :login_id, false
    add_index :organizer_accounts, :login_id, unique: true
  end

  def down
    remove_index :organizer_accounts, :login_id
    remove_column :organizer_accounts, :login_id
  end
end
