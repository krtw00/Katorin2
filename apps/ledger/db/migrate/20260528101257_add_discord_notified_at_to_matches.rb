class AddDiscordNotifiedAtToMatches < ActiveRecord::Migration[8.1]
  def change
    add_column :matches, :discord_notified_at, :datetime
  end
end
