require "fileutils"

module StandingsExports
  class TableRenderer
    BROWSER_TIMEOUT = 30
    OUTPUT_DIR = Rails.root.join("public", "generated", "standings_exports")

    def initialize(phase, standings_by_block, blocks)
      @phase = phase
      @standings_by_block = standings_by_block
      @blocks = blocks
    end

    def render!
      return output_path if fresh?

      FileUtils.mkdir_p(OUTPUT_DIR)

      layout = standings_table_layout
      browser = Ferrum::Browser.new(
        headless: "new",
        browser_path: ENV["CHROMIUM_PATH"],
        window_size: [layout.width, 800],
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
        height = page.evaluate("document.documentElement.scrollHeight")
        page.set_viewport(width: layout.width, height: height)
        page.screenshot(path: output_path.to_s, format: "png", full: true)
      ensure
        browser.quit
      end

      output_path
    end

    private

    def standings_table_layout
      @standings_table_layout ||=
        ::RuleModules::Registry.default
          .renderers.standings_table.new(@standings_by_block, @blocks)
    end

    def output_path
      OUTPUT_DIR.join("#{@phase.id}.png")
    end

    def fresh?
      return false unless output_path.exist?

      last_result_at = @phase.matches.joins(:match_result)
        .maximum("match_results.updated_at")
      return true unless last_result_at

      output_path.mtime >= last_result_at
    end
  end
end
