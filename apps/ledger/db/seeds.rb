# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
require "json"

DEMO_ROSTER_PATH = Rails.root.join("db/demo/wmgp_playoff_team_rosters.json")
DEMO_LEAGUE_SLUGS = %w[
  demo-wmgp-season-5
  demo-wmgp-season-7
  demo-wmgp-season-7-5
  demo-wmgp-season-8
].freeze
DEMO_LEAGUE_SPECS = [
  {
    season_label: "7.5",
    seed_key: 75,
    slug: "demo-wmgp-season-7-5",
    team_count: 32,
    block_count: 4,
    started_at: Date.new(2025, 4, 7),
    ended_at: Date.new(2025, 6, 22),
  }
].freeze
JUDGE_NAMES = %w[root alpha beta gamma].freeze

def seed_bootstrap_organizer!
  login_id = ENV.fetch("ORGANIZER_LOGIN_ID", "admin")
  password = ENV.fetch("ORGANIZER_PASSWORD", "password")
  email = ENV.fetch("ORGANIZER_EMAIL", "#{login_id}@katorin.local")
  display_name = ENV.fetch("ORGANIZER_DISPLAY_NAME", "WMGP運営")

  organizer = OrganizerAccount.find_or_initialize_by(login_id:)
  organizer.email = email
  organizer.display_name = display_name
  organizer.password = password
  organizer.save!
  organizer.organizer_members.find_or_create_by!(display_name: display_name) do |member|
    member.role = "owner"
    member.active = true
    member.admin_password = password
  end
  organizer.ensure_default_rule_templates!

  organizer
end

def seed_demo_organizer!
  login_id = ENV.fetch("DEMO_ORGANIZER_LOGIN_ID", "admin")
  password = ENV.fetch("DEMO_ORGANIZER_PASSWORD", "demo")
  email = ENV.fetch("DEMO_ORGANIZER_EMAIL", "#{login_id}@katorin.local")
  display_name = ENV.fetch("DEMO_ORGANIZER_DISPLAY_NAME", "DEMO WMGP運営")

  organizer =
    OrganizerAccount.find_by(login_id:) ||
    League.where(slug: DEMO_LEAGUE_SLUGS).order(:created_at).first&.organizer_account ||
    OrganizerAccount.find_by(email:) ||
    OrganizerAccount.new

  organizer.login_id = login_id
  organizer.email = email
  organizer.display_name = display_name
  organizer.password = password
  organizer.save!
  organizer.organizer_members.find_or_create_by!(display_name: display_name) do |member|
    member.role = "owner"
    member.active = true
    member.admin_password = password
  end
  organizer.ensure_default_rule_templates!

  organizer
end

def load_demo_rosters!
  JSON.parse(File.read(DEMO_ROSTER_PATH))
end

def destroy_demo_league!(league)
  league.exports.destroy_all
  league.matches.destroy_all
  league.participants.destroy_all
  league.teams.destroy_all
  league.blocks.destroy_all
  league.weeks.destroy_all
  league.phases.destroy_all
  league.destroy!
end

def sanitize_slug(value)
  value.to_s.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-+|-+\z/, "").presence || "team"
end

def normalize_demo_participant_name(value)
  value
    .to_s
    .gsub(/\A[[:alnum:]!]{1,8}\s*\|\s*/, "")
    .gsub(/\s+/, " ")
    .gsub(/\A!+\s+/, "")
    .strip
end

def demo_participant_notes(raw_name:, normalized_name:, mdids:)
  notes = []
  notes << "Raw: #{raw_name}" if normalized_name != raw_name
  notes << "MDID: #{mdids.join(', ')}" if mdids.present?
  notes.join(" / ").presence
end

def demo_participant_display_name(team:, normalized_name:, player_index:)
  base_name = normalized_name.presence || "Player #{player_index + 1}"
  candidate = base_name
  suffix = 2

  while team.participants.where(display_name: candidate).exists?
    candidate = "#{base_name} #{suffix}"
    suffix += 1
  end

  candidate
end

def selected_rosters_for(spec, rosters)
  return rosters if spec[:team_count] >= rosters.size

  rosters.rotate(spec[:seed_key]).first(spec[:team_count])
end

