// import { exec } from 'child-process-promise'
// import { Llana } from '../types/project'
// import { cli_error, cli_log } from '../utils/logging'

// export async function setupDocker(project: Llana) {
// 	let docker_name = project.project_name

// 	if (typeof project.docker === 'string') {
// 		docker_name = project.docker
// 	}

// 	cli_log(`Building Docker ${docker_name}...`)

// 	try{
// 		const command1 = `docker kill $(docker ps -q) 2>/dev/null`
// 		await exec(command1)
// 	}
// 	catch (e: any) {
// 		//cli_error(`error: ${e}`)
// 	}

// 	try{
// 		const command2 = `docker compose --project-name ${docker_name} up --build --detach`
// 		await exec(command2)

// 		cli_log(`Docker ${docker_name} built!`)
// 	}
// 	catch (e: any) {
// 		cli_error(`error: ${e}`)
// 		return
// 	}
// }
