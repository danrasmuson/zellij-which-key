# zellij-which-key

A small which-key style leader-key launcher for [zellij](https://zellij.dev),
rendered with [Ink](https://github.com/vadimdemedes/ink).

It's meant to be launched inside a **floating zellij pane** bound to a leader
key (e.g. `Ctrl+Space`). When the user finishes typing a key sequence, the
chosen command takes over the floating pane via stdio inheritance — so a TUI
like `calendar-tui` simply replaces the menu, and the pane closes when the TUI
exits.

## Install

```sh
pnpm install
pnpm build
pnpm link --global       # exposes `zellij-which-key` on PATH
```

## Configure

Drop a YAML config at `~/.config/zellij-which-key/config.yaml`:

```yaml
title: Leader

keys:
  o:
    label: open
    keys:
      c:
        label: calendar
        run: calendar-tui
```

Each entry under `keys` is either:

- a **leaf** with a `run:` shell command, or
- a **submenu** with a nested `keys:` map.

Optional fields:

| field   | type   | notes                                                     |
| ------- | ------ | --------------------------------------------------------- |
| `label` | string | shown next to the key in the UI (defaults to the key)     |
| `run`   | string | shell command, executed via `sh -c` (leaf only)           |
| `cwd`   | string | working directory for `run` (defaults to `$HOME`)         |
| `keys`  | map    | nested submenu (submenu only)                             |

The config path can also be overridden via `--config PATH` or
`$ZELLIJ_WHICH_KEY_CONFIG`.

## Wire it into zellij

In `~/.config/zellij/config.kdl`, inside the `shared` block:

```kdl
bind "Ctrl Space" {
    Run "zellij-which-key" {
        floating true
        hold_on_close false
        width "70%"
        height "60%"
    }
}
```

Zellij doesn't hot-reload keybinds, so start a fresh session to pick the
binding up.

## Keys

| key            | action                              |
| -------------- | ----------------------------------- |
| any config key | descend into submenu / run command  |
| `backspace`    | pop one menu level                  |
| `esc`, `ctrl+c`| cancel and close the floating pane  |
| `q` (at root)  | cancel                              |

## Status

v0.1 — single action type (`run`), nested submenus, YAML config. No remote
zellij actions (new-tab / floating spawn / etc.) yet — the pane simply becomes
the command.
