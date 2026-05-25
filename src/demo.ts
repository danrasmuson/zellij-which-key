// Non-interactive ANSI renderer used by `--demo <path>` for screenshots.
//
// Renders the same visual layout as <App />, but as plain ANSI text written
// to stdout so it can be piped into charmbracelet/freeze (or any ANSI->image
// tool) without needing a real TTY.

import type { Config, Entry, SubmenuEntry } from './types.js';
import { isSubmenu } from './types.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

interface DemoFrame {
	title: string;
	breadcrumb: string;
	rows: { key: string; label: string; isGroup: boolean }[];
}

function walk(config: Config, path: string[]): DemoFrame {
	let menu: SubmenuEntry = { keys: config.keys };
	const breadcrumbSegments: string[] = [];
	for (const k of path) {
		const next: Entry | undefined = menu.keys[k];
		if (!next) {
			throw new Error(`demo: no key ${JSON.stringify(k)} at this level`);
		}
		if (!isSubmenu(next)) {
			throw new Error(
				`demo: key ${JSON.stringify(k)} is a leaf, not a submenu`,
			);
		}
		breadcrumbSegments.push(next.label ?? k);
		menu = next;
	}
	const rows = Object.entries(menu.keys).map(([key, entry]) => ({
		key,
		label: entry.label ?? key,
		isGroup: isSubmenu(entry),
	}));
	return {
		title: config.title ?? 'Leader',
		breadcrumb:
			breadcrumbSegments.length === 0
				? ''
				: ' › ' + breadcrumbSegments.join(' › '),
		rows,
	};
}

export function renderDemo(config: Config, path: string[]): string {
	const frame = walk(config, path);
	const lines: string[] = [];
	// Top padding (matches `<Box padding={1}>` in App.tsx).
	lines.push('');
	lines.push(
		`  ${BOLD}${CYAN}${frame.title}${RESET}${DIM}${frame.breadcrumb}${RESET}`,
	);
	lines.push('');
	for (const row of frame.rows) {
		const keyCol = `${BOLD}${YELLOW}${row.key}${RESET}`;
		// Pad the key column to width 4 visually (key is 1 char, plus spaces).
		const keyPadded = `  ${keyCol}   `;
		const labelColor = row.isGroup ? CYAN : '';
		const prefix = row.isGroup ? '+' : ' ';
		lines.push(`${keyPadded}${labelColor}${prefix}${row.label}${RESET}`);
	}
	lines.push('');
	lines.push(
		`  ${DIM}esc / ctrl-c to cancel · backspace to go back${RESET}`,
	);
	lines.push('');
	return lines.join('\n');
}
