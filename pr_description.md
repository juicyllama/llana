# Improve Response Errors to be More Descriptive

## Description
This PR implements standardized error handling across all datasources with consistent error enums and descriptive messages. It addresses [Issue #150](https://github.com/juicyllama/llana/issues/150) by providing more meaningful errors from requests to controllers when datasources fail.

## Changes
- Added `DatabaseErrorType` enum with common error types (DUPLICATE_RECORD, UNIQUE_KEY_VIOLATION, etc.)
- Updated `IsUniqueResponse` to include an `error` field for descriptive messages
- Enhanced all datasources (MySQL, PostgreSQL, MSSQL, MongoDB, Airtable) to map database-specific errors to standardized types
- Updated controllers to return structured error responses with both `message` (enum value) and `error` (descriptive text) fields
- Added test for duplicate record error response format

## Example Error Response
```json
{
  "message": "DUPLICATE_RECORD",
  "error": "Error inserting record as a duplicate already exists"
}
```

## Testing
- Verified error handling across all datasources
- Ensured consistent error responses regardless of underlying database technology
- Added test case for duplicate record error

Link to Devin run: https://app.devin.ai/sessions/af27b986e35f45abb404cd14469283bf
Requested by: andy@juicyllama.com
