import { cli_error } from '../utils/logging'
import { checkIfInstalled } from '../utils/pkm'

export async function installLlana() {

	try{
		await checkIfInstalled('@juicyllama/llana', 'npm', false, true)
	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}
