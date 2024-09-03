import { Injectable } from '@nestjs/common'
import { Logger } from './Logger'
import { AuthPasswordEncryption } from '../types/auth.types'
import bcrypt from 'bcrypt'
import { createHmac, createHash } from 'node:crypto'
import * as argon2 from 'argon2'

@Injectable()
export class Encryption {
	constructor(private readonly logger: Logger) {}

	/**
	 * Encrypt a string
	 */

	async encrypt(type: AuthPasswordEncryption, string: string, salt?: string): Promise<string> {
		switch (type) {
			case AuthPasswordEncryption.BCRYPT:
				if (!salt) {
					throw new Error(`Encryption type ${type} requires a salt`)
				}
				return bcrypt.hashSync(string, salt)
			case AuthPasswordEncryption.SHA1:
				if (salt) {
					return createHmac('sha1', salt).update(string).digest('hex')
				} else {
					return createHash('sha1').update(string).digest('hex')
				}
			case AuthPasswordEncryption.SHA256:
				if (salt) {
					return createHmac('sha256', salt).update(string).digest('hex')
				} else {
					return createHash('sha256').update(string).digest('hex')
				}
			case AuthPasswordEncryption.SHA512:
				if (salt) {
					return createHmac('sha512', salt).update(string).digest('hex')
				} else {
					return createHash('sha512').update(string).digest('hex')
				}
			case AuthPasswordEncryption.MD5:
				if (salt) {
					return createHmac('md5', salt).update(string).digest('hex')
				} else {
					return createHash('md5').update(string).digest('hex')
				}
			case AuthPasswordEncryption.ARGON2:
				return await argon2.hash(string)
			default:
				throw new Error(`Encryption type ${type} not supported`)
		}
	}
}
