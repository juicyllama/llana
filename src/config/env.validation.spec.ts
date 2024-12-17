import { envValidationSchema } from './env.validation'

describe('Environment Validation', () => {
	describe('PORT validation', () => {
		it('should default PORT to 3000 when blank', () => {
			const result = envValidationSchema.validate({
				PORT: '',
				DATABASE_URI: 'mongodb://localhost:27017/test',
			})
			expect(result.error).toBeUndefined()
			expect(result.value.PORT).toBe(3000)
		})

		it('should accept numeric string PORT value', () => {
			const result = envValidationSchema.validate({
				PORT: '8080',
				DATABASE_URI: 'mongodb://localhost:27017/test',
			})
			expect(result.error).toBeUndefined()
			expect(result.value.PORT).toBe(8080)
		})

		it('should accept number PORT value', () => {
			const result = envValidationSchema.validate({
				PORT: 9090,
				DATABASE_URI: 'mongodb://localhost:27017/test',
			})
			expect(result.error).toBeUndefined()
			expect(result.value.PORT).toBe(9090)
		})

		it('should default PORT to 3000 when undefined', () => {
			const result = envValidationSchema.validate({
				DATABASE_URI: 'mongodb://localhost:27017/test',
			})
			expect(result.error).toBeUndefined()
			expect(result.value.PORT).toBe(3000)
		})

		it('should reject invalid PORT values', () => {
			const result = envValidationSchema.validate({
				PORT: 'invalid',
				DATABASE_URI: 'mongodb://localhost:27017/test',
			})
			expect(result.error).toBeDefined()
			expect(result.error?.message).toContain('PORT')
		})
	})
})
