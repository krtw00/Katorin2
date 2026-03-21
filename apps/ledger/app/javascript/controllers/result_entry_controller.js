import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["source", "mirror"]

  connect() {
    this.syncAll()
  }

  sync(event) {
    const source = event.currentTarget
    const board = source.dataset.resultEntryBoard
    const mirror = this.mirrorTargets.find((target) => target.dataset.resultEntryBoard === board)

    if (!mirror) return

    mirror.value = this.mirrorValue(source.value)
  }

  syncAll() {
    this.sourceTargets.forEach((source) => {
      const board = source.dataset.resultEntryBoard
      const mirror = this.mirrorTargets.find((target) => target.dataset.resultEntryBoard === board)
      if (!mirror) return

      mirror.value = this.mirrorValue(source.value)
    })
  }

  mirrorValue(value) {
    switch (value) {
      case "home":
        return "lose"
      case "away":
        return "win"
      default:
        return ""
    }
  }
}
