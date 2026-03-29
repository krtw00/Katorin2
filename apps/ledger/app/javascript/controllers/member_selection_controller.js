import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["select", "passwordField", "submit"]

  connect() {
    this.toggle()
  }

  toggle() {
    const selected = this.selectTarget.selectedOptions[0]
    const selectedId = this.selectTarget.value
    const needsPassword = selected && selected.dataset.privileged === "true"

    this.passwordFieldTarget.hidden = !needsPassword
    if (!needsPassword) {
      this.passwordFieldTarget.querySelector("input").value = ""
    }
    this.submitTarget.disabled = !selectedId
  }
}
