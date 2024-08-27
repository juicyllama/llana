import { cli_log } from '../helpers/utils/logging'
import { installNestJs } from '../helpers/install/nestjs'
import { setupFiles } from '../helpers/app/code'

export async function install() {
	
	cli_log(`Installing NestJS`)
	await installNestJs()

	cli_log(`Setup Application Code`)
	await setupFiles()

	cli_log(`Installation complete!`)
}
