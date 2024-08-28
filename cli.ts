#!/usr/bin/env ts-node

import os from 'os'
import yargs from 'yargs'
import ipt from 'ipt'
import { version } from './package.json'
import { cli_error, cli_log } from './helpers/utils/logging'
import { Script } from './enums/scripts.enums'
import { install } from './scripts/install'
import { boot } from './scripts/boot'
import { sync } from './scripts/sync'

const sep = os.EOL

function getMainArgs() {
	let i = -1
	const result = []
	const mainArgs = process.argv.slice(2)
	while (++i < mainArgs.length) {
		if (mainArgs[i] === '--') break
		result.push(mainArgs[i])
	}
	return result
}

async function runScript(script: Script) {
	switch (script) {
		case Script.boot:
			await boot()
			break
		case Script.install:
			await install()
			break
		case Script.sync:
			await sync()
			break

		default:
			cli_error(`Script ${script} not implemented`)
			process.exit(0)
	}
}

async function run() {
	cli_log(`Llana Cli v${version}`)

	const { argv } = yargs(getMainArgs())

	if (argv['_'].length > 0) {
		await runScript(Script[argv['_'][0]])
	} else {
		ipt(Object.values(Script), {
			message: 'Select a script to run',
			separator: sep,
		})
			.then(async keys => {
				await runScript(keys[0])
			})
			.catch(() => {
				cli_error(`Error building interactive interface`)
				process.exit(0)
			})
	}
}

run()
