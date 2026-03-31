import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["role", "passwordPanel"]

  connect() {
    this.toggle()
  }

  toggle() {
    const needsPassword = this.roleTarget.value === "owner" || this.roleTarget.value === "admin"
    this.passwordPanelTarget.hidden = !needsPassword
  }
}
