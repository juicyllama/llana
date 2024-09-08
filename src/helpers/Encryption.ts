import { createHash, createHmac } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import * as argon2 from 'argon2'
import * as bcrypt from 'bcrypt'

import { AuthPasswordEncryption } from '../types/auth.types'
import { Logger } from './Logger'

@Injectable()
export class Encryption {
	constructor(private readonly logger: Logger) {}

	/**
	 * Compare a string with an encrypted string
	 */

	async compare(raw: string, encrypted: string, type: AuthPasswordEncryption, salt?: string): Promise<boolean> {
		switch (type) {
			case AuthPasswordEncryption.BCRYPT:
				return await bcrypt.compare(raw, encrypted)
			case AuthPasswordEncryption.SHA1:
			case AuthPasswordEncryption.SHA256:
			case AuthPasswordEncryption.SHA512:
			case AuthPasswordEncryption.MD5:
				return !!((await this.encrypt(type, raw, salt)) === encrypted)
			case AuthPasswordEncryption.ARGON2:
				return await argon2.verify(encrypted, raw)
			default:
				throw new Error(`Encryption type ${type} not supported`)
		}
	}

	/**
	 * Encrypt a string
	 */

	async encrypt(type: AuthPasswordEncryption, string: string, salt?: string): Promise<string> {
		switch (type) {
			case AuthPasswordEncryption.BCRYPT:
				if (!salt) {
					throw new Error(`Encryption type ${type} requires a salt`)
				}
				return await bcrypt.hash(string, salt)
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
