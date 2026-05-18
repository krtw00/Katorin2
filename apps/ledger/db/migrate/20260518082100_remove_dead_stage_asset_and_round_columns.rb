class RemoveDeadStageAssetAndRoundColumns < ActiveRecord::Migration[8.1]
  def change
    remove_column :rounds, :order_change_note, :text
    remove_column :stage_assets, :bracket_size, :integer
    remove_column :stage_assets, :round_count, :integer
    remove_column :stage_assets, :group_count, :integer
    remove_column :stage_assets, :advancement_value, :integer
  end
end
