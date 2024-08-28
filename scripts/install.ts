import { cli_log } from '../helpers/utils/logging'
import { installNestJs } from '../helpers/install/nestjs'
import { installLlana } from '../helpers/install/llana'
import { configDatabase } from '../helpers/install/configure'
import { setupFiles } from '../helpers/app/code'

export async function install() {
	
	cli_log(`Installing NestJS`)
	await installNestJs()

	cli_log(`Llana CLI`)
	await installLlana()

	cli_log(`Setup Application Code`)
	await setupFiles()

	cli_log(`Configure Application`)
	await configDatabase()

	cli_log(`Installation complete!`)

	process.exit(0)
}
