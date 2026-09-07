import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Floating panel that lists the active party's members and the PF2e exploration
 * activities each of them currently has set.
 *
 * Use the shared singleton via {@link ExplorationPanel.instance}; do not `new`
 * it directly.
 */
export class ExplorationPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance = null;

  static get instance() {
    return (this.#instance ??= new this());
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-panel`,
    tag: "aside",
    window: { title: `${MODULE_ID}.panel.title`, minimizable: true },
    position: { width: 280, height: "auto" }
  };

  static PARTS = {
    body: { template: `${TEMPLATE_ROOT}/exploration-panel.hbs` }
  };

  /** @override */
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    Object.assign(opts.position, game.settings.get(MODULE_ID, "panelPosition"));
    return opts;
  }

  /** @override */
  setPosition(position) {
    const applied = super.setPosition(position);
    if (applied) {
      game.settings.set(MODULE_ID, "panelPosition", {
        top: applied.top,
        left: applied.left
      });
    }
    return applied;
  }

  /** @override */
  async _prepareContext() {
    const members = game.actors.party?.members ?? [];
    const none = game.i18n.localize(`${MODULE_ID}.panel.noActivity`);
    return {
      rows: members.map((actor) => {
        const activities = this.#explorationActivities(actor);
        return {
          name: actor.name,
          img: actor.img,
          hasActivities: activities.length > 0,
          activitiesLabel: activities.length ? activities.join(", ") : none
        };
      })
    };
  }

  /**
   * Names of the exploration activities the actor currently has active.
   * PF2e stores these as an array of item ids on `actor.system.exploration`.
   */
  #explorationActivities(actor) {
    const ids = actor.system?.exploration ?? [];
    return ids.map((id) => actor.items.get(id)?.name).filter(Boolean);
  }
}
