import { MODULE_ID, SETTINGS } from "./constants.js";
import { ActivitiesConfig } from "./apps/activities-config.js";
import { ExplorationPanel } from "./apps/exploration-panel.js";

/** Registered once from the `init` hook. */
export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, "activitiesMenu", {
    name: `${MODULE_ID}.settings.activitiesMenu.name`,
    label: `${MODULE_ID}.settings.activitiesMenu.label`,
    hint: `${MODULE_ID}.settings.activitiesMenu.hint`,
    icon: "fa-solid fa-person-hiking",
    type: ActivitiesConfig,
    restricted: true
  });

  // The activity list edited by the menu above. `{ uuid, label }[]`.
  game.settings.register(MODULE_ID, SETTINGS.activities, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => ExplorationPanel.refresh()
  });

  game.settings.register(MODULE_ID, SETTINGS.showToPlayers, {
    name: `${MODULE_ID}.settings.showToPlayers.name`,
    hint: `${MODULE_ID}.settings.showToPlayers.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  // Remembered per client; written by the panel when the user drags it.
  game.settings.register(MODULE_ID, SETTINGS.panelPosition, {
    scope: "client",
    config: false,
    type: Object,
    default: { top: 90, left: 120 }
  });
}
