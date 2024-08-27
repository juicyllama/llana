import { exec } from 'child-process-promise'
import { cli_error, cli_log, cli_success } from './logging';

export async function checkIfInstalled(app: string, pkm: 'brew' | 'npm' | 'pnpm', global = true) {

    try{
		let command 
        
        switch(pkm) {
            case 'brew':
                command = `brew list ${app}`
                break;
            case 'npm':
                command = `npm list ${global ? '-g' : ''} ${app}`
                break;
            case 'pnpm':
                command = `pnpm list  ${global ? '-g' : ''} ${app}`
                break;
        }
        
		await exec(command)
	}
	catch (e: any) {
        console.log(e)
		cli_log(`${app} is not installed via ${pkm}`)
        await install(app, pkm)
	}
}

export async function install(app: string, pkm: 'brew' | 'npm' | 'pnpm', global = true) {

    let command 

        switch(pkm) {
            case 'brew':
                command = `brew install ${app}`
                break;
            case 'npm':
                command = `npm i ${global ? '-g' : ''} ${app}`
                break;
            case 'pnpm':
                command = `pnpm i ${global ? '-g' : ''} ${app}`
                break;
        }

    try{   
		await exec(command)
        cli_success(`${app} installed via ${pkm}`)
	}
	catch (e: any) {
		cli_error(`Error installing ${app} via ${pkm}, please run manually with: ${command}`)
	}
}