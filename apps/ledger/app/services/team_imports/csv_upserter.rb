require "csv"

module TeamImports
  class CsvUpserter
    HEADERS = %w[
      team_name
      team_status
      team_notes
      member_name
      member_id
      member_position
      member_status
      member_notes
    ].freeze

    TEAM_STATUS_ALIASES = {
      "active" => "active",
      "enabled" => "active",
      "有効" => "active",
      "有効化" => "active",
      "inactive" => "inactive",
      "hidden" => "inactive",
      "非表示" => "inactive",
      "withdrawn" => "withdrawn",
      "dropped" => "withdrawn",
      "drop" => "withdrawn",
      "辞退" => "withdrawn",
      "ドロップ" => "withdrawn"
    }.freeze

    PARTICIPANT_STATUS_ALIASES = {
      "active" => "active",
      "enabled" => "active",
      "有効" => "active",
      "有効化" => "active",
      "inactive" => "inactive",
      "hidden" => "inactive",
      "非表示" => "inactive"
    }.freeze

    Result = Struct.new(
      :success?,
      :messages,
      :created_team_count,
      :updated_team_count,
      :created_participant_count,
      :updated_participant_count,
      keyword_init: true
    )

    TeamSpec = Struct.new(:display_name, :status, :notes, :members, keyword_init: true)
    MemberSpec = Struct.new(:display_name, :member_id, :position, :status, :notes, keyword_init: true)

    def self.headers_for(locale: I18n.locale)
      I18n.with_locale(locale) do
        HEADERS.map { |header| I18n.t("team_imports.template.headers.#{header}", default: header) }
      end
    end

    def self.sample_rows_for(locale: I18n.locale)
      locale.to_sym == :ja ? sample_rows_ja : sample_rows_en
    end

    def initialize(league:, upload:)
      @league = league
      @upload = upload
      @messages = []
      @created_team_count = 0
      @updated_team_count = 0
      @created_participant_count = 0
      @updated_participant_count = 0
    end

    def call
      team_specs = parse_team_specs
      return failure if messages.any?

      ActiveRecord::Base.transaction do
        upsert_team_specs(team_specs)
      end

      messages.any? ? failure : success
    rescue ActiveRecord::RecordInvalid => error
      messages << error_message(:record_invalid, detail: error.record.errors.full_messages.to_sentence)
      failure
    end

    private

    attr_reader :league, :upload, :messages

    def parse_team_specs
      table = CSV.parse(upload_contents.sub(/\A\uFEFF/, ""), headers: true)
      canonical_headers = canonical_headers_for(table.headers)
      validate_headers!(table.headers, canonical_headers)

      team_specs = {}

      table.each_with_index do |row, index|
        line_number = index + 2
        attributes = normalize_row(row, canonical_headers)
        next if attributes.values.all?(&:blank?)

        team_name = attributes.fetch("team_name")
        member_name = attributes.fetch("member_name")

        if team_name.blank?
          messages << error_message(:blank_team_name, line: line_number)
          next
        end

        if member_name.blank?
          messages << error_message(:blank_member_name, line: line_number)
          next
        end

        team_status = normalize_status(attributes.fetch("team_status"), TEAM_STATUS_ALIASES, :invalid_team_status, line_number)
        member_status = normalize_status(attributes.fetch("member_status"), PARTICIPANT_STATUS_ALIASES, :invalid_member_status, line_number)
        member_position = normalize_position(attributes.fetch("member_position"), line_number)

        team_spec = team_specs[team_name] ||= TeamSpec.new(display_name: team_name, members: {})
        merge_value(team_spec, :status, team_status, :conflicting_team_field, line_number, field: "team_status")
        merge_value(team_spec, :notes, attributes.fetch("team_notes"), :conflicting_team_field, line_number, field: "team_notes")

        member_spec = team_spec.members[member_name] ||= MemberSpec.new(display_name: member_name)
        merge_value(member_spec, :member_id, attributes.fetch("member_id"), :conflicting_member_field, line_number, field: "member_id", member_name:, team_name:)
        merge_value(member_spec, :position, member_position, :conflicting_member_field, line_number, field: "member_position", member_name:, team_name:)
        merge_value(member_spec, :status, member_status, :conflicting_member_field, line_number, field: "member_status", member_name:, team_name:)
        merge_value(member_spec, :notes, attributes.fetch("member_notes"), :conflicting_member_field, line_number, field: "member_notes", member_name:, team_name:)
      end

      team_specs
    end

    def upsert_team_specs(team_specs)
      team_specs.each_value do |team_spec|
        duplicate_teams = league.teams.where(display_name: team_spec.display_name)
        if duplicate_teams.count > 1
          messages << error_message(:ambiguous_team, team_name: team_spec.display_name)
          next
        end

        team = duplicate_teams.first || league.teams.new(display_name: team_spec.display_name)
        created = team.new_record?
        team_changed = false

        if team_spec.status.present? && team.status != team_spec.status
          team.status = team_spec.status
          team_changed = true
        elsif created && team.status.blank?
          team.status = "active"
        end

        if team_spec.notes.present? && team.notes != team_spec.notes
          team.notes = team_spec.notes
          team_changed = true
        end

        team.save! if created || team_changed
        @created_team_count += 1 if created
        @updated_team_count += 1 if !created && team_changed

        team_spec.members.each_value do |member_spec|
          duplicate_participants = team.participants.where(display_name: member_spec.display_name)
          if duplicate_participants.count > 1
            messages << error_message(:ambiguous_member, team_name: team.display_name, member_name: member_spec.display_name)
            next
          end

          participant = duplicate_participants.first || team.participants.new(display_name: member_spec.display_name)
          participant.league = league
          created_participant = participant.new_record?
          participant_changed = false

          if member_spec.position.present? && participant.position != member_spec.position
            participant.position = member_spec.position
            participant_changed = true
          end

          if member_spec.member_id.present? && participant.member_id != member_spec.member_id
            participant.member_id = member_spec.member_id
            participant_changed = true
          end

          if member_spec.status.present? && participant.status != member_spec.status
            participant.status = member_spec.status
            participant_changed = true
          elsif created_participant && participant.status.blank?
            participant.status = "active"
          end

          if member_spec.notes.present? && participant.notes != member_spec.notes
            participant.notes = member_spec.notes
            participant_changed = true
          end

          participant.save! if created_participant || participant_changed
          @created_participant_count += 1 if created_participant
          @updated_participant_count += 1 if !created_participant && participant_changed
        end
      end

      raise ActiveRecord::Rollback if messages.any?
    end

    def validate_headers!(headers, canonical_headers)
      normalized_headers = headers.map { |header| header.to_s.strip }
      missing_headers = HEADERS - canonical_headers.compact.uniq
      unknown_headers = normalized_headers.zip(canonical_headers).filter_map do |header, canonical_header|
        header if canonical_header.blank?
      end
      duplicate_headers = canonical_headers.compact.group_by(&:itself).filter_map do |header, values|
        header if values.size > 1
      end

      messages << error_message(:missing_headers, headers: missing_headers.map { |header| display_header_name(header) }.join(", ")) if missing_headers.any?
      messages << error_message(:unknown_headers, headers: unknown_headers.join(", ")) if unknown_headers.any?
      messages << error_message(:duplicate_headers, headers: duplicate_headers.map { |header| display_header_name(header) }.join(", ")) if duplicate_headers.any?
    end

    def canonical_headers_for(headers)
      headers.map { |header| canonical_header_for(header) }
    end

    def canonical_header_for(header)
      header_aliases[header.to_s.strip]
    end

    def header_aliases
      @header_aliases ||= begin
        aliases = HEADERS.index_by(&:itself)

        I18n.available_locales.each do |locale|
          self.class.headers_for(locale:).each_with_index do |localized_header, index|
            aliases[localized_header] = HEADERS[index]
          end
        end

        aliases
      end
    end

    def normalize_row(row, canonical_headers)
      attributes = HEADERS.index_with { nil }

      row.fields.each_with_index do |value, index|
        header = canonical_headers[index]
        next if header.blank?

        attributes[header] = header.end_with?("_notes") ? normalize_notes(value) : normalize_name(value)
      end

      attributes
    end

    def upload_contents
      contents =
        if upload.respond_to?(:read)
          upload.rewind if upload.respond_to?(:rewind)
          upload.read.to_s
        elsif upload.is_a?(String) && File.exist?(upload)
          File.binread(upload)
        else
          upload.to_s
        end

      contents.dup.force_encoding(Encoding::UTF_8).scrub
    end

    def normalize_name(value)
      value.to_s.tr("\u3000", " ").squish.presence
    end

    def normalize_notes(value)
      value.to_s.gsub(/\r\n?/, "\n").strip.presence
    end

    def display_header_name(header)
      I18n.t("team_imports.template.headers.#{header}", default: header)
    end

    def normalize_status(value, aliases, error_key, line_number)
      return nil if value.blank?

      normalized = aliases[normalize_name(value).to_s.downcase] || aliases[normalize_name(value).to_s]
      return normalized if normalized.present?

      messages << error_message(error_key, line: line_number, value:)
      nil
    end

    def normalize_position(value, line_number)
      return nil if value.blank?

      integer = Integer(value, exception: false)
      return integer if integer&.positive?

      messages << error_message(:invalid_member_position, line: line_number, value:)
      nil
    end

    def merge_value(record, field, value, error_key, line_number, **context)
      return if value.blank?

      current = record.public_send(field)
      if current.present? && current != value
        messages << error_message(error_key, line: line_number, field:, **context)
        return
      end

      record.public_send("#{field}=", value)
    end

    def error_message(key, **options)
      I18n.t("team_imports.errors.#{key}", **options)
    end

    def success
      Result.new(
        success?: true,
        messages: [],
        created_team_count: @created_team_count,
        updated_team_count: @updated_team_count,
        created_participant_count: @created_participant_count,
        updated_participant_count: @updated_participant_count
      )
    end

    def failure
      Result.new(
        success?: false,
        messages: messages.dup,
        created_team_count: 0,
        updated_team_count: 0,
        created_participant_count: 0,
        updated_participant_count: 0
      )
    end

    def self.sample_rows_ja
      [
        ["サンプルチームA", "有効", "テンプレート例", "山田 太郎", nil, 1, "有効", "リーダー"],
        ["サンプルチームA", "有効", "テンプレート例", "佐藤 花子", nil, 2, "非表示", "欠席予定"]
      ]
    end

    def self.sample_rows_en
      [
        ["Sample Team A", "active", "template example", "Taro Yamada", nil, 1, "active", "captain"],
        ["Sample Team A", "active", "template example", "Hanako Sato", nil, 2, "inactive", "absent"]
      ]
    end
  end
end
