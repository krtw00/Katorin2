module MatchExports
  class ResultCardExportManager
    def initialize(match)
      @match = match
      @renderer = ResultCardRenderer.new(match)
    end

    def state
      return :generated if downloadable_export.present?
      return :pending if export&.pending?
      return :stale if export&.stale? || export&.generated?

      :missing
    end

    def downloadable_export
      return unless renderer.fresh_export_available?

      export
    end

    def enqueue_refresh!
      export_record = match.exports.find_or_initialize_by(export_type: ResultCardRenderer::EXPORT_TYPE)
      return export_record if export_already_queued?(export_record)

      file_available = export_file_available?(export_record)

      export_record.assign_attributes(
        league: match.league,
        renderer_key: ResultCardRenderer::RENDERER_KEY,
        status: file_available ? "stale" : "pending"
      )

      unless file_available
        export_record.file_path = nil
        export_record.generated_at = nil
      end

      export_record.save!
      GenerateResultCardJob.perform_later(match.id)
      export_record
    end

    private

    attr_reader :match, :renderer

    def export
      match.exports.find_by(export_type: ResultCardRenderer::EXPORT_TYPE)
    end

    def export_already_queued?(export_record)
      return false unless export_record.persisted?
      return false unless export_record.pending? || export_record.stale?

      latest_change = latest_change_at
      return true if latest_change.blank?

      export_record.updated_at.present? && export_record.updated_at >= latest_change
    end

    def latest_change_at
      [
        match.match_result&.updated_at,
        match.rounds.maximum(:updated_at)
      ].compact.max
    end

    def export_file_available?(export_record)
      file_path = export_record.file_path.presence
      return false unless file_path

      Rails.root.join("public", file_path.delete_prefix("/")).exist?
    end
  end
end
