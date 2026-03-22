class AddGameWinsToBoardResults < ActiveRecord::Migration[8.1]
  def change
    add_column :board_results, :home_game_wins, :integer
    add_column :board_results, :away_game_wins, :integer
  end
end
