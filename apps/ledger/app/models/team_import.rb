require "csv"

class TeamImport
  include ActiveModel::Model

  attr_accessor :league, :file
  attr_reader :result

  validates :league, presence: true
  validates :file, presence: true

  def save
    return false unless valid?

    @result = TeamImports::CsvUpserter.new(league:, upload: file).call
    return true if result.success?

    result.messages.each { |message| errors.add(:base, message) }
    false
  rescue CSV::MalformedCSVError
    errors.add(:base, I18n.t("team_imports.errors.invalid_csv"))
    false
  end

  def created_team_count
    result&.created_team_count.to_i
  end

  def updated_team_count
    result&.updated_team_count.to_i
  end

  def created_participant_count
    result&.created_participant_count.to_i
  end

  def updated_participant_count
    result&.updated_participant_count.to_i
  end

  def self.template_csv(locale: I18n.locale)
    CSV.generate do |csv|
      csv << TeamImports::CsvUpserter.headers_for(locale:)
      TeamImports::CsvUpserter.sample_rows_for(locale:).each do |row|
        csv << row
      end
    end
  end
end
