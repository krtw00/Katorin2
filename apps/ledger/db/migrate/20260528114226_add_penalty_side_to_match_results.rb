class AddPenaltySideToMatchResults < ActiveRecord::Migration[8.1]
  def change
    add_column :match_results, :penalty_side, :string
    add_check_constraint :match_results,
      "penalty_side IS NULL OR penalty_side IN ('home', 'away')",
      name: "match_results_penalty_side_inclusion"
  end
end
