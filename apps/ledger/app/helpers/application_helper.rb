module ApplicationHelper
  def page_title(value = nil)
    value ? content_for(:title, value) : content_for(:title)
  end

  def nav_link_to(label, path, active_paths: [])
    request_path = normalized_request_path
    active = current_page?(path) || active_paths.any? { |candidate| request_path.start_with?(candidate) }
    classes = ["nav-link"]
    classes << "is-active" if active

    link_to label, path, class: classes.join(" ")
  end

  def status_badge(text, tone = "neutral")
    content_tag(:span, text, class: "status-badge status-badge--#{tone}")
  end

  def enum_options(scope, values)
    values.map { |value| [translated_enum(scope, value), value] }
  end

  def translated_enum(scope, value)
    t("#{scope}.#{value}", default: value.to_s.humanize)
  end

  def ruleset_options
    current_organizer_account.ensure_default_rule_templates!
    current_organizer_account.rule_templates.order(:created_at).map do |rule_template|
      definition = rule_template.definition_for_registry
      ["#{definition.dig("name", "ja")} / #{definition.dig("name", "en")}", rule_template.key]
    end
  end

  def stage_asset_options
    current_organizer_account.ensure_default_stage_assets!
    current_organizer_account.stage_assets.where(active: true).order(:created_at).map do |stage_asset|
      ["#{stage_asset.name_ja} / #{stage_asset.display_name_en}", stage_asset.id]
    end
  end

  def localized_ruleset_text(value)
    return value.to_s unless value.is_a?(Hash)

    value[I18n.locale.to_s].presence || value[I18n.default_locale.to_s].presence || value.values.compact.first.to_s
  end

  def league_reference_text(league)
    t("leagues.reference", number: league.display_number)
  end

  def match_side_name(match, side)
    side.to_s == "home" ? match.home_team.display_name : match.away_team.display_name
  end

  def board_winner_text(match, winner_side)
    return t("labels.none") if winner_side.blank?

    "#{match_side_name(match, winner_side)} #{t('labels.win')}"
  end

  def game_win_options
    [[t("matches.result_entry.no_score"), ""], [0, 0], [1, 1], [2, 2]]
  end

  def ruleset_stage_summary(stage)
    parts = [translated_enum("rulesets.formats", stage["format"])]

    if stage["participant_scope"].present?
      parts << translated_enum("rulesets.participant_scopes", stage["participant_scope"])
    end

    if stage["group_count"].present?
      parts << t("rulesets.summary.group_count", count: stage["group_count"])
    end

    if stage["round_count"].present?
      parts << t("rulesets.summary.round_count", count: stage["round_count"])
    end

    if stage["bracket_size"].present?
      parts << t("rulesets.summary.bracket_size", count: stage["bracket_size"])
    end

    if stage["advancement_rule"].present? && stage["advancement_rule"] != "none"
      advancement = translated_enum("rulesets.advancement_rules", stage["advancement_rule"])
      value = stage["advancement_value"]
      parts << [advancement, value].compact.join(": ")
    end

    parts.join(" / ")
  end

  def locale_switcher_path(locale)
    route_params = request.path_parameters.symbolize_keys.except(:format)
    route_params = { controller: "sessions", action: "new" } if route_params[:controller].blank? || route_params[:action].blank?

    url_for(route_params.merge(request.query_parameters.symbolize_keys).merge(locale: locale))
  end

  private

  def normalized_request_path
    request.path.sub(locale_prefix_pattern, "").presence || "/"
  end

  def locale_prefix_pattern
    locales = I18n.available_locales.map { |locale| Regexp.escape(locale.to_s) }.join("|")
    /\A\/(?:#{locales})(?=\/|$)/
  end
end