def round_robin_schedule(teams)
  pool = teams.dup
  pool << nil if pool.size.odd?

  rounds = []
  rotating = pool.dup

  (pool.size - 1).times do |round_index|
    pairs = []
    half = rotating.size / 2

    half.times do |index|
      home_team = rotating[index]
      away_team = rotating[-(index + 1)]
      next if home_team.nil? || away_team.nil?

      pairing = round_index.even? ? [home_team, away_team] : [away_team, home_team]
      pairs << pairing
    end

    rounds << pairs
    rotating = [rotating.first] + [rotating.last] + rotating[1...-1]
  end

  rounds
end

def sample_lineup(team, random)
  roster = team.participants.order(:position).to_a
  roster.sample(3, random:)
end

def simulate_match_score(random, favored_side: nil)
  edge =
    case favored_side
    when :home then 0.6
    when :away then 0.4
    else 0.5
    end

  round_winners = []
  home_round_wins = 0
  away_round_wins = 0

  until home_round_wins == 2 || away_round_wins == 2
    home_won_round = random.rand < edge
    round_winners << (home_won_round ? :home : :away)
    home_round_wins += 1 if home_won_round
    away_round_wins += 1 unless home_won_round
  end

  [home_round_wins, away_round_wins, round_winners]
end

def board_winner_sides(round_winner_side, random)
  losing_side = round_winner_side == :home ? :away : :home
  pattern =
    case random.rand(3)
    when 0 then [round_winner_side, round_winner_side, losing_side]
    when 1 then [round_winner_side, losing_side, round_winner_side]
    else [losing_side, round_winner_side, round_winner_side]
    end

  pattern.shuffle(random:)
end

def create_completed_match!(week:, home_team:, away_team:, random:, block: nil, stage_key: nil, bracket_slot: nil, scheduled_on:, scheduled_time:, judge_name:)
  match = week.matches.create!(
    league: week.league,
    phase: week.phase,
    block:,
    home_team:,
    away_team:,
    stage_key:,
    bracket_slot:,
    scheduled_on:,
    scheduled_time:,
    status: "confirmed",
    judge_name:,
    room_id: "#{week.league.slug}-#{home_team.short_name}-#{away_team.short_name}",
    spectator_room_id: "watch-#{home_team.short_name}-#{away_team.short_name}",
    notes: "Seeded complete demo match"
  )

  favored_side = random.rand < 0.5 ? :home : :away
  home_round_wins, away_round_wins, round_winners = simulate_match_score(random, favored_side:)
  winner_team = home_round_wins > away_round_wins ? home_team : away_team
  home_board_wins = 0
  away_board_wins = 0

  round_winners.each_with_index do |round_winner_side, index|
    round = match.rounds.create!(
      number: index + 1,
      home_team:,
      away_team:,
      winner_team: round_winner_side == :home ? home_team : away_team,
      result_status: "confirmed",
      ended_by: "normal"
    )

    home_lineup = sample_lineup(home_team, random)
    away_lineup = sample_lineup(away_team, random)

    board_winner_sides(round_winner_side, random).each_with_index do |winner_side, board_index|
      home_game_wins, away_game_wins =
        if winner_side == :home
          random.rand < 0.5 ? [2, 0] : [2, 1]
        else
          random.rand < 0.5 ? [0, 2] : [1, 2]
        end

      round.board_results.create!(
        board_number: board_index + 1,
        home_participant: home_lineup[board_index],
        away_participant: away_lineup[board_index],
        home_deck_name: "Deck #{board_index + 1}A",
        away_deck_name: "Deck #{board_index + 1}B",
        home_game_wins: home_game_wins,
        away_game_wins: away_game_wins,
        winner_side: winner_side.to_s,
        result_status: "confirmed"
      )

      if winner_side == :home
        home_board_wins += 1
      else
        away_board_wins += 1
      end
    end
  end

  match.create_match_result!(
    home_round_wins:,
    away_round_wins:,
    winner_team:,
    result_status: "confirmed",
    decision_type: "normal",
    confirmed_at: Time.current,
    notes: "Seeded completed result"
  )

  {
    match:,
    winner_team:,
    loser_team: winner_team == home_team ? away_team : home_team,
    home_round_wins:,
    away_round_wins:,
    home_board_wins:,
    away_board_wins:,
  }
end

def sort_block_standings(stats_hash)
  stats_hash.values.sort_by do |entry|
    [
      -entry[:match_wins],
      -(entry[:rounds_for] - entry[:rounds_against]),
      -(entry[:board_wins] - entry[:board_losses]),
      -entry[:board_wins],
      entry[:team].display_name,
    ]
  end
