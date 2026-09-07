import { MODULE_ID, SETTINGS, TEMPLATE_ROOT } from "../constants.js";
import { safeFromUuidSync } from "../activities.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Settings-menu form for editing the list of exploration activities the panel
 * offers. Each row is `{ uuid, label }`; a PF2e action item can be dragged from
 * a compendium onto a row (or the list) to fill its uuid.
 */
export class ActivitiesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-activities-config`,
    classes: ["pf2de", "pf2de-config", "standard-form"],
    tag: "form",
    window: { title: `${MODULE_ID}.settings.activitiesMenu.name`, icon: "fa-solid fa-person-hiking" },
    position: { width: 560, height: "auto" },
    form: {
      handler: ActivitiesConfig.#onSubmit,
      closeOnSubmit: true
    },
    actions: {
      addRow: ActivitiesConfig.#onAddRow,
      removeRow: ActivitiesConfig.#onRemoveRow,
      populate: ActivitiesConfig.#onPopulate
    }
  };

  static PARTS = {
    body: {
      template: `${TEMPLATE_ROOT}/activities-config.hbs`,
      scrollable: [".pf2de-config__rows"]
    },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  /** Working copy; committed to the setting on submit. */
  #rows = null;

  /** @override */
  async _prepareContext() {
    this.#rows ??= foundry.utils.deepClone(
      game.settings.get(MODULE_ID, SETTINGS.activities) ?? []
    );
    return {
      rows: this.#rows.map((row, index) => {
        const doc = safeFromUuidSync(row.uuid);
        return {
          index,
          uuid: row.uuid ?? "",
          label: row.label ?? "",
          resolvedName: doc?.name ?? null,
          img: doc?.img ?? "icons/svg/book.svg"
        };
      }),
      buttons: [
        { type: "submit", icon: "fa-solid fa-floppy-disk", label: `${MODULE_ID}.settings.activitiesMenu.save` }
      ]
    };
  }

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    // `this.element` (the form root) persists across re-renders, so bind once.
    this.element.addEventListener("dragover", (event) => event.preventDefault());
    this.element.addEventListener("drop", this.#onDrop.bind(this));
  }

  /** @override */
  async close(options) {
    this.#rows = null;
    return super.close(options);
  }

  /** Read the current field values back into {@link #rows}. */
  #syncFromForm() {
    if (!this.element) return;
    const data = new foundry.applications.ux.FormDataExtended(this.element);
    const expanded = foundry.utils.expandObject(data.object);
    const list = expanded.activities ? Object.values(expanded.activities) : [];
    this.#rows = list.map((row) => ({
      uuid: (row.uuid ?? "").trim(),
      label: (row.label ?? "").trim()
    }));
  }

  static #onAddRow() {
    this.#syncFromForm();
    this.#rows.push({ uuid: "", label: "" });
    this.render();
  }

  static #onRemoveRow(event, target) {
    this.#syncFromForm();
    this.#rows.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static async #onPopulate() {
    this.#syncFromForm();
    const pack = game.packs.get("pf2e.actionspf2e");
    if (!pack) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.noActionsPack`));
      return;
    }
    const index = await pack.getIndex({ fields: ["system.traits.value"] });
    const known = new Set(this.#rows.map((row) => row.uuid));
    for (const entry of index) {
      const traits = entry.system?.traits?.value ?? [];
      if (traits.includes("exploration") && !known.has(entry.uuid)) {
        this.#rows.push({ uuid: entry.uuid, label: "" });
      }
    }
    this.render();
  }

  async #onDrop(event) {
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    if (data?.type !== "Item" || !data.uuid) return;
    event.preventDefault();

    this.#syncFromForm();
    const row = event.target.closest("[data-index]");
    if (row) {
      const index = Number(row.dataset.index);
      this.#rows[index] = { ...this.#rows[index], uuid: data.uuid };
    } else if (!this.#rows.some((existing) => existing.uuid === data.uuid)) {
      this.#rows.push({ uuid: data.uuid, label: "" });
    }
    this.render();
  }

  static async #onSubmit(event, form, formData) {
    const expanded = foundry.utils.expandObject(formData.object);
    const list = expanded.activities ? Object.values(expanded.activities) : [];
    const cleaned = list
      .map((row) => ({ uuid: (row.uuid ?? "").trim(), label: (row.label ?? "").trim() }))
      .filter((row) => row.uuid);
    await game.settings.set(MODULE_ID, SETTINGS.activities, cleaned);
  }
}
