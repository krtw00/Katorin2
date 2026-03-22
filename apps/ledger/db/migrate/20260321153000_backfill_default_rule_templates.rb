require "json"

class BackfillDefaultRuleTemplates < ActiveRecord::Migration[8.1]
  class MigrationOrganizerAccount < ApplicationRecord
    self.table_name = "organizer_accounts"
  end

  class MigrationRuleTemplate < ApplicationRecord
    self.table_name = "rule_templates"
  end

  def up
    definition = JSON.parse(File.read(Rails.root.join("config/rulesets/wmgp.json")))

    MigrationOrganizerAccount.find_each do |account|
      template = MigrationRuleTemplate.find_or_initialize_by(organizer_account_id: account.id, key: definition.fetch("key"))
      next if template.persisted?

      template.name_ja = definition.dig("name", "ja").to_s
      template.name_en = definition.dig("name", "en").to_s
      template.description_ja = definition.dig("description", "ja").to_s
      template.description_en = definition.dig("description", "en").to_s
      template.definition = definition.except("key", "name", "description")
      template.active = true
      template.save!
    end
  end

  def down
    MigrationRuleTemplate.where(key: "wmgp").delete_all
  end
end
