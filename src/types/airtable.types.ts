export interface AirtableRecord {
  id: string
  fields: AirtableFields
  createdTime: string
}

export interface AirtableFields {
  [key: string]: any
}
