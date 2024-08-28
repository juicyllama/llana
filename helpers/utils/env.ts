import dotenv from 'dotenv'

export function get(key: string) {
	
    dotenv.config();
    return process.env[key];

}