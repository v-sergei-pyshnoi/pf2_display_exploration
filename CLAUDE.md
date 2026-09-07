# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **Foundry VTT module** (client-side, browser JavaScript) for the Pathfinder
Second Edition (`pf2e`) system. It renders a floating panel of the active party's
exploration activities, and lets a GM (or an actor's owner) set an actor's
activity by clicking its portrait and picking from a list configured in module
settings. There is no server component, no bundler, and no `package.json` —
Foundry loads `scripts/module.js` directly as an ES module in the browser.

## Commands

There is no build, lint, or test toolchain configured (Node.js is not required or
assumed). Development is done live against a running Foundry instance:

- **Load the module:** symlink this repo into Foundry's `Data/modules/` as a
  folder named exactly `pf2_display_exploration` (must match `id` in
  `module.json`), enable it in a world, reload.
- **Apply code changes:** reload the Foundry client (F5). No compile step.
- **Iterate on the panel without a full reload:** in the browser console,
  `game.modules.get("pf2_display_exploration").api.ExplorationPanel.instance.render(true)`.
- **Open the activities config form directly:**
  `new (game.modules.get("pf2_display_exploration").api.ActivitiesConfig)().render(true)`.
- **Manifest / JSON validity:** the only "build" concern is that `module.json`
  and `lang/en.json` stay valid JSON; Foundry surfaces parse errors in its
  console on load.
- **Release:** the `.github/workflows/release.yml` workflow is `workflow_dispatch`
  only. It reads `version` from `module.json`, fails if the `v<version>` tag
  already exists (so bump `version` first), pins the `manifest`/`download` URLs
  in the packaged copy, zips the module, and `gh release create`s the
  `v<version>` tag on the run's commit with `module.json` + `module.zip`
  attached. The committed `module.json` keeps `latest`-pointing URLs.

If a toolchain is added later, wire it up in `module.json`'s `esmodules`/`styles`
to point at build output, and update this section.

## Architecture

Entry point is `scripts/module.js`, declared in `module.json` under `esmodules`.
It registers Foundry lifecycle hooks and nothing else — all behavior lives in the
modules it imports.

- **`scripts/constants.js`** — `MODULE_ID` (the single source of truth for the id;
  used for settings namespacing, i18n key prefixes, and template paths) and
  `TEMPLATE_ROOT`. The id string, the repo folder name, and the Foundry install
  folder name must all be identical or template/settings lookups break.
- **`scripts/settings.js`** — `registerSettings()`, called once from the `init`
  hook. `activities` (world, hidden, `{uuid,label}[]`) is the configurable list,
  edited via a `registerMenu` entry that opens `ActivitiesConfig`; its `onChange`
  re-renders the panel. `showToPlayers` (world) gates whether non-GMs get the
  panel; `panelPosition` (client, hidden) persists the panel's dragged location.
- **`scripts/activities.js`** — shared, UI-free helpers. `getConfiguredActivities()`
  resolves the `activities` setting to `{uuid,label,img}` via `fromUuidSync`.
  `currentActivityLabels(actor)` maps `actor.system.exploration` ids to names.
  `setExplorationActivity(actor, uuid|null)` is the core write: since
  `system.exploration` holds ids of *embedded* items with the `exploration`
  trait, it finds a matching embedded item (by `_stats.compendiumSource` /
  `flags.core.sourceId` / slug) or imports the action from `uuid` tagged with
  `flags.<MODULE_ID>.managed`, sets `system.exploration` to that single id (or
  `[]`), then deletes any now-unused module-managed activity items.
- **`scripts/apps/exploration-panel.js`** — `ExplorationPanel`, an
  `ApplicationV2` + `HandlebarsApplicationMixin` window. **Singleton via
  `ExplorationPanel.instance`** (private static `#instance`); never `new` it.
  `_prepareContext()` builds one row per `game.actors.party.members` actor with a
  `canEdit` flag (`game.user.isGM || actor.isOwner`). Editable portraits carry
  `data-action="pickActivity"`; the handler builds a plain-DOM `nav.pf2de__menu`
  appended to `document.body`, positioned under the portrait, dismissed on
  outside `pointerdown` / Escape / re-render / close. `setPosition()` is
  overridden to debounce-save into `panelPosition`. `_prepareContext` also sets
  `isGM`, which gates a `data-action="forceOpenAll"` button in the template.
  Static surface: `refresh()` (re-render if open), `listen()` (registers the
  `game.socket.on(SOCKET, …)` handler, called once from `ready`),
  `forceOpenAll()` (GM → `game.socket.emit` + local render). `SOCKET` is
  `` `module.${MODULE_ID}` `` and the only payload is `{ action: "forceOpen" }`,
  which force-renders the panel on every client regardless of `showToPlayers`.
  **`module.json` must declare `"socket": true`** or the Foundry server silently
  drops `module.<id>` events instead of relaying them (the emitter sees no
  error); changing that flag needs a world relaunch, not just an F5.
- **`scripts/apps/activities-config.js`** — `ActivitiesConfig`, an `ApplicationV2`
  form (`tag: "form"`, `form.handler`, `templates/generic/form-footer.hbs` as the
  `footer` PART). Holds a working copy in `#rows`; `#syncFromForm()` reads live
  field values back (via `foundry.applications.ux.FormDataExtended` +
  `expandObject` on `activities.<i>.<field>` names) before every add/remove/drop
  so edits survive re-render. Accepts dropped `Item` documents onto a row or the
  list. "Add Standard Activities" reads the `pf2e.actionspf2e` compendium index
  (`fields: ["system.traits.value"]`) and appends every `exploration`-trait entry.
- **`templates/`** — `exploration-panel.hbs` (`ExplorationPanel.PARTS.body`) and
  `activities-config.hbs` (`ActivitiesConfig.PARTS.body`). Foundry resolves these
  at `modules/pf2_display_exploration/templates/…`.
- **`lang/en.json`** — flat map of i18n keys, all prefixed with the module id.
  Every user-facing string must have a key here; code passes keys, not literals.
- **`styles/module.css`** — plain CSS, class prefixes `pf2de__` (panel + menu)
  and `pf2de-config__` (settings form). Listed in `module.json` under `styles`.

### Data flow

`ready` hook → (GM, or `showToPlayers`) → `ExplorationPanel.instance.render(true)`.
The panel re-renders on: the `activities` setting changing (`onChange`); any
actor's `system.exploration` changing; a `party`-type actor's `system.active`
changing (party swapped in the sidebar) — the last two via `updateActor` hooks,
skipped when the panel is not currently `rendered`.

Portrait click → `pickActivity` action → menu → `setExplorationActivity()` →
`actor.update({"system.exploration": [...]})` (plus possible
`createEmbeddedDocuments`/`deleteEmbeddedDocuments`) → `updateActor` hook →
panel re-render.

`module.js` also registers a `getSceneControlButtons` hook that adds a
`button: true` tool (`pf2deExploration`) to the `tokens` control group — visible
to a GM, or to players when `showToPlayers` — whose click renders the panel. The
GM's "Open for Everyone" button → `forceOpenAll` action → `forceOpenAll()` →
socket broadcast → every client's `listen()` handler renders the panel.

### Foundry API conventions used here

- Targets **ApplicationV2** (`foundry.applications.api.ApplicationV2`), not the
  legacy `Application`/`FormApplication`. Use `DEFAULT_OPTIONS` (incl. the
  `actions` map + `data-action` attributes for clicks), `PARTS`,
  `_prepareContext`, `_onRender`, `_initializeApplicationOptions`, and for forms
  `form.handler` — not `defaultOptions` / `getData` / `activateListeners`.
- `foundry.utils`: `hasProperty` / `setProperty` / `expandObject` / `deepClone` /
  `debounce`. Form reads use `foundry.applications.ux.FormDataExtended`.
- pf2e-specific: `game.actors.party` (active Party actor, may be `null`);
  `actor.system.exploration` is an array of **embedded** item ids, each an item
  carrying the `exploration` trait — you cannot put a bare compendium uuid there.
  Standard activities live in the `pf2e.actionspf2e` compendium.

## Compatibility

`module.json` `compatibility` targets Foundry v13 minimum / v14 verified;
`relationships.systems` requires `pf2e` >= 6.0.0 (the `system.exploration` shape
has been stable well before that). Local dev is against Foundry v14 + pf2e 8.x.
Bump `version` and the `download` URL together on each release; `manifest` points
at `releases/latest/download/module.json`.
