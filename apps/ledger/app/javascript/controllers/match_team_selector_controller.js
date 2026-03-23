import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["home", "away"]

  connect() {
    this.sync()
  }

  sync() {
    this.filterOptions(this.homeTarget, this.awayTarget.value)
    this.filterOptions(this.awayTarget, this.homeTarget.value)
  }

  filterOptions(select, blockedValue) {
    for (const option of select.options) {
      const shouldBlock = blockedValue !== "" && option.value === blockedValue
      const isSelected = option.value === select.value

      option.disabled = shouldBlock && !isSelected
      option.hidden = shouldBlock && !isSelected
    }
  }
}
