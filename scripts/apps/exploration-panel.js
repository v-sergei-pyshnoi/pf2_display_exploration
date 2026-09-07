import { MODULE_ID, SETTINGS, TEMPLATE_ROOT } from "../constants.js";
import {
  currentActivityLabels,
  getConfiguredActivities,
  setExplorationActivity
} from "../activities.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Floating panel listing the active party and each member's current PF2e
 * exploration activity. Clicking a portrait (GM, or the actor's owner) opens a
 * menu of the activities configured in module settings.
 *
 * Use the shared singleton via {@link ExplorationPanel.instance}; do not `new` it.
 */
export class ExplorationPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance = null;

  static get instance() {
    return (this.#instance ??= new this());
  }

  static SOCKET = `module.${MODULE_ID}`;

  /** Re-render the panel only if it is already on screen. */
  static refresh() {
    if (this.#instance?.rendered) this.#instance.render(false);
  }

  /** Register the socket listener that reacts to a GM's force-open. */
  static listen() {
    game.socket.on(this.SOCKET, (data) => {
      if (data?.action === "forceOpen") this.instance.render(true);
    });
  }

  /** Open the panel here and tell every other client to do the same. */
  static forceOpenAll() {
    game.socket.emit(this.SOCKET, { action: "forceOpen" });
    this.instance.render(true);
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-panel`,
    tag: "aside",
    classes: ["pf2de"],
    window: { title: `${MODULE_ID}.panel.title`, minimizable: true },
    position: { width: 280, height: "auto" },
    actions: {
      pickActivity: ExplorationPanel.#onPickActivity,
      forceOpenAll: ExplorationPanel.#onForceOpenAll
    }
  };

  static PARTS = {
    body: { template: `${TEMPLATE_ROOT}/exploration-panel.hbs` }
  };

  #menu = null;
  #onDocPointer = null;
  #onDocKey = null;

  #savePosition = foundry.utils.debounce((position) => {
    game.settings.set(MODULE_ID, SETTINGS.panelPosition, {
      top: position.top,
      left: position.left
    });
  }, 400);

  /** @override */
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    Object.assign(opts.position, game.settings.get(MODULE_ID, SETTINGS.panelPosition));
    return opts;
  }

  /** @override */
  setPosition(position) {
    const applied = super.setPosition(position);
    if (applied) this.#savePosition(applied);
    return applied;
  }

  /** @override */
  async _prepareContext() {
    const members = game.actors.party?.members ?? [];
    const none = game.i18n.localize(`${MODULE_ID}.panel.noActivity`);
    const configured = getConfiguredActivities();
    return {
      isGM: game.user.isGM,
      hint: configured.length
        ? null
        : game.i18n.localize(`${MODULE_ID}.panel.notConfigured`),
      rows: members.map((actor) => {
        const labels = currentActivityLabels(actor);
        return {
          actorId: actor.id,
          name: actor.name,
          img: actor.img,
          canEdit: game.user.isGM || actor.isOwner,
          hasActivity: labels.length > 0,
          activityLabel: labels.length ? labels.join(", ") : none
        };
      })
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.#closeMenu();
  }

  /** @override */
  async close(options) {
    this.#closeMenu();
    return super.close(options);
  }

  static async #onPickActivity(event, target) {
    const actorId = target.closest("[data-actor-id]")?.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (!actor || !(game.user.isGM || actor.isOwner)) return;
    this.#openMenu(target, actor);
  }

  static #onForceOpenAll() {
    if (!game.user.isGM) return;
    ExplorationPanel.forceOpenAll();
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.panel.forceOpenDone`));
  }

  #openMenu(anchor, actor) {
    this.#closeMenu();

    const active = new Set(actor.system?.exploration ?? []);
    const entries = [
      {
        uuid: null,
        label: game.i18n.localize(`${MODULE_ID}.panel.noActivity`),
        img: "icons/svg/cancel.svg"
      },
      ...getConfiguredActivities()
    ];

    const menu = document.createElement("nav");
    menu.className = "pf2de__menu";
    for (const entry of entries) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "pf2de__menu-item";

      const icon = document.createElement("img");
      icon.src = entry.img;
      icon.alt = "";
      const label = document.createElement("span");
      label.textContent = entry.label;
      item.append(icon, label);

      const activeItem = entry.uuid
        ? [...active].some((id) => actor.items.get(id)?.name === entry.label)
        : active.size === 0;
      if (activeItem) item.classList.add("pf2de__menu-item--active");

      item.addEventListener("click", async () => {
        this.#closeMenu();
        await setExplorationActivity(actor, entry.uuid);
      });
      menu.appendChild(item);
    }

    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.round(rect.left)}px`;
    menu.style.top = `${Math.round(rect.bottom + 4)}px`;

    this.#menu = menu;
    this.#onDocPointer = (ev) => {
      if (!menu.contains(ev.target)) this.#closeMenu();
    };
    this.#onDocKey = (ev) => {
      if (ev.key === "Escape") this.#closeMenu();
    };
    // Defer so the click that opened the menu doesn't immediately close it.
    setTimeout(() => {
      document.addEventListener("pointerdown", this.#onDocPointer);
      document.addEventListener("keydown", this.#onDocKey);
    }, 0);
  }

  #closeMenu() {
    if (this.#onDocPointer) {
      document.removeEventListener("pointerdown", this.#onDocPointer);
    }
    if (this.#onDocKey) {
      document.removeEventListener("keydown", this.#onDocKey);
    }
    this.#onDocPointer = this.#onDocKey = null;
    this.#menu?.remove();
    this.#menu = null;
  }
}
