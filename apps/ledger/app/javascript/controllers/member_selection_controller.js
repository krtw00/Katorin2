import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["select", "passwordField", "submit"]
  static values = { privileged: Array }

  connect() {
    this.toggle()
  }

  toggle() {
    const selectedId = this.selectTarget.value
    const needsPassword = this.privilegedValue.includes(selectedId)

    this.passwordFieldTarget.hidden = !needsPassword
    if (!needsPassword) {
      this.passwordFieldTarget.querySelector("input").value = ""
    }
    this.submitTarget.disabled = !selectedId
  }
}
