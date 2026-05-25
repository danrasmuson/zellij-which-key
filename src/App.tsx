import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Config, Entry, SubmenuEntry } from './types.js';
import { isLeaf, isSubmenu } from './types.js';

interface AppProps {
	config: Config;
	/** Called when the user selects a leaf. The app unmounts after this fires. */
	onSelect: (leaf: { cmd: string; cwd?: string; path: string[] }) => void;
}

interface MenuRow {
	key: string;
	label: string;
	isGroup: boolean;
}

function entriesOf(menu: { keys: Record<string, Entry> }): MenuRow[] {
	return Object.entries(menu.keys).map(([key, entry]) => ({
		key,
		label: entry.label ?? key,
		isGroup: isSubmenu(entry),
	}));
}

export default function App({ config, onSelect }: AppProps) {
	const { exit } = useApp();
	// Path of keys descended into; [] means at root.
	const [path, setPath] = useState<string[]>([]);
	const [flash, setFlash] = useState<string | null>(null);

	// Walk to the current menu.
	const current: SubmenuEntry = path.reduce<SubmenuEntry>(
		(menu, k) => {
			const next = menu.keys[k];
			if (!next || !isSubmenu(next)) {
				// Shouldn't happen — we only descend into submenus.
				return menu;
			}
			return next;
		},
		{ keys: config.keys },
	);

	const rows = entriesOf(current);
	const title = config.title ?? 'Leader';
	const breadcrumb =
		path.length === 0
			? ''
			: ' › ' +
				path
					.map((k) => {
						// Walk to find label for breadcrumb segment
						let m: SubmenuEntry = { keys: config.keys };
						let label = k;
						for (const step of path.slice(
							0,
							path.indexOf(k) + 1,
						)) {
							const e = m.keys[step];
							if (!e) break;
							label = e.label ?? step;
							if (isSubmenu(e)) m = e;
						}
						return label;
					})
					.join(' › ');

	useInput((input, key) => {
		// Cancel
		if (key.escape || (key.ctrl && input === 'c')) {
			exit();
			return;
		}
		// `q` only cancels at root, so it can be used as a binding deeper.
		if (path.length === 0 && input === 'q') {
			exit();
			return;
		}
		// Backspace pops one level.
		if (key.backspace || key.delete) {
			if (path.length > 0) setPath(path.slice(0, -1));
			return;
		}

		// Match printable character against current menu.
		// Ink gives us `input` as the typed character (already decoded).
		const entry = current.keys[input];
		if (!entry) {
			setFlash(input);
			setTimeout(() => setFlash(null), 150);
			return;
		}
		if (isSubmenu(entry)) {
			setPath([...path, input]);
			return;
		}
		if (isLeaf(entry)) {
			onSelect({
				cmd: entry.run,
				cwd: entry.cwd,
				path: [...path, input],
			});
			exit();
			return;
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					{title}
				</Text>
				<Text dimColor>{breadcrumb}</Text>
			</Box>
			<Box flexDirection="column">
				{rows.map((row) => (
					<Box key={row.key}>
						<Box width={4}>
							<Text bold color="yellow">
								{row.key}
							</Text>
						</Box>
						<Text color={row.isGroup ? 'cyan' : undefined}>
							{row.isGroup ? '+' : ' '}
							{row.label}
						</Text>
					</Box>
				))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					{flash
						? `unknown key: ${JSON.stringify(flash)}`
						: 'esc / ctrl-c to cancel · backspace to go back'}
				</Text>
			</Box>
		</Box>
	);
}
