require "test_helper"

class MatchExports::DiscordNotificationServiceTest < ActiveSupport::TestCase
  WEBHOOK_URL = "https://discord.com/api/webhooks/123456789012345678/abcdef-GHIJKL_mnopqr".freeze

  test "POSTs multipart and stamps notified_at on success" do
    match = build_confirmed_match!(webhook_url: WEBHOOK_URL)
    stub_request(:post, WEBHOOK_URL)
      .with(headers: { "Content-Type" => /\Amultipart\/form-data; boundary=/ })
      .to_return(status: 204, body: "")

    result = MatchExports::DiscordNotificationService.new(match.reload).notify

    assert_equal :success, result
    assert_not_nil match.reload.discord_notified_at
    assert_requested :post, WEBHOOK_URL do |req|
      req.body.include?(%(name="files[0]"; filename="match-#{match.id}.png")) &&
        req.body.include?(%(name="payload_json"))
    end
  end

  test "skips when match not eligible (already notified)" do
    match = build_confirmed_match!(webhook_url: WEBHOOK_URL)
    match.update!(discord_notified_at: Time.current)

    result = MatchExports::DiscordNotificationService.new(match.reload).notify

    assert_equal :skipped, result
    assert_not_requested :post, WEBHOOK_URL
  end

  test "skips when league webhook URL is blank" do
    match = build_confirmed_match!(webhook_url: nil)

    result = MatchExports::DiscordNotificationService.new(match.reload).notify

    assert_equal :skipped, result
    assert_nil match.reload.discord_notified_at
  end

  test "skips when image file is missing" do
    match = build_confirmed_match!(webhook_url: WEBHOOK_URL, with_export_file: false)

    result = MatchExports::DiscordNotificationService.new(match.reload).notify

    assert_equal :skipped, result
    assert_nil match.reload.discord_notified_at
  end

  test "raises TransientError on 5xx" do
    match = build_confirmed_match!(webhook_url: WEBHOOK_URL)
    stub_request(:post, WEBHOOK_URL).to_return(status: 503, body: "service unavailable")

    assert_raises(MatchExports::DiscordNotificationService::TransientError) do
      MatchExports::DiscordNotificationService.new(match.reload).notify
    end
    assert_nil match.reload.discord_notified_at
  end

  test "raises TransientError on 429 rate limit" do
    match = build_confirmed_match!(webhook_url: WEBHOOK_URL)
    stub_request(:post, WEBHOOK_URL).to_return(status: 429, body: %({"retry_after": 1.0}))

    assert_raises(MatchExports::DiscordNotificationService::TransientError) do
      MatchExports::DiscordNotificationService.new(match.reload).notify
    end
  end

  test "returns :failed_permanent on 4xx without stamping notified_at" do
    match = build_confirmed_match!(webhook_url: WEBHOOK_URL)
    stub_request(:post, WEBHOOK_URL).to_return(status: 404, body: "unknown webhook")

    result = MatchExports::DiscordNotificationService.new(match.reload).notify

    assert_equal :failed_permanent, result
    assert_nil match.reload.discord_notified_at
  end

  test "raises TransientError on network error" do
    match = build_confirmed_match!(webhook_url: WEBHOOK_URL)
    stub_request(:post, WEBHOOK_URL).to_raise(Net::ReadTimeout)

    assert_raises(MatchExports::DiscordNotificationService::TransientError) do
      MatchExports::DiscordNotificationService.new(match.reload).notify
    end
  end

  private

  def build_confirmed_match!(webhook_url:, with_export_file: true)
    organizer = OrganizerAccount.create!(
      display_name: "Discord Test Organizer",
      login_id: "discord-org-#{SecureRandom.hex(4)}",
      email: "discord-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Discord League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1,
      discord_webhook_url: webhook_url
    )
    phase = league.phases.create!(name: "予選 1", position: 1, rule_module_key: "wmgp")
    week = phase.weeks.create!(league: league, number: 1, position: 1)
    home_team = league.teams.create!(display_name: "Home #{SecureRandom.hex(2)}")
    away_team = league.teams.create!(display_name: "Away #{SecureRandom.hex(2)}")

    match = week.matches.create!(
      league: league,
      phase: phase,
      home_team: home_team,
      away_team: away_team,
      scheduled_on: Date.new(2026, 4, 11),
      scheduled_time: Time.zone.parse("20:00"),
      status: "confirmed"
    )
    match.create_match_result!(
      home_round_wins: 2,
      away_round_wins: 0,
      result_status: "confirmed",
      decision_type: "normal",
      winner_team: home_team,
      confirmed_at: Time.current
    )

    if with_export_file
      file_dir = MatchExports::ResultCardRenderer::OUTPUT_DIR
      FileUtils.mkdir_p(file_dir)
      file_abs_path = file_dir.join("#{match.id}.png")
      File.binwrite(file_abs_path, "\x89PNG\r\n\x1A\n" + "fake-png-bytes")

      match.exports.create!(
        league: league,
        export_type: MatchExports::ResultCardRenderer::EXPORT_TYPE,
        renderer_key: MatchExports::ResultCardRenderer::RENDERER_KEY,
        status: "generated",
        generated_at: Time.current,
        file_path: "/generated/match_exports/#{match.id}.png"
      )
    end

    match
  end
end
