module ApplicationHelper
  def page_title(value = nil)
    value ? content_for(:title, value) : content_for(:title)
  end

  def set_breadcrumbs(items)
    content_for(:breadcrumbs) { render "shared/breadcrumbs", items: items }
    nil
  end

  def breadcrumb_item(label, path = nil, current: false)
    { label:, path:, current: current || path.blank? }
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

  def stage_asset_options
    current_organizer_account.ensure_default_stage_assets!
    current_organizer_account.stage_assets.where(active: true).order(:created_at).map do |stage_asset|
      ["#{localized_stage_asset_name(stage_asset)} / #{translated_enum('rulesets.formats', stage_asset.format)}", stage_asset.id]
    end
  end

  def localized_stage_asset_name(stage_asset)
    return if stage_asset.blank?

    I18n.locale == :en ? stage_asset.display_name_en : stage_asset.name_ja.presence || stage_asset.display_name_en
  end

  def phase_structure_summary(phase)
    parts = []

    if phase.stage_asset
      parts << localized_stage_asset_name(phase.stage_asset)
      parts << translated_enum("rulesets.formats", phase.stage_asset.format)
    elsif phase.kind.present?
      parts << translated_enum("enums.phase.kind", phase.kind)
    end

    parts.compact_blank.join(" / ")
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
