/**
 * Find an element in an object with a . notation
 */

export function findDotNotation(obj: any, search: string): boolean {
	return search.split('.').reduce((o, i) => o[i], obj)
}
