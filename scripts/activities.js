import { MODULE_ID, SETTINGS } from "./constants.js";

/** `fromUuidSync` that yields `null` instead of throwing on a malformed uuid. */
export function safeFromUuidSync(uuid) {
  if (!uuid) return null;
  try {
    return fromUuidSync(uuid);
  } catch {
    return null;
  }
}

/**
 * The activities configured in module settings, resolved for display.
 * Each entry: `{ uuid, label, img }`. `label` falls back to the referenced
 * item's name, then to the raw uuid.
 */
export function getConfiguredActivities() {
  const rows = game.settings.get(MODULE_ID, SETTINGS.activities) ?? [];
  return rows
    .filter((row) => row?.uuid)
    .map((row) => {
      const doc = safeFromUuidSync(row.uuid);
      return {
        uuid: row.uuid,
        label: (row.label ?? "").trim() || doc?.name || row.uuid,
        img: doc?.img ?? "icons/svg/book.svg"
      };
    });
}

/** Names of the exploration activities `actor` currently has active. */
export function currentActivityLabels(actor) {
  const ids = actor.system?.exploration ?? [];
  return ids.map((id) => actor.items.get(id)?.name).filter(Boolean);
}

/**
 * Point `actor` at the single exploration activity referenced by `uuid`, or
 * clear the activity when `uuid` is null.
 *
 * PF2e's `system.exploration` holds ids of *embedded* items carrying the
 * `exploration` trait, so an action the actor lacks is imported first and
 * tagged with a module flag. Previously imported activities that are no longer
 * selected are removed again, keeping the character sheet tidy.
 */
export async function setExplorationActivity(actor, uuid) {
  let targetId = null;

  if (uuid) {
    const existing = findExplorationItem(actor, uuid);
    if (existing) {
      targetId = existing.id;
    } else {
      const source = await fromUuid(uuid);
      if (!source) {
        ui.notifications.warn(
          game.i18n.format(`${MODULE_ID}.notifications.activityMissing`, { uuid })
        );
        return;
      }
      const data = source.toObject();
      foundry.utils.setProperty(data, `flags.${MODULE_ID}.managed`, true);
      const [created] = await actor.createEmbeddedDocuments("Item", [data]);
      targetId = created.id;
    }
  }

  await actor.update({ "system.exploration": targetId ? [targetId] : [] });

  const orphans = actor.items.filter(
    (item) => item.getFlag(MODULE_ID, "managed") && item.id !== targetId
  );
  if (orphans.length) {
    await actor.deleteEmbeddedDocuments("Item", orphans.map((item) => item.id));
  }
}

/** An embedded item on `actor` that came from `uuid` (by source id or slug). */
function findExplorationItem(actor, uuid) {
  const source = safeFromUuidSync(uuid);
  const slug = source?.system?.slug ?? source?.slug ?? null;
  return actor.items.find((item) => {
    if (item._stats?.compendiumSource === uuid) return true;
    if (item.flags?.core?.sourceId === uuid) return true;
    if (!slug) return false;
    const traits = item.system?.traits?.value ?? [];
    return item.system?.slug === slug && traits.includes("exploration");
  });
}
