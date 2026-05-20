require "fileutils"

module MatchExports
  class ResultCardRenderer
    EXPORT_TYPE = "match_result_card".freeze
    RENDERER_KEY = "match_result_card_v2".freeze
    BROWSER_TIMEOUT = 30
    OUTPUT_DIR = Rails.root.join("public", "generated", "match_exports")

    def initialize(match)
      @match = match
    end

    def render!
      if fresh?
        return match.exports.find_by(export_type: EXPORT_TYPE)
      end

      FileUtils.mkdir_p(OUTPUT_DIR)

      layout = result_card_layout
      browser = Ferrum::Browser.new(
        headless: "new",
        browser_path: ENV["CHROMIUM_PATH"],
        window_size: [layout.width, layout.min_height],
        timeout: BROWSER_TIMEOUT,
        process_timeout: BROWSER_TIMEOUT,
        browser_options: {
          "no-sandbox" => nil,
          "disable-gpu" => nil,
          "disable-dev-shm-usage" => nil
        }
      )
      begin
        page = browser.create_page
        page.main_frame.set_content(layout.html_document)
        height = page.evaluate("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
        page.set_viewport(width: layout.width, height: [height.to_i, layout.min_height].max)
        page.screenshot(path: output_path.to_s, format: "png", full: true)
      ensure
        browser.quit
      end

      export = match.exports.find_or_initialize_by(export_type: EXPORT_TYPE)
      export.assign_attributes(
        league: match.league,
        renderer_key: RENDERER_KEY,
        status: "generated",
        generated_at: Time.current,
        file_path: public_file_path
      )
      export.save!
      export
    end

    def fresh_export_available?
      fresh?
    end

    private

    attr_reader :match

    def result_card_layout
      @result_card_layout ||=
        ::RuleModules::Registry.fetch(::RuleSets::Registry.default_key)
          .renderers.match_result_card.new(match)
    end

    def output_path
      OUTPUT_DIR.join("#{match.id}.png")
    end

    def public_file_path
      "/generated/match_exports/#{match.id}.png"
    end

    def fresh?
      return false unless output_path.exist?

      export = match.exports.find_by(export_type: EXPORT_TYPE)
      return false unless export&.generated_at

      last = last_source_change
      return true unless last

      export.generated_at >= last
    end

    def last_source_change
      [
        match.match_result&.updated_at,
        match.rounds.maximum(:updated_at),
        match.home_team&.icon&.attachment&.created_at,
        match.away_team&.icon&.attachment&.created_at
      ].compact.max
    end
  end
end
