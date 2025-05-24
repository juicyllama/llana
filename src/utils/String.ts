/**
 * Replace ? symbols with the values from a any[]
 */

import { CronExpression } from '@nestjs/schedule'

export function replaceQ(string: string, array: any[]): string {
	//if(!array.length) return string
	//return string.replace(/\?/g, () => array.shift() || '')
	let i = 0
	return string.replace(/\?/g, function () {
		const value = array[i++]
		if (typeof value === 'string') {
			return `'${value.replace(/'/g, "''")}'`
		}
		if (value === null) {
			return 'NULL'
		}
		return value
	})
	//return string
}

/**
 * Returns the plural of an English word.
 *
 * @export
 * @param {string} word
 * @param {number} [amount]
 * @returns {string}
 */
export function plural(word: string, amount?: number): string {
	if (amount !== undefined && amount === 1) {
		return word
	}
	const plural: { [key: string]: string } = {
		'(quiz)$': '$1zes',
		'^(ox)$': '$1en',
		'([m|l])ouse$': '$1ice',
		'(matr|vert|ind)ix|ex$': '$1ices',
		'(x|ch|ss|sh)$': '$1es',
		'([^aeiouy]|qu)y$': '$1ies',
		'(hive)$': '$1s',
		'(?:([^f])fe|([lr])f)$': '$1$2ves',
		'(shea|lea|loa|thie)f$': '$1ves',
		sis$: 'ses',
		'([ti])um$': '$1a',
		'(tomat|potat|ech|her|vet)o$': '$1oes',
		'(bu)s$': '$1ses',
		'(alias)$': '$1es',
		'(octop)us$': '$1i',
		'(ax|test)is$': '$1es',
		'(us)$': '$1es',
		'([^s]+)$': '$1s',
	}
	const irregular: { [key: string]: string } = {
		move: 'moves',
		foot: 'feet',
		goose: 'geese',
		sex: 'sexes',
		child: 'children',
		man: 'men',
		tooth: 'teeth',
		person: 'people',
	}
	const uncountable: string[] = [
		'sheep',
		'fish',
		'deer',
		'moose',
		'series',
		'species',
		'money',
		'rice',
		'information',
		'equipment',
		'bison',
		'cod',
		'offspring',
		'pike',
		'salmon',
		'shrimp',
		'swine',
		'trout',
		'aircraft',
		'hovercraft',
		'spacecraft',
		'sugar',
		'tuna',
		'you',
		'wood',
	]
	// save some time in the case that singular and plural are the same
	if (uncountable.indexOf(word.toLowerCase()) >= 0) {
		return word
	}
	// check for irregular forms
	for (const w in irregular) {
		const pattern = new RegExp(`${w}$`, 'i')
		const replace = irregular[w]
		if (pattern.test(word)) {
			return word.replace(pattern, replace)
		}
	}
	// check for matches using regular expressions
	for (const reg in plural) {
		const pattern = new RegExp(reg, 'i')
		if (pattern.test(word)) {
			return word.replace(pattern, plural[reg])
		}
	}
	return word
}

/**
 * Convert a comma separated string to an array
 */

export function commaStringToArray(string: string): string[] {
	if (!string) {
		return []
	}

	return string.split(',').map(field => field.trim())
}

/**
 * Convert a CronExpression to seconds
 */

export function cronToSeconds(cron: CronExpression): number {
	switch (cron) {
		case CronExpression.EVERY_10_SECONDS:
			return 10
		case CronExpression.EVERY_30_SECONDS:
			return 30
		case CronExpression.EVERY_MINUTE:
			return 60
		case CronExpression.EVERY_5_MINUTES:
			return 300
		case CronExpression.EVERY_HOUR:
			return 3600
		case CronExpression.EVERY_2ND_HOUR:
			return 7200
		case CronExpression.EVERY_DAY_AT_MIDNIGHT:
			return 86400
		case CronExpression.EVERY_WEEK:
			return 604800
		case CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT:
		case CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON:
			return 2592000
		case CronExpression.EVERY_2ND_MONTH:
		case CronExpression.EVERY_QUARTER:
			return 7776000
		case CronExpression.EVERY_6_MONTHS:
			return 15552000
		case CronExpression.EVERY_YEAR:
			return 31536000
		default:
			throw new Error(`Unknown CronExpression: ${cron}`)
	}
}
