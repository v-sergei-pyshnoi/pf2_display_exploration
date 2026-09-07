import { MODULE_ID, SETTINGS } from "./constants.js";
import { registerSettings } from "./settings.js";
import { ActivitiesConfig } from "./apps/activities-config.js";
import { ExplorationPanel } from "./apps/exploration-panel.js";
import { setExplorationActivity } from "./activities.js";

Hooks.once("init", () => {
  registerSettings();
  game.modules.get(MODULE_ID).api = {
    ExplorationPanel,
    ActivitiesConfig,
    setExplorationActivity
  };
});

Hooks.once("ready", () => {
  if (game.system.id !== "pf2e") {
    ui.notifications.error(
      game.i18n.localize(`${MODULE_ID}.notifications.systemRequired`)
    );
    return;
  }

  const forPlayers = game.settings.get(MODULE_ID, SETTINGS.showToPlayers);
  if (game.user.isGM || forPlayers) ExplorationPanel.instance.render(true);
});

// Re-render when a member's exploration activities change, or when the active
// party is swapped from the sidebar.
Hooks.on("updateActor", (actor, changes) => {
  if (
    foundry.utils.hasProperty(changes, "system.exploration") ||
    (actor.type === "party" && foundry.utils.hasProperty(changes, "system.active"))
  ) {
    ExplorationPanel.refresh();
  }
});
