class AddScheduleTokenToTeams < ActiveRecord::Migration[8.1]
  def change
    add_column :teams, :schedule_token, :string
    add_column :teams, :schedule_token_generated_at, :datetime
    add_index :teams, :schedule_token, unique: true
  end
end
