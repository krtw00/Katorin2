class AddRulesetSnapshotToLeagues < ActiveRecord::Migration[8.1]
  def change
    add_column :leagues, :ruleset_snapshot, :json
  end
end
