# Composite Unique Constraints

This document describes the composite unique constraint functionality added to resolve GitHub Issue #202.

## Overview

Composite unique constraints allow you to enforce uniqueness across multiple columns together, rather than just individual columns. This is particularly useful for scenarios like:

- User reviews where each user can only review a specific server once (unique combination of `user_id` and `server_id`)
- Order line items where each product can only appear once per order (unique combination of `order_id` and `product_id`)
- User permissions where each user can only have one role per organization (unique combination of `user_id` and `organization_id`)

## How It Works

### Database Schema Discovery

The system automatically detects composite unique constraints from your database schema:

**PostgreSQL:**
```sql
-- Example: Create a composite unique constraint
ALTER TABLE reviews 
ADD CONSTRAINT user_server_review_unique 
UNIQUE (user_id, server_id);
```

**MySQL:**
```sql
-- Example: Create a composite unique constraint
ALTER TABLE reviews 
ADD CONSTRAINT user_server_review_unique 
UNIQUE (user_id, server_id);
```

**SQL Server:**
```sql
-- Example: Create a composite unique constraint
ALTER TABLE reviews 
ADD CONSTRAINT user_server_review_unique 
UNIQUE (user_id, server_id);
```

### API Behavior

When you attempt to create or update a record, the system will:

1. **Check individual unique columns** (if any exist)
2. **Check composite unique constraints** for all constraints where all required columns have values
3. **Return appropriate error messages** that specify which combination of values already exists

### Example Scenarios

#### Scenario 1: Preventing Duplicate Reviews

```javascript
// Database has constraint: UNIQUE (user_id, server_id)

// First review - SUCCESS
POST /api/reviews
{
  "user_id": "user123",
  "server_id": "server456", 
  "rating": 5,
  "comment": "Great server!"
}

// Second review for same user/server - FAILS
POST /api/reviews  
{
  "user_id": "user123",
  "server_id": "server456",
  "rating": 4,
  "comment": "Updated review"
}
// Error: "Record with user_id, server_id user123, server456 already exists"

// Review for same user, different server - SUCCESS
POST /api/reviews
{
  "user_id": "user123", 
  "server_id": "server789",
  "rating": 4,
  "comment": "Another server review"
}

// Review for different user, same server - SUCCESS  
POST /api/reviews
{
  "user_id": "user456",
  "server_id": "server456", 
  "rating": 3,
  "comment": "My review of this server"
}
```

#### Scenario 2: Updating Existing Records

```javascript
// Update existing review - SUCCESS (same record)
PUT /api/reviews/123
{
  "user_id": "user123",
  "server_id": "server456",
  "rating": 4,  // Updated rating
  "comment": "Updated my review"
}

// Update to conflict with another record - FAILS
PUT /api/reviews/123  
{
  "user_id": "user456",  // Changing to different user
  "server_id": "server456", // Same server
  "rating": 4,
  "comment": "Trying to take over someone else's review"
}
// Error: "Record with user_id, server_id user456, server456 already exists"
```

## Technical Implementation

### Schema Structure

The `DataSourceSchema` interface now includes:

```typescript
interface DataSourceSchema {
  table: string
  primary_key: string
  columns: DataSourceSchemaColumn[]
  relations?: DataSourceSchemaRelation[]
  composite_unique_constraints?: DataSourceCompositeUniqueConstraint[]
}

interface DataSourceCompositeUniqueConstraint {
  name: string
  columns: string[]
}
```

### Validation Logic

The uniqueness validation follows this flow:

1. **Individual Column Checks**: Check each column marked as `unique_key: true`
2. **Composite Constraint Checks**: For each composite unique constraint:
   - Check if all columns in the constraint have values in the request data
   - If yes, build a WHERE clause checking all columns together
   - For updates, exclude the current record being updated
   - Return error if any matching records are found

### Error Messages

Composite unique constraint violations return descriptive error messages:

```javascript
{
  "valid": false,
  "message": "DUPLICATE_RECORD",
  "error": "Record with user_id, server_id user123, server456 already exists"
}
```

## Supported Databases

| Database | Composite Constraint Detection | Validation Support |
|----------|-------------------------------|-------------------|
| PostgreSQL | ✅ Full Support | ✅ Full Support |
| MySQL | ✅ Full Support | ✅ Full Support |
| SQL Server | ✅ Full Support | ✅ Full Support |
| MongoDB | ❌ Not Applicable* | ❌ Not Applicable* |
| Airtable | ❌ Not Supported | ❌ Not Supported |

*MongoDB uses compound indexes for similar functionality, but the constraint detection and validation work differently in NoSQL databases.

## Migration Guide

### For Existing Applications

If you're adding composite unique constraints to existing tables:

1. **Add the database constraint** using your database's SQL syntax
2. **Restart your application** to reload the schema with the new constraints
3. **Test the validation** by attempting to create duplicate records

### Breaking Changes

This feature is **backward compatible**. Existing individual unique column validation continues to work exactly as before.

## Troubleshooting

### Common Issues

**Issue**: Composite constraint not being enforced
- **Solution**: Verify the constraint exists in the database and restart the application to reload the schema

**Issue**: Getting "valid: true" when expecting constraint violation
- **Solution**: Check that all columns in the constraint have values in your request data

**Issue**: Individual column check failing before composite check
- **Solution**: This is expected behavior - individual unique columns are checked first

### Debugging

Enable debug logging to see the SQL queries being executed:

```javascript
// The system will log queries like:
// SELECT COUNT(*) as total FROM "reviews" WHERE "user_id" = $1 AND "server_id" = $2
```

## Examples

See the test files for comprehensive examples:
- `src/datasources/composite-unique-constraints.test.spec.ts`
- `src/datasources/issue-202-integration.test.spec.ts`
