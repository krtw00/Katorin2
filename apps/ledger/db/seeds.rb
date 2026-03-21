# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
DEMO_LEAGUE_SLUG = "demo-wmgp-season-8"

def seed_bootstrap_organizer!
  login_id = ENV.fetch("ORGANIZER_LOGIN_ID", "admin")
  password = ENV.fetch("ORGANIZER_PASSWORD", "password")
  email = ENV.fetch("ORGANIZER_EMAIL", "#{login_id}@katorin.local")
  display_name = ENV.fetch("ORGANIZER_DISPLAY_NAME", "WMGP運営")

  organizer = OrganizerAccount.find_or_initialize_by(login_id:)
  organizer.email = email
  organizer.display_name = display_name
  organizer.password = password
  organizer.password_confirmation = password
  organizer.save!

  organizer
end

def seed_demo_organizer!
  login_id = ENV.fetch("DEMO_ORGANIZER_LOGIN_ID", "admin")
  password = ENV.fetch("DEMO_ORGANIZER_PASSWORD", "demo")
  email = ENV.fetch("DEMO_ORGANIZER_EMAIL", "#{login_id}@katorin.local")
  display_name = ENV.fetch("DEMO_ORGANIZER_DISPLAY_NAME", "DEMO WMGP運営")

  existing_demo_league = League.find_by(slug: DEMO_LEAGUE_SLUG)
  organizer =
    OrganizerAccount.find_by(login_id:) ||
    existing_demo_league&.organizer_account ||
    OrganizerAccount.find_by(login_id: "demo") ||
    OrganizerAccount.find_by(email:) ||
    OrganizerAccount.new

  organizer.login_id = login_id
  organizer.email = email
  organizer.display_name = display_name
  organizer.password = password
  organizer.password_confirmation = password
  organizer.save!

  organizer
end

def seed_demo_ledger!
  organizer = seed_demo_organizer!

  league = League.find_or_initialize_by(slug: DEMO_LEAGUE_SLUG)
  league.organizer_account = organizer
  league.name = "DEMO WMGP Season 8"
  league.rule_module_key = "wmgp"
  league.status = "active"
  league.started_at = Date.new(2026, 4, 1)
  league.save!

  regular_phase = league.phases.find_or_initialize_by(name: "予選")
  regular_phase.kind = "regular_season"
  regular_phase.position = 1
  regular_phase.rule_module_key = "wmgp"
  regular_phase.ranking_rule_key = "wmgp_regular"
  regular_phase.bracket_enabled = false
  regular_phase.save!

  playoff_phase = league.phases.find_or_initialize_by(name: "決勝トーナメント")
  playoff_phase.kind = "playoff"
  playoff_phase.position = 2
  playoff_phase.rule_module_key = "wmgp"
  playoff_phase.ranking_rule_key = "wmgp_playoff"
  playoff_phase.bracket_enabled = true
  playoff_phase.save!

  block_a = league.blocks.find_or_initialize_by(phase: regular_phase, name: "Aブロック")
  block_a.position = 1
  block_a.save!

  block_b = league.blocks.find_or_initialize_by(phase: regular_phase, name: "Bブロック")
  block_b.position = 2
  block_b.save!

  team_specs = [
    [ "Astra", block_a ],
    [ "Basilica", block_a ],
    [ "Crimson", block_a ],
    [ "Dynamo", block_b ],
    [ "Eclipse", block_b ],
    [ "Forte", block_b ]
  ]

  teams = team_specs.map do |name, block|
    team = league.teams.find_or_initialize_by(name:)
    team.block = block
    team.display_name = name
    team.short_name = name.first(3).upcase
    team.status = "active"
    team.save!
    team
  end

  teams.each do |team|
    6.times do |index|
      participant = league.participants.find_or_initialize_by(team:, name: "#{team.name} Player #{index + 1}")
      participant.display_name = "#{team.name}-P#{index + 1}"
      participant.position = index + 1
      participant.status = "active"
      participant.save!
    end
  end

  week_1 = regular_phase.weeks.find_or_initialize_by(number: 1)
  week_1.league = league
  week_1.name = "Week 1"
  week_1.kind = "regular"
  week_1.position = 1
  week_1.save!

  week_2 = regular_phase.weeks.find_or_initialize_by(number: 2)
  week_2.league = league
  week_2.name = "Week 2"
  week_2.kind = "regular"
  week_2.position = 2
  week_2.save!

  final_week = playoff_phase.weeks.find_or_initialize_by(number: 1)
  final_week.league = league
  final_week.name = "Final Week"
  final_week.kind = "playoff"
  final_week.position = 1
  final_week.save!

  match_specs = [
    [ week_1, block_a, teams[0], teams[1], Date.new(2026, 4, 5), "21:00", "scheduled", "pending", nil, nil ],
    [ week_1, block_b, teams[3], teams[4], Date.new(2026, 4, 6), "21:30", "result_pending", "stale", nil, nil ],
    [ week_2, block_a, teams[1], teams[2], Date.new(2026, 4, 12), "22:00", "draft", "pending", nil, nil ],
    [ final_week, nil, teams[0], teams[3], Date.new(2026, 5, 2), "21:00", "draft", "pending", "semifinal", "SF-1" ]
  ]

  match_specs.each do |week, block, home_team, away_team, scheduled_on, scheduled_time, status, export_status, stage_key, bracket_slot|
    match = week.matches.find_or_initialize_by(home_team:, away_team:, stage_key:)
    match.league = league
    match.phase = week.phase
    match.block = block
    match.scheduled_on = scheduled_on
    match.scheduled_time = scheduled_time
    match.status = status
    match.export_status = export_status
    match.stage_key = stage_key
    match.bracket_slot = bracket_slot
    match.judge_name = "root"
    match.room_id = "room-#{home_team.short_name}-#{away_team.short_name}"
    match.spectator_room_id = "watch-#{home_team.short_name}-#{away_team.short_name}"
    match.save!
  end

  sample_match = week_1.matches.find_by(home_team: teams[3], away_team: teams[4])

  if sample_match
    result = sample_match.match_result || sample_match.build_match_result
    result.home_round_wins = 2
    result.away_round_wins = 1
    result.winner_team = teams[3]
    result.result_status = "confirmed"
    result.decision_type = "normal"
    result.confirmed_at = Time.current
    result.save!

    sample_match.rounds.destroy_all

    3.times do |index|
      round = sample_match.rounds.create!(
        number: index + 1,
        home_team: teams[3],
        away_team: teams[4],
        winner_team: index == 1 ? teams[4] : teams[3],
        result_status: "confirmed",
        ended_by: "normal"
      )

      3.times do |board_index|
        round.board_results.create!(
          board_number: board_index + 1,
          home_participant: teams[3].participants.order(:position)[board_index],
          away_participant: teams[4].participants.order(:position)[board_index],
          home_deck_name: "Deck #{board_index + 1}A",
          away_deck_name: "Deck #{board_index + 1}B",
          winner_side: board_index == 2 && index == 1 ? "away" : "home",
          result_status: "confirmed"
        )
      end
    end
  end

  puts "Seeded demo organizer: #{organizer.login_id}"
end

seed_profile = ENV.fetch("LEDGER_SEED_PROFILE", "blank")

case seed_profile
when "blank"
  puts "Seed profile blank: no records created"
when "bootstrap"
  organizer = seed_bootstrap_organizer!
  puts "Seeded organizer: #{organizer.login_id}"
when "demo"
  seed_demo_ledger!
else
  raise "Unknown LEDGER_SEED_PROFILE: #{seed_profile}"
end
