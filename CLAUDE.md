# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **Foundry VTT module** (client-side, browser JavaScript) for the Pathfinder
Second Edition (`pf2e`) system. It renders a floating panel of the active party's
exploration activities. There is no server component, no bundler, and no
`package.json` — Foundry loads `scripts/module.js` directly as an ES module in
the browser.

## Commands

There is no build, lint, or test toolchain configured (Node.js is not required or
assumed). Development is done live against a running Foundry instance:

- **Load the module:** symlink this repo into Foundry's `Data/modules/` as a
  folder named exactly `pf2_display_exploration` (must match `id` in
  `module.json`), enable it in a world, reload.
- **Apply code changes:** reload the Foundry client (F5). No compile step.
- **Iterate on the panel without a full reload:** in the browser console,
  `game.modules.get("pf2_display_exploration").api.ExplorationPanel.instance.render(true)`.
- **Manifest / JSON validity:** the only "build" concern is that `module.json`
  and `lang/en.json` stay valid JSON; Foundry surfaces parse errors in its
  console on load.

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
  hook. `showToPlayers` (world) gates whether non-GMs get the panel;
  `panelPosition` (client, hidden) persists the panel's dragged location.
- **`scripts/apps/exploration-panel.js`** — `ExplorationPanel`, an
  `ApplicationV2` + `HandlebarsApplicationMixin` window. Accessed as a **singleton
  via `ExplorationPanel.instance`** (private static `#instance`); never `new` it.
  `_prepareContext()` reads the active party from `game.actors.party.members` and,
  per actor, resolves `actor.system.exploration` (an array of item ids maintained
  by the pf2e system) to activity item names. `setPosition()` is overridden to
  write the position back into the `panelPosition` setting.
- **`templates/exploration-panel.hbs`** — the one Handlebars template, referenced
  by `ExplorationPanel.PARTS.body`. Foundry resolves it at the runtime path
  `modules/pf2_display_exploration/templates/exploration-panel.hbs`.
- **`lang/en.json`** — flat map of i18n keys, all prefixed with the module id.
  Every user-facing string (window title, settings labels, notifications) must
  have a key here; code passes keys, not literals.
- **`styles/module.css`** — plain CSS, class prefix `pf2de__`. Listed in
  `module.json` under `styles`.

### Data flow

`ready` hook → (GM, or `showToPlayers`) → `ExplorationPanel.instance.render(true)`.
Two `updateActor` hooks re-render the panel: one when any actor's
`system.exploration` changes, one when a `party`-type actor's `system.active`
changes (the active party was swapped in the sidebar). Re-renders are skipped
when the panel is not currently `rendered`.

### Foundry API conventions used here

- Targets **ApplicationV2** (`foundry.applications.api.ApplicationV2`), not the
  legacy `Application`/`FormApplication`. Use `DEFAULT_OPTIONS`, `PARTS`,
  `_prepareContext`, `_initializeApplicationOptions` — not `defaultOptions` /
  `getData` / `activateListeners`.
- `foundry.utils.hasProperty` for change-diff checks in hooks.
- pf2e-specific: `game.actors.party` (the active Party actor, may be `null`),
  `actor.system.exploration` (array of activity item ids).

## Compatibility

`module.json` `compatibility` targets Foundry v12 minimum / v13 verified, and
`relationships.systems` requires `pf2e` >= 6.0.0. Bump `version` and the
`download` URL together on each release; `manifest` points at
`releases/latest/download/module.json`.
