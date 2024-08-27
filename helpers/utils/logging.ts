import out from 'simple-output'
export function cli_log(message: string) {
	out.node(`🦙 \x1B[1;33m${message}\x1B[0m`)
}

export function cli_error(message: string) {
	out.node(`🦙 \x1B[0;31m${message}\x1B[0m`)
}

export function cli_success(message: string) {
	out.node(`🦙 \x1B[0;32m${message}\x1B[0m`)
}