import { exec } from 'child-process-promise'
import { cli_error, cli_log, cli_success } from './logging.js';

export async function checkIfInstalled(app: string, pkm = 'npm'): Promise<boolean> {
    if(pkm === 'brew') return false
    try{
        require.resolve(app)
        return true
    }catch(e: any){
        return false
    }
}

export async function addToPackageJson(app: string, pkm = 'npm', dev = false) {
    if(pkm === 'brew') return

    const packageJson = require('./package.json');
    if(!dev && packageJson.dependencies[app]) return
    if(dev && packageJson.devDependencies[app]) return

    packageJson[dev ? 'devDependencies' : 'dependencies'][app] = 'latest'

    const fs = require('fs')
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
    cli_success(`${app} added to package.json`)
    return
}

export async function install(app: string, pkm = 'npm', global = true, dev = false) {

    let command 

        switch(pkm) {
            case 'brew':
                command = `brew install ${app}`
                break;
            case 'npm':
                command = `npm i ${global ? '-g' : ''} ${dev ? '--save-dev' : '--save'} ${app}`
                break;
            case 'pnpm':
                command = `pnpm i ${global ? '-g' : ''} ${dev ? '--save-dev' : '--save'} ${app}`
                break;
        }

    try{   
        cli_log(`Installing ${app} via ${pkm}`)
		await exec(command)
        cli_success(`${app} installed via ${pkm}`)
	}
	catch (e: any) {
		cli_error(`Error installing ${app} via ${pkm}, please run manually with: ${command}`)
	}
}