import { MODULE_ID } from "./constants.js";

/** Registered once from the `init` hook. */
export function registerSettings() {
  game.settings.register(MODULE_ID, "showToPlayers", {
    name: `${MODULE_ID}.settings.showToPlayers.name`,
    hint: `${MODULE_ID}.settings.showToPlayers.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  // Remembered per client; written by the Application when the user drags it.
  game.settings.register(MODULE_ID, "panelPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: { top: 90, left: 120 }
  });
}
