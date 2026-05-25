// Configuration schema for zellij-which-key.
//
// The config is a tree of menus. Each entry under `keys` is either:
//   - a leaf (has `run`) -- pressing the key executes that command
//   - a submenu (has `keys`) -- pressing the key descends into it
//
// Optional fields:
//   - label: human-readable name shown next to the key
//   - desc: longer description (unused for now, reserved for richer UI)

export interface LeafEntry {
	label?: string;
	desc?: string;
	/** Shell command line to run. Executed via `sh -c` so pipes/quoting work. */
	run: string;
	/** Working directory for the command. Defaults to $HOME. */
	cwd?: string;
}

export interface SubmenuEntry {
	label?: string;
	desc?: string;
	keys: Record<string, Entry>;
}

export type Entry = LeafEntry | SubmenuEntry;

export interface Config {
	/** Title shown in the header. Defaults to "Leader". */
	title?: string;
	keys: Record<string, Entry>;
}

export function isSubmenu(entry: Entry): entry is SubmenuEntry {
	return (entry as SubmenuEntry).keys !== undefined;
}

export function isLeaf(entry: Entry): entry is LeafEntry {
	return (entry as LeafEntry).run !== undefined;
}
