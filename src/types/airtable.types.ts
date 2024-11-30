export interface AirtableRecord<T = any> {
	id: string
	fields: AirtableFields<T>
	createdTime: string
}

export interface AirtableFields<T = any> {
	[K in keyof T]: T[K];
}

// Usage example:
interface MyRecordFields {
	name: string;
	age: number;
	isActive: boolean;
}

// Now you can use it like:
// const record: AirtableRecord<MyRecordFields>