end

def build_demo_league!(organizer:, spec:, rosters:)
  existing_league = League.find_by(slug: spec[:slug])
  destroy_demo_league!(existing_league) if existing_league
  ruleset = RuleSets::Registry.fetch("wmgp")
  regular_stage = ruleset.fetch("stages").fetch(0)
  final_stage = ruleset.fetch("stages").fetch(1)

  league = organizer.leagues.create!(
    name: "DEMO WMGP Season #{spec[:season_label]}",
    slug: spec[:slug],
    rule_module_key: "wmgp",
    ruleset_snapshot: ruleset,
    status: "completed",
    started_at: spec[:started_at],
    ended_at: spec[:ended_at]
  )

  regular_phase = league.phases.create!(
    name: regular_stage.dig("name", "ja"),
    kind: "regular_season",
    position: 1,
    rule_module_key: "wmgp",
    ranking_rule_key: regular_stage["ranking_rule_key"],
    bracket_enabled: false
  )
  playoff_phase = league.phases.create!(
    name: final_stage.dig("name", "ja"),
    kind: "playoff",
    position: 2,
    rule_module_key: "wmgp",
    ranking_rule_key: final_stage["ranking_rule_key"],
    bracket_enabled: true
  )

  block_names = ("A"...).first(spec[:block_count]).map { |name| "#{name}ブロック" }
  blocks = block_names.each_with_index.map do |name, index|
    league.blocks.create!(phase: regular_phase, name:, position: index + 1)
  end

  chosen_rosters = selected_rosters_for(spec, rosters)
  block_size = chosen_rosters.size / spec[:block_count]
  team_records = []

  chosen_rosters.each_with_index do |team_spec, index|
    block = blocks[index / block_size]
    team = league.teams.create!(
      block:,
      name: team_spec.fetch("team_name"),
      display_name: team_spec.fetch("team_name"),
      short_name: format("S%02dT%02d", spec[:seed_key], index + 1),
      status: "active",
      notes: "Seeded from WMGP playoff roster"
    )

    team_spec.fetch("players").each_with_index do |player_spec, player_index|
      raw_name = player_spec.fetch("name")
      normalized_name = normalize_demo_participant_name(raw_name)
      mdids = player_spec.fetch("mdids", [])
      display_name = demo_participant_display_name(team:, normalized_name:, player_index:)

      league.participants.create!(
        team:,
        name: display_name,
        display_name: display_name,
        position: player_index + 1,
        status: "active",
        notes: demo_participant_notes(raw_name:, normalized_name:, mdids:)
      )
    end

    team_records << { team:, block: }
  end

  block_teams = blocks.index_with do |block|
    team_records.select { |entry| entry[:block] == block }.map { |entry| entry[:team] }
  end

  regular_rounds = round_robin_schedule(block_teams.values.first)
  regular_weeks = regular_rounds.each_with_index.map do |pairs, index|
    regular_phase.weeks.create!(
      league:,
      number: index + 1,
      name: "Week #{index + 1}",
      kind: "regular",
      position: index + 1,
      locked_at: spec[:started_at].to_time + index.days
    )
  end

  block_standings = blocks.index_with do |block|
    block_teams.fetch(block).index_with do |team|
      {
        team:,
        match_wins: 0,
        match_losses: 0,
        rounds_for: 0,
        rounds_against: 0,
        board_wins: 0,
        board_losses: 0,
      }
    end
  end

  regular_rounds.each_with_index do |pairs, round_index|
    week = regular_weeks.fetch(round_index)
    scheduled_on = spec[:started_at] + (round_index * 7)

    blocks.each do |block|
      block_pairs = round_robin_schedule(block_teams.fetch(block)).fetch(round_index)

      block_pairs.each_with_index do |(home_team, away_team), match_index|
        result = create_completed_match!(
          week:,
          home_team:,
          away_team:,
          random: Random.new(spec[:seed_key] * 10_000 + round_index * 100 + match_index + block.position),
          block:,
          scheduled_on:,
          scheduled_time: Time.zone.parse(format("%02d:00", 20 + (match_index % 3))),
          judge_name: JUDGE_NAMES[(round_index + match_index + block.position) % JUDGE_NAMES.size]
        )

        home_stats = block_standings.fetch(block).fetch(home_team)
        away_stats = block_standings.fetch(block).fetch(away_team)

        home_stats[:rounds_for] += result.fetch(:home_round_wins)
        home_stats[:rounds_against] += result.fetch(:away_round_wins)
        home_stats[:board_wins] += result.fetch(:home_board_wins)
        home_stats[:board_losses] += result.fetch(:away_board_wins)
        away_stats[:rounds_for] += result.fetch(:away_round_wins)
        away_stats[:rounds_against] += result.fetch(:home_round_wins)
        away_stats[:board_wins] += result.fetch(:away_board_wins)
        away_stats[:board_losses] += result.fetch(:home_board_wins)

        if result.fetch(:winner_team) == home_team
          home_stats[:match_wins] += 1
          away_stats[:match_losses] += 1
        else
          away_stats[:match_wins] += 1
          home_stats[:match_losses] += 1
        end
      end
    end
  end

  seeded_block_results = blocks.map do |block|
    standings = sort_block_standings(block_standings.fetch(block))
    {
      block:,
      first: standings.first.fetch(:team),
      second: standings.second.fetch(:team),
    }
  end

  qf_week = playoff_phase.weeks.create!(
    league:,
    number: 1,
    name: "Quarterfinal",
    kind: "playoff",
    position: 1,
    locked_at: (regular_weeks.last.locked_at || spec[:ended_at].to_time) + 7.days
  )
  sf_week = playoff_phase.weeks.create!(
    league:,
    number: 2,
    name: "Semifinal",
    kind: "playoff",
    position: 2,
    locked_at: qf_week.locked_at + 7.days
  )
  final_week = playoff_phase.weeks.create!(
    league:,
    number: 3,
    name: "Final",
    kind: "playoff",
    position: 3,
    locked_at: sf_week.locked_at + 7.days
  )

  quarterfinal_pairings = [
    [seeded_block_results[0][:first], seeded_block_results[1][:second]],
    [seeded_block_results[1][:first], seeded_block_results[0][:second]],
    [seeded_block_results[2][:first], seeded_block_results[3][:second]],
    [seeded_block_results[3][:first], seeded_block_results[2][:second]],
  ]

  quarterfinal_winners = quarterfinal_pairings.each_with_index.map do |(home_team, away_team), index|
    create_completed_match!(
      week: qf_week,
      home_team:,
      away_team:,
      random: Random.new(spec[:seed_key] * 20_000 + index + 1),
      stage_key: "quarterfinal",
      bracket_slot: "QF-#{index + 1}",
      scheduled_on: qf_week.locked_at.to_date,
      scheduled_time: Time.zone.parse(format("%02d:00", 20 + index)),
      judge_name: JUDGE_NAMES[index % JUDGE_NAMES.size]
    ).fetch(:winner_team)
  end

  semifinal_pairings = [
    [quarterfinal_winners[0], quarterfinal_winners[1]],
    [quarterfinal_winners[2], quarterfinal_winners[3]],
  ]

  semifinal_winners = semifinal_pairings.each_with_index.map do |(home_team, away_team), index|
    create_completed_match!(
      week: sf_week,
      home_team:,
      away_team:,
      random: Random.new(spec[:seed_key] * 30_000 + index + 1),
      stage_key: "semifinal",
      bracket_slot: "SF-#{index + 1}",
      scheduled_on: sf_week.locked_at.to_date,
      scheduled_time: Time.zone.parse(format("%02d:30", 20 + index)),
      judge_name: JUDGE_NAMES[(index + 1) % JUDGE_NAMES.size]
    ).fetch(:winner_team)
  end

  create_completed_match!(
    week: final_week,
    home_team: semifinal_winners[0],
    away_team: semifinal_winners[1],
    random: Random.new(spec[:seed_key] * 40_000 + 1),
    stage_key: "final",
    bracket_slot: "F-1",
    scheduled_on: final_week.locked_at.to_date,
    scheduled_time: Time.zone.parse("21:00"),
    judge_name: JUDGE_NAMES.first
  )

  league
end

def seed_demo_ledger!
  organizer = seed_demo_organizer!
  rosters = load_demo_rosters!

  League.where(slug: DEMO_LEAGUE_SLUGS).find_each do |league|
    destroy_demo_league!(league)
  end

  leagues = DEMO_LEAGUE_SPECS.map do |spec|
    build_demo_league!(organizer:, spec:, rosters:)
  end

  puts "Seeded demo organizer: #{organizer.login_id}"
  puts "Seeded demo leagues: #{leagues.map(&:slug).join(', ')}"
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
