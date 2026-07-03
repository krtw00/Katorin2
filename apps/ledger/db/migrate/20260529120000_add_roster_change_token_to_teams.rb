class AddRosterChangeTokenToTeams < ActiveRecord::Migration[8.1]
  def change
    add_column :teams, :roster_change_token, :string
    add_column :teams, :roster_change_token_generated_at, :datetime
    add_index :teams, :roster_change_token, unique: true
  end
end
