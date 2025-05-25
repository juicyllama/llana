/**
 * Utility to handle circular references in JSON serialization
 */

/**
 * Safely stringify objects with circular references
 * @param obj Object to stringify
 * @returns JSON string representation of the object with circular references handled
 */
export function safeStringify(obj: any): string {
	const seen = new WeakSet()

	return JSON.stringify(obj, (key, value) => {
		if (key === '__proto__') {
			return undefined
		}

		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) {
				return '[Circular Reference]'
			}
			seen.add(value)
		}

		return value
	})
}

/**
 * Safely clone an object, removing circular references
 * @param obj Object to clone
 * @returns Cloned object with circular references removed
 */
export function safeClone(obj: any): any {
	if (obj === null || typeof obj !== 'object') {
		return obj
	}

	const seen = new WeakSet()

	function _clone(source: any): any {
		if (source === null || typeof source !== 'object') {
			return source
		}

		if (seen.has(source)) {
			return '[Circular Reference]'
		}

		seen.add(source)

		const target = Array.isArray(source) ? [] : {}

		for (const key in source) {
			if (Object.prototype.hasOwnProperty.call(source, key) && key !== '__proto__') {
				target[key] = _clone(source[key])
			}
		}

		return target
	}

	return _clone(obj)
}
