class AddRosterConfigToLeagues < ActiveRecord::Migration[8.1]
  def change
    add_column :leagues, :roster_min_members, :integer, null: false, default: 6
    add_column :leagues, :roster_max_members, :integer, null: false, default: 15
    add_column :leagues, :lineup_size, :integer, null: false, default: 3
    add_column :leagues, :substitute_size, :integer, null: false, default: 1
  end
end
