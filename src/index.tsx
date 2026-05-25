#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import App from './App.js';
import { dispatch } from './actions.js';
import { loadConfig, resolveConfigPath, ConfigError } from './config.js';
import type { Action } from './types.js';

process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection:', error);
	process.exit(1);
});

// zellij inherits PATH from whatever shell started its server, which often
// misses user-local bin dirs (e.g. ~/.local/share/pnpm). Make sure the dirs
// we care about are visible so leaf commands can be resolved.
function extendPath(): void {
	const home = homedir();
	const extra = [
		join(home, '.local/bin'),
		join(home, '.local/share/pnpm'),
		join(home, '.local/share/omarchy/bin'),
		join(home, '.local/share/mise/installs/node/latest/bin'),
		join(home, '.cargo/bin'),
		join(home, 'bin'),
	];
	const current = (process.env.PATH || '').split(delimiter);
	const seen = new Set(current);
	const toAdd = extra.filter((d) => existsSync(d) && !seen.has(d));
	if (toAdd.length > 0) {
		process.env.PATH = [...toAdd, ...current].join(delimiter);
	}
}
extendPath();

function printHelp(): void {
	console.log(`zellij-which-key — leader-key launcher for zellij

Usage:
  zellij-which-key [--config PATH]

Options:
  --config PATH   Path to YAML config (default: $XDG_CONFIG_HOME/zellij-which-key/config.yaml)
  -h, --help      Show this help

Env:
  ZELLIJ_WHICH_KEY_CONFIG   Same as --config

Config format: see README.
`);
}

function parseArgs(argv: string[]): { configPath?: string } {
	const out: { configPath?: string } = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '-h' || a === '--help') {
			printHelp();
			process.exit(0);
		} else if (a === '--config') {
			out.configPath = argv[++i];
		} else if (a.startsWith('--config=')) {
			out.configPath = a.slice('--config='.length);
		} else {
			console.error(`unknown argument: ${a}`);
			process.exit(2);
		}
	}
	return out;
}

async function main() {
	const { configPath } = parseArgs(process.argv.slice(2));

	let config;
	try {
		config = loadConfig(configPath ?? resolveConfigPath());
	} catch (err) {
		if (err instanceof ConfigError) {
			console.error(`zellij-which-key: ${err.message}`);
			if (err.path) console.error(`  path: ${err.path}`);
			process.exit(1);
		}
		throw err;
	}

	let chosen: { action: Action; path: string[] } | null = null;

	const app = render(
		<App
			config={config}
			onSelect={(leaf) => {
				chosen = leaf;
			}}
		/>,
		{ exitOnCtrlC: false },
	);

	await app.waitUntilExit();
	// Clear the terminal so the leader UI doesn't bleed into the launched
	// command's first frame.
	process.stdout.write('\x1b[2J\x1b[H');

	if (!chosen) {
		// Cancelled.
		process.exit(0);
	}

	dispatch((chosen as { action: Action }).action);
}

main();
