import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { ExplorationPanel } from "./apps/exploration-panel.js";

Hooks.once("init", () => {
  registerSettings();
  game.modules.get(MODULE_ID).api = { ExplorationPanel };
});

Hooks.once("ready", () => {
  if (game.system.id !== "pf2e") {
    ui.notifications.error(
      game.i18n.localize(`${MODULE_ID}.notifications.systemRequired`)
    );
    return;
  }

  const forPlayers = game.settings.get(MODULE_ID, "showToPlayers");
  if (game.user.isGM || forPlayers) ExplorationPanel.instance.render(true);
});

// Keep the panel current when a PF2e actor's exploration activities change.
Hooks.on("updateActor", (_actor, changes) => {
  if (!ExplorationPanel.instance.rendered) return;
  if (foundry.utils.hasProperty(changes, "system.exploration")) {
    ExplorationPanel.instance.render(false);
  }
});

// The active party can be swapped from the sidebar.
Hooks.on("updateActor", (actor, changes) => {
  if (actor.type === "party" && "active" in (changes.system ?? {})) {
    ExplorationPanel.instance.render(false);
  }
});
