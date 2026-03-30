class AddPasswordResetToOrganizerAccounts < ActiveRecord::Migration[8.1]
  def change
    add_column :organizer_accounts, :reset_password_token, :string
    add_column :organizer_accounts, :reset_password_sent_at, :datetime

    add_index :organizer_accounts, :reset_password_token, unique: true
  end
end
