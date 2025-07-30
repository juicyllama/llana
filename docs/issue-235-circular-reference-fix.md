# Fix for Issue #235: Circular Reference Error in Auth Endpoints

## Problem

The `/auth/login` and `/auth/refresh` endpoints were throwing a "Converting circular structure to JSON" error. This error occurred because:

1. The methods used `@Res({ passthrough: true })` decorator
2. But then manually called `res.status(200).json()` 
3. This created a conflict where both NestJS and the manual call tried to send the response
4. The manual response call returned the Express response object, which contains circular references
5. NestJS then tried to serialize this response object, causing the circular reference error

## Root Cause

The issue was in the incorrect usage of NestJS response handling patterns:

```typescript
// INCORRECT - causes circular reference error
@Post('/login')
async login(@Res({ passthrough: true }) res: ExpressResponse): Promise<any> {
    // ... logic ...
    return res.status(200).json({ access_token, expires_in, refresh_token_expires_in })
    //     ^^^^^^^^^^^^^^^^^ This returns the Express response object with circular refs
}
```

When using `passthrough: true`, NestJS expects you to:
1. Use the response object for side effects (like setting cookies)
2. Return a plain object that NestJS will serialize and send

## Solution

The fix was to remove the manual response calls and return plain objects instead:

```typescript
// CORRECT - returns plain object
@Post('/login')
async login(@Res({ passthrough: true }) res: ExpressResponse): Promise<any> {
    // ... logic ...
    setAccessAndRefreshTokenCookies(res, access_token, refreshToken) // Side effect: set cookies
    return { access_token, expires_in, refresh_token_expires_in }     // Return plain object
    //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ NestJS serializes this
}
```

## Changes Made

### 1. Fixed `/auth/login` endpoint
- Removed `res.status(200).json()` call
- Return plain object with token data
- Cookies are still set correctly via `setAccessAndRefreshTokenCookies()`

### 2. Fixed `/auth/refresh` endpoint  
- Removed `res.status(200).json()` call
- Return plain object with token data
- For error case: set status with `res.status(401)` and return plain text
- Cookies are still set correctly via `setAccessAndRefreshTokenCookies()`

### 3. Added comprehensive tests
- Created `src/app.controller.auth.circular-reference-fix.test.spec.ts`
- Tests verify that endpoints return plain objects, not Express response objects
- Tests verify that returned objects are JSON serializable (no circular references)
- Tests verify that cookies are still set correctly

## NestJS Response Patterns

For reference, here are the correct NestJS response patterns:

### Pattern 1: Let NestJS handle everything (recommended)
```typescript
@Post('/endpoint')
async endpoint(): Promise<ResponseType> {
    return { data: 'value' } // NestJS handles status code and serialization
}
```

### Pattern 2: Manual response handling
```typescript
@Post('/endpoint')
async endpoint(@Res() res): Promise<void> {
    return res.status(200).json({ data: 'value' }) // Full manual control
}
```

### Pattern 3: Hybrid with passthrough (for side effects)
```typescript
@Post('/endpoint')
async endpoint(@Res({ passthrough: true }) res): Promise<ResponseType> {
    res.cookie('name', 'value') // Side effect: set cookie
    return { data: 'value' }    // NestJS handles serialization
}
```

## Testing

The fix includes comprehensive tests that verify:
- ✅ Endpoints return plain objects instead of Express response objects
- ✅ Returned objects are JSON serializable (no circular references)
- ✅ Cookies are still set correctly
- ✅ Error responses work correctly
- ✅ All existing functionality is preserved

## Backward Compatibility

This fix is fully backward compatible:
- ✅ API response format remains exactly the same
- ✅ Cookie setting behavior is unchanged
- ✅ Error handling behavior is unchanged
- ✅ All existing tests continue to pass

## Files Changed

- `src/app.controller.auth.ts` - Fixed login and refresh methods
- `src/app.controller.auth.circular-reference-fix.test.spec.ts` - Added comprehensive tests
- `docs/issue-235-circular-reference-fix.md` - This documentation
