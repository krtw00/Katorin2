class RuleTemplatesController < ApplicationController
  before_action :ensure_rule_templates_seeded
  before_action :set_rule_template, only: %i[edit update]

  def index
    @rule_templates = current_organizer_account.rule_templates.order(:created_at)
  end

  def new
    @rule_template = current_organizer_account.rule_templates.new(active: true)
    @template_form = form_state_from_definition(source_definition)
  end

  def create
    @rule_template = current_organizer_account.rule_templates.new
    assign_rule_template_from_form(@rule_template)

    if @rule_template.save
      redirect_to rule_templates_path, notice: t("flash.rule_templates.created")
    else
      @template_form = template_form_params.to_h
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @template_form = form_state_from_definition(@rule_template.definition_for_registry)
  end

  def update
    assign_rule_template_from_form(@rule_template)

    if @rule_template.save
      redirect_to rule_templates_path, notice: t("flash.rule_templates.updated")
    else
      @template_form = template_form_params.to_h
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def set_rule_template
    @rule_template = current_organizer_account.rule_templates.find(params[:id])
  end

  def source_definition
    source_key = params[:source_key].presence || current_organizer_account.rule_templates.order(:created_at).pick(:key) || RuleSets::Registry.default_key
    RuleSets::Registry.fetch(source_key, organizer_account: current_organizer_account)
  rescue KeyError
    RuleSets::Registry.fetch(RuleSets::Registry.default_key, organizer_account: current_organizer_account)
  end

  def template_form_params
    params.fetch(:rule_template_form, ActionController::Parameters.new).permit(
      :key,
      :name_ja,
      :name_en,
      :description_ja,
      :description_en,
      :active,
      :roster_min_members,
      :roster_max_members,
      :roster_lineup_size,
      :roster_substitute_size,
      :roster_updates,
      :default_match_rule_key,
      :stage1_key,
      :stage1_name_ja,
      :stage1_name_en,
      :stage1_format,
      :stage1_participant_scope,
      :stage1_group_count,
      :stage1_round_count,
      :stage1_bracket_size,
      :stage1_advancement_rule,
      :stage1_advancement_value,
      :stage1_ranking_rule_key,
      :stage1_match_rule_key,
      :stage2_enabled,
      :stage2_key,
      :stage2_name_ja,
      :stage2_name_en,
      :stage2_format,
      :stage2_participant_scope,
      :stage2_group_count,
      :stage2_round_count,
      :stage2_bracket_size,
      :stage2_advancement_rule,
      :stage2_advancement_value,
      :stage2_ranking_rule_key,
      :stage2_match_rule_key
    )
  end

  def assign_rule_template_from_form(rule_template)
    form = template_form_params.to_h
    resolved_key = form["key"].presence || fallback_key_for(form["name_en"], form["name_ja"], prefix: "ruleset")
    rule_template.key = resolved_key
    rule_template.name_ja = form["name_ja"]
    rule_template.name_en = form["name_en"].presence || form["name_ja"]
    rule_template.description_ja = form["description_ja"]
    rule_template.description_en = form["description_en"].presence || form["description_ja"]
    rule_template.active = ActiveModel::Type::Boolean.new.cast(form["active"])
    rule_template.definition = build_definition(form)
    @template_form = form
  end

  def build_definition(form)
    {
      "key" => form["key"].to_s,
      "name" => {
        "ja" => form["name_ja"].to_s,
        "en" => form["name_en"].presence || form["name_ja"].to_s,
      },
      "description" => {
        "ja" => form["description_ja"].to_s,
        "en" => form["description_en"].presence || form["description_ja"].to_s,
      },
      "roster_rules" => compact_blank(
        "min_members" => integer_or_nil(form["roster_min_members"]),
        "max_members" => integer_or_nil(form["roster_max_members"]),
        "lineup_size" => integer_or_nil(form["roster_lineup_size"]),
        "substitute_size" => integer_or_nil(form["roster_substitute_size"]),
        "roster_updates" => form["roster_updates"].presence
      ),
      "default_match_rule_key" => form["default_match_rule_key"].presence,
      "stages" => build_stages(form),
    }.compact
  end

  def build_stages(form)
    [build_stage(form, 1), build_stage(form, 2)].compact
  end

  def build_stage(form, index)
    enabled = index == 1 || ActiveModel::Type::Boolean.new.cast(form["stage#{index}_enabled"])
    return unless enabled

    stage_key = form["stage#{index}_key"].presence || fallback_key_for(form["stage#{index}_name_en"], form["stage#{index}_name_ja"], prefix: "stage#{index}")
    default_format = index == 1 ? "round_robin" : "single_elimination"
    default_participant_scope = index == 1 ? "all_teams" : "qualified_teams"
    default_advancement_rule = index == 1 ? "top_n_per_group" : "none"

    compact_blank(
      "key" => stage_key,
      "name" => compact_blank(
        "ja" => form["stage#{index}_name_ja"].presence,
        "en" => form["stage#{index}_name_en"].presence || form["stage#{index}_name_ja"].presence
      ),
      "format" => form["stage#{index}_format"].presence || default_format,
      "participant_scope" => form["stage#{index}_participant_scope"].presence || default_participant_scope,
      "group_count" => integer_or_nil(form["stage#{index}_group_count"]),
      "round_count" => integer_or_nil(form["stage#{index}_round_count"]),
      "bracket_size" => integer_or_nil(form["stage#{index}_bracket_size"]),
      "advancement_rule" => form["stage#{index}_advancement_rule"].presence || default_advancement_rule,
      "advancement_value" => integer_or_nil(form["stage#{index}_advancement_value"]),
      "ranking_rule_key" => form["stage#{index}_ranking_rule_key"].presence || "#{stage_key}_ranking",
      "match_rule_key" => form["stage#{index}_match_rule_key"].presence || form["default_match_rule_key"].presence
    )
  end

  def form_state_from_definition(definition)
    stages = Array(definition["stages"])
    stage1 = stages[0] || {}
    stage2 = stages[1] || {}
    roster_rules = definition["roster_rules"] || {}

    {
      "key" => definition["key"].to_s,
      "name_ja" => definition.dig("name", "ja").to_s,
      "name_en" => definition.dig("name", "en").to_s,
      "description_ja" => definition.dig("description", "ja").to_s,
      "description_en" => definition.dig("description", "en").to_s,
      "active" => @rule_template&.active != false,
      "roster_min_members" => roster_rules["min_members"].to_s,
      "roster_max_members" => roster_rules["max_members"].to_s,
      "roster_lineup_size" => roster_rules["lineup_size"].to_s,
      "roster_substitute_size" => roster_rules["substitute_size"].to_s,
      "roster_updates" => roster_rules["roster_updates"].to_s,
      "default_match_rule_key" => definition["default_match_rule_key"].to_s,
      "stage1_key" => stage1["key"].to_s,
      "stage1_name_ja" => stage1.dig("name", "ja").to_s,
      "stage1_name_en" => stage1.dig("name", "en").to_s,
      "stage1_format" => stage1["format"].to_s,
      "stage1_participant_scope" => stage1["participant_scope"].to_s,
      "stage1_group_count" => stage1["group_count"].to_s,
      "stage1_round_count" => stage1["round_count"].to_s,
      "stage1_bracket_size" => stage1["bracket_size"].to_s,
      "stage1_advancement_rule" => stage1["advancement_rule"].to_s,
      "stage1_advancement_value" => stage1["advancement_value"].to_s,
      "stage1_ranking_rule_key" => stage1["ranking_rule_key"].to_s,
      "stage1_match_rule_key" => stage1["match_rule_key"].to_s,
      "stage2_enabled" => stage2.present?,
      "stage2_key" => stage2["key"].to_s,
      "stage2_name_ja" => stage2.dig("name", "ja").to_s,
      "stage2_name_en" => stage2.dig("name", "en").to_s,
      "stage2_format" => stage2["format"].to_s,
      "stage2_participant_scope" => stage2["participant_scope"].to_s,
      "stage2_group_count" => stage2["group_count"].to_s,
      "stage2_round_count" => stage2["round_count"].to_s,
      "stage2_bracket_size" => stage2["bracket_size"].to_s,
      "stage2_advancement_rule" => stage2["advancement_rule"].to_s,
      "stage2_advancement_value" => stage2["advancement_value"].to_s,
      "stage2_ranking_rule_key" => stage2["ranking_rule_key"].to_s,
      "stage2_match_rule_key" => stage2["match_rule_key"].to_s,
    }
  end

  def integer_or_nil(value)
    value.present? ? value.to_i : nil
  end

  def compact_blank(value)
    case value
    when Hash
      value.each_with_object({}) do |(key, entry), memo|
        compacted = compact_blank(entry)
        memo[key] = compacted unless compacted.blank?
      end
    when Array
      value.filter_map { |entry| compact_blank(entry).presence }
    else
      value
    end
  end

  def fallback_key_for(primary, secondary, prefix:)
    candidate = primary.to_s.parameterize(separator: "_").presence || secondary.to_s.parameterize(separator: "_").presence
    candidate || "#{prefix}_#{Time.current.to_i}"
  end

  def ensure_rule_templates_seeded
    current_organizer_account.ensure_default_rule_templates!
  end
end
