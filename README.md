# PF2e Display Exploration

A Foundry VTT module for the **Pathfinder Second Edition** system that shows a
floating panel listing every active party member and the exploration activity
each of them currently has set.

> Status: early scaffold (v0.1.0). Not yet published to the Foundry package
> registry.

## Requirements

- Foundry VTT v12+ (verified on v13)
- Pathfinder Second Edition system (`pf2e`) v6.0.0+

## Install for development

Foundry loads a module from a folder under `Data/modules/` whose name matches the
module `id`. Symlink this repo into that folder:

```sh
# Windows (run in an elevated shell)
mklink /D "%LOCALAPPDATA%\FoundryVTT\Data\modules\pf2_display_exploration" "D:\Projects\pf2_display_exploration"

# macOS / Linux
ln -s /path/to/pf2_display_exploration ~/.local/share/FoundryVTT/Data/modules/pf2_display_exploration
```

Then enable **PF2e Display Exploration** in a world's Manage Modules screen and
reload.

## Settings

| Setting | Scope | Default | Notes |
| --- | --- | --- | --- |
| Show Panel to Players | world | on | When off, only the GM sees the panel. Requires reload. |

## License

MIT — see [LICENSE](LICENSE).
