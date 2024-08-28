import { cli_success } from '../helpers/utils/logging.js'
import { checkIfInstalled, install } from '../helpers/utils/pkm.js'

export async function boot() {
        if(!await checkIfInstalled('jq', 'brew'))    await install('jq', 'brew', true)
        if(!await checkIfInstalled('pnpm'))   await install('pnpm', 'npm', true)
        if(!await checkIfInstalled('npx', 'pnpm'))    await install('npx', 'pnpm', true)
        if(!await checkIfInstalled('ts-node')) await install('ts-node', 'npm', true)
        if(!await checkIfInstalled('ntl'))      await install('ntl', 'npm', true)
        cli_success('Boot complete!')
        process.exit(0)
}