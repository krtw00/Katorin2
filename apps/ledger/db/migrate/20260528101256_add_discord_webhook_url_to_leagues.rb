class AddDiscordWebhookUrlToLeagues < ActiveRecord::Migration[8.1]
  def change
    add_column :leagues, :discord_webhook_url, :string
  end
end
