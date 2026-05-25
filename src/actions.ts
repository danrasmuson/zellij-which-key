import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import type { Action, PaneAction, TabAction } from './types.js';

/**
 * Dispatch the chosen action. This is called *after* the Ink app has
 * unmounted and the terminal has been restored.
 *
 * Contract:
 *   - For `run`: spawn the command with stdio inherited. The current
 *     (floating) pane *becomes* the command. We exit with the child's exit
 *     code; the keybind has `hold_on_close false` so zellij closes the pane.
 *
 *   - For `pane`, `tab`, `zellij`: invoke `zellij action ...` to create the
 *     new pane/tab/perform the action, then exit 0. Our floating pane
 *     closes (again, `hold_on_close false`).
 */
export function dispatch(action: Action): never {
	switch (action.kind) {
		case 'run':
			return execRun(action.cmd, action.cwd);
		case 'pane':
			return execZellijAction(buildPaneArgs(action));
		case 'tab':
			return execZellijAction(buildTabArgs(action));
		case 'zellij':
			return execZellijAction(['action', ...action.args]);
	}
}

/* -------------------------------------------------------------------- run */

function execRun(cmd: string, cwd?: string): never {
	const child = spawn('sh', ['-c', cmd], {
		stdio: 'inherit',
		cwd: cwd || homedir(),
		env: process.env,
	});
	child.on('exit', (code, signal) => {
		if (signal) process.kill(process.pid, signal);
		else process.exit(code ?? 0);
	});
	child.on('error', (err) => {
		console.error(`zellij-which-key: failed to spawn: ${err.message}`);
		process.exit(127);
	});
	// Block the event loop; child handlers will exit the process.
	return new Promise<never>(() => {}) as never;
}

/* ----------------------------------------------------------------- zellij */

function execZellijAction(args: string[]): never {
	const result = spawnSync('zellij', args, {
		stdio: 'inherit',
		env: process.env,
	});
	if (result.error) {
		console.error(
			`zellij-which-key: failed to invoke zellij: ${result.error.message}`,
		);
		process.exit(127);
	}
	process.exit(result.status ?? 0);
}

function buildPaneArgs(a: PaneAction): string[] {
	// `zellij action new-pane [-f] [-c] [-n NAME] [--cwd CWD] [-d DIR] -- sh -c CMD`
	const args = ['action', 'new-pane'];
	if (a.floating) args.push('--floating');
	if (a.close_on_exit ?? true) args.push('--close-on-exit');
	if (a.name) args.push('--name', a.name);
	if (a.cwd) args.push('--cwd', a.cwd);
	if (a.direction) args.push('--direction', a.direction);
	args.push('--', 'sh', '-c', a.cmd);
	return args;
}

function buildTabArgs(a: TabAction): string[] {
	// `zellij action new-tab [--name NAME] [--cwd CWD] [--layout PATH]`
	// Optionally followed by a command via `--` once supported.
	const args = ['action', 'new-tab'];
	if (a.name) args.push('--name', a.name);
	if (a.cwd) args.push('--cwd', a.cwd);
	if (a.layout) args.push('--layout', a.layout);
	if (a.cmd) {
		// `zellij action new-tab` doesn't accept a trailing command yet,
		// so we fall back to creating the tab, then spawning a pane that
		// runs the command (replacing the default pane in the new tab is
		// trickier and varies by zellij version).
		// For now, emit a clear error if `cmd` is set with no layout.
		console.error(
			`zellij-which-key: tab.cmd is not yet supported; use a layout file or open the command via a follow-up pane action`,
		);
	}
	return args;
}
