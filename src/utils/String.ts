/**
 * Replace ? symbols with the values from a any[]
 */

export function replaceQ(string: string, array: any[]): string {
	//if(!array.length) return string
	//return string.replace(/\?/g, () => array.shift() || '')
	let i = 0;
	return string.replace(/\?/g,function(){return array[i++]})
	//return string
}
