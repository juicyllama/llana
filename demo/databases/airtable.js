import Airtable from 'airtable'
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
	throw new Error('Missing required Airtable environment variables')
}

export async function createRecords(records) {
	const tableName = process.env.AIRTABLE_TABLE_NAME || 'Table Name'

	try {
		const createdRecords = await base(tableName).create(records)
		logger.info('Records created successfully', {
			count: createdRecords.length,
			recordIds: createdRecords.map(record => record.getId()),
		})
		return createdRecords
	} catch (error) {
		logger.error('Failed to create records', {
			error: error.message,
			records,
		})
		throw error
	}
}

// Example usage:
const exampleRecords = [
	{
		fields: {
			'Field 1': 'Value 1',
			'Field 2': 'Value 2',
		},
	},
	{
		fields: {
			'Field 1': 'Value 3',
			'Field 2': 'Value 4',
		},
	},
]

// Export example for testing
export const example = async () => {
	try {
		const createdRecords = await createRecords(exampleRecords)
		logger.info('Records created successfully', {
			count: createdRecords.length,
			recordIds: createdRecords.map(record => record.getId()),
		})
		return createdRecords
	} catch (error) {
		logger.error('Failed to create records', {
			error: error.message,
			records: exampleRecords,
		})
		throw error
	}
}
