# PF2e Display Exploration

A Foundry VTT module for the **Pathfinder Second Edition** system. It shows a
floating panel listing every active party member and the exploration activity
each of them currently has set, and lets you change an actor's activity by
clicking its portrait.

> Status: in development (v0.2.0). Not yet published to the Foundry package
> registry.

## Requirements

- Foundry VTT v13+ (verified on v14)
- Pathfinder Second Edition system (`pf2e`) v6.0.0+

## Installation

In Foundry's **Add-on Modules → Install Module**, paste this manifest URL:

```
https://github.com/v-sergei-pyshnoi/pf2_display_exploration/releases/latest/download/module.json
```

(Available once a release has been published.) Then enable **PF2e Display
Exploration** in a world and reload.

## Usage

- The panel appears automatically for the GM (and for players, unless disabled)
  and lists the active party's members.
- Click a portrait to pick that actor's exploration activity from a menu. The GM
  can set it for anyone; a player only for actors they own.
- Picking an activity writes it to the character's `Exploration` section on the
  sheet; choosing *No activity set* clears it.

## Settings

| Setting | Scope | Notes |
| --- | --- | --- |
| Configure Activities | world (GM) | Editable list of the activities offered in the portrait menu. Each row points at a PF2e action item by UUID — drag an action from a compendium onto a row, or use **Add Standard Activities** to pull in every exploration-trait action. |
| Show Panel to Players | world | When off, only the GM sees the panel. Requires a reload. |

## License

MIT — see [LICENSE](LICENSE).
