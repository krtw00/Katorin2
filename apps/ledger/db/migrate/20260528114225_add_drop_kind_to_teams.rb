class AddDropKindToTeams < ActiveRecord::Migration[8.1]
  def change
    add_column :teams, :drop_kind, :string
    add_check_constraint :teams,
      "drop_kind IS NULL OR drop_kind IN ('forced', 'voluntary')",
      name: "teams_drop_kind_inclusion"
  end
end
