import { cli_log } from '../helpers/utils/logging'
import { validateConnection } from '../helpers/database'

export async function sync() {
	
	await validateConnection()

	// TODO: Validate connection to DB
	// TODO: Get DB Schema

	// TODO: Rebuild (copy structure, insert, replace, delete) llana/restrictions from restrictions.json
	// TODO: Build -> routes.json from schema
	// TODO: Rebuild (copy structure, insert, replace, delete)  llana/routes from routes.json

	cli_log(`Sync complete!`)

	process.exit(0)
}
