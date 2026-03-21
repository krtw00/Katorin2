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
    RuleSets::Registry.all.map do |definition|
      [localized_ruleset_text(definition["name"]), definition.fetch("key")]
    end
  end

  def localized_ruleset_text(value)
    return value.to_s unless value.is_a?(Hash)

    value[I18n.locale.to_s].presence || value[I18n.default_locale.to_s].presence || value.values.compact.first.to_s
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
    locale_param = locale.to_sym == I18n.default_locale ? nil : locale
    route_params = request.path_parameters.symbolize_keys.except(:format)
    route_params = { controller: "home", action: "index" } if route_params[:controller].blank? || route_params[:action].blank?

    url_for(route_params.merge(request.query_parameters.symbolize_keys).merge(locale: locale_param))
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
