import { cli_success } from '../helpers/utils/logging.js'
import { installDependancies } from '../helpers/install/dependancies.js'
import { configDatabase } from '../helpers/install/configure.js'
import { setupFiles } from '../helpers/app/code.js'
import { validateConnection } from '../helpers/database.js'
import { exec } from 'child-process-promise'

export async function install() {
	await installDependancies()
	await setupFiles()
	await configDatabase()
	await validateConnection()

	const clear_packagex = `rm -rf node_modules`
	await exec(clear_packagex)

	const clean_install = `npm install`
	await exec(clean_install)

	const llana_link = `npm link @juicyllama/llana`
	await exec(llana_link)
	
	cli_success(`Installation complete!`)

	process.exit(0)
}
