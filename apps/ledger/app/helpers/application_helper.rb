module ApplicationHelper
  def page_title(value = nil)
    value ? content_for(:title, value) : content_for(:title)
  end

  def nav_link_to(label, path, active_paths: [])
    active = current_page?(path) || active_paths.any? { |candidate| request.path.start_with?(candidate) }
    classes = ["nav-link"]
    classes << "is-active" if active

    link_to label, path, class: classes.join(" ")
  end

  def status_badge(text, tone = "neutral")
    content_tag(:span, text, class: "status-badge status-badge--#{tone}")
  end
end
