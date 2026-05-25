import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Config, Entry } from './types.js';
import { isLeaf, isSubmenu } from './types.js';

/**
 * Resolve the config file path.
 *
 * Search order:
 *   1. $ZELLIJ_WHICH_KEY_CONFIG (explicit override)
 *   2. $XDG_CONFIG_HOME/zellij-which-key/config.yaml
 *   3. ~/.config/zellij-which-key/config.yaml
 */
export function resolveConfigPath(): string {
	const override = process.env.ZELLIJ_WHICH_KEY_CONFIG;
	if (override) return override;
	const xdg = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
	return join(xdg, 'zellij-which-key', 'config.yaml');
}

export class ConfigError extends Error {
	constructor(message: string, public readonly path?: string) {
		super(message);
		this.name = 'ConfigError';
	}
}

export function loadConfig(path: string = resolveConfigPath()): Config {
	if (!existsSync(path)) {
		throw new ConfigError(`config file not found: ${path}`, path);
	}
	let raw: string;
	try {
		raw = readFileSync(path, 'utf8');
	} catch (err) {
		throw new ConfigError(
			`failed to read config: ${(err as Error).message}`,
			path,
		);
	}
	let data: unknown;
	try {
		data = parseYaml(raw);
	} catch (err) {
		throw new ConfigError(
			`failed to parse YAML: ${(err as Error).message}`,
			path,
		);
	}
	validateConfig(data, path);
	return data as Config;
}

function validateConfig(data: unknown, path: string): asserts data is Config {
	if (!data || typeof data !== 'object') {
		throw new ConfigError('config must be a YAML mapping', path);
	}
	const cfg = data as Record<string, unknown>;
	if (!cfg.keys || typeof cfg.keys !== 'object') {
		throw new ConfigError('config must have a `keys` mapping', path);
	}
	validateKeys(cfg.keys as Record<string, unknown>, ['keys'], path);
}

function validateKeys(
	keys: Record<string, unknown>,
	trail: string[],
	path: string,
): void {
	for (const [k, raw] of Object.entries(keys)) {
		if (k.length === 0) {
			throw new ConfigError(
				`empty key at ${trail.join('.')}`,
				path,
			);
		}
		if (!raw || typeof raw !== 'object') {
			throw new ConfigError(
				`entry at ${[...trail, k].join('.')} must be a mapping`,
				path,
			);
		}
		const entry = raw as Entry;
		const hasRun = isLeaf(entry);
		const hasKeys = isSubmenu(entry);
		if (hasRun && hasKeys) {
			throw new ConfigError(
				`entry at ${[...trail, k].join('.')} has both \`run\` and \`keys\`; pick one`,
				path,
			);
		}
		if (!hasRun && !hasKeys) {
			throw new ConfigError(
				`entry at ${[...trail, k].join('.')} needs either \`run\` or \`keys\``,
				path,
			);
		}
		if (hasKeys) {
			validateKeys(
				(entry as { keys: Record<string, unknown> }).keys,
				[...trail, k, 'keys'],
				path,
			);
		}
	}
}
