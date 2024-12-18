import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'
import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { CustomerTestingService } from './testing/customer.testing.service'
import { DatabaseTestingService } from './testing/database.testing.service'
import { EmployeeTestingService } from './testing/employee.testing.service'
import { SalesOrderTestingService } from './testing/salesorder.testing.service'
import { ShipperTestingService } from './testing/shipper.testing.service'
import { Logger } from './helpers/Logger'
import { Schema } from './helpers/Schema'
import { DataSourceSchema } from './types/datasource.types'

const TIMEOUT = 30000

describe('App > Controller > Get', () => {
    let app: INestApplication
    let moduleRef: TestingModule
    let authTestingService: AuthTestingService
    let customerTestingService: CustomerTestingService
    let employeeTestingService: EmployeeTestingService
    let salesOrderTestingService: SalesOrderTestingService
    let shipperTestingService: ShipperTestingService
    let databaseTestingService: DatabaseTestingService
    let schema: Schema
    let logger: Logger

    let jwt: string
    let customer: any
    let employee: any
    let shipper: any
    let orders: any[] = []
    let customerSchema: DataSourceSchema
    let employeeSchema: DataSourceSchema
    let shipperSchema: DataSourceSchema
    let salesOrderSchema: DataSourceSchema

    beforeAll(async () => {
        try {
            logger = new Logger()
            logger.log('Setting up test module...', 'test')

            moduleRef = await Test.createTestingModule({
                imports: [AppModule],
            }).compile()

            app = moduleRef.createNestApplication()
            await app.init()

            // Initialize services
            authTestingService = moduleRef.get(AuthTestingService)
            customerTestingService = moduleRef.get(CustomerTestingService)
            employeeTestingService = moduleRef.get(EmployeeTestingService)
            salesOrderTestingService = moduleRef.get(SalesOrderTestingService)
            shipperTestingService = moduleRef.get(ShipperTestingService)
            databaseTestingService = moduleRef.get(DatabaseTestingService)
            schema = moduleRef.get(Schema)

            // Get schemas
            customerSchema = await schema.getSchema({ table: 'Customer' })
            employeeSchema = await schema.getSchema({ table: 'Employee' })
            shipperSchema = await schema.getSchema({ table: 'Shipper' })
            salesOrderSchema = await schema.getSchema({ table: 'SalesOrder' })

            if (!customerSchema || !employeeSchema || !shipperSchema || !salesOrderSchema) {
                throw new Error('Failed to load required schemas')
            }

            // Create test data
            logger.log('Creating test data...', 'test')
            customer = await customerTestingService.createCustomer({})
            employee = await employeeTestingService.createEmployee({})
            shipper = await shipperTestingService.createShipper({})

            // Create test orders
            for (let i = 0; i < 3; i++) {
                const order = await salesOrderTestingService.createOrder({
                    custId: customer[customerSchema.primary_key],
                    employeeId: employee[employeeSchema.primary_key],
                    shipperId: shipper[shipperSchema.primary_key],
                })
                orders.push(order)
            }

            // Get authentication token
            jwt = await authTestingService.login()
            logger.log('Test setup complete', 'test')
        } catch (error) {
            logger.error(`Failed to initialize test module: ${error}`, 'test')
            if (app) await app.close()
            throw error
        }
    }, TIMEOUT)

    describe('Get', () => {
        beforeEach(() => {
            logger.debug('===========================================')
            logger.log('🧪 Running test: ' + expect.getState().currentTestName, 'test')
            logger.debug('===========================================')
        })

        it('should get a single record by primary key', async () => {
            try {
                const result = await request(app.getHttpServer())
                    .get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(200)

                expect(result.body).toBeDefined()
                expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
                expect(result.body.custId).toBeDefined()
                expect(result.body.employeeId).toBeDefined()
                expect(result.body.shipperId).toBeDefined()
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })

        it('should get a single record with related Customer data', async () => {
            try {
                const result = await request(app.getHttpServer())
                    .get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}?relations=Customer`)
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(200)

                expect(result.body).toBeDefined()
                expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
                expect(result.body.Customer).toBeInstanceOf(Array)
                expect(result.body.Customer[0]).toBeDefined()
                expect(result.body.Customer[0][customerSchema.primary_key]).toBeDefined()
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })

        it('should get a single record with specific fields only', async () => {
            try {
                const result = await request(app.getHttpServer())
                    .get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}?fields=custId`)
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(200)

                expect(result.body).toBeDefined()
                expect(result.body.custId).toBeDefined()
                expect(result.body.employeeId).toBeUndefined()
                expect(result.body.shipperId).toBeUndefined()
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })

        it('should handle non-existent record gracefully', async () => {
            try {
                await request(app.getHttpServer())
                    .get('/SalesOrder/999999999')
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(404)
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })
    })

    describe('List', () => {
        it('should get all records with pagination', async () => {
            try {
                const result = await request(app.getHttpServer())
                    .get('/SalesOrder/')
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(200)

                expect(result.body).toBeDefined()
                expect(result.body.total).toBeDefined()
                expect(result.body.total).toBeGreaterThan(0)
                expect(result.body.data).toBeInstanceOf(Array)
                expect(result.body.data.length).toBeGreaterThan(0)
                expect(result.body.data[0][salesOrderSchema.primary_key]).toBeDefined()
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })

        it('should get records with related Customer data', async () => {
            try {
                const result = await request(app.getHttpServer())
                    .get('/SalesOrder/?relations=Customer')
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(200)

                expect(result.body).toBeDefined()
                expect(result.body.total).toBeDefined()
                expect(result.body.data).toBeInstanceOf(Array)
                expect(result.body.data[0].Customer).toBeInstanceOf(Array)
                expect(result.body.data[0].Customer[0][customerSchema.primary_key]).toBeDefined()
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })

        it('should respect pagination limits', async () => {
            try {
                const limit = 2
                const result = await request(app.getHttpServer())
                    .get(`/SalesOrder/?limit=${limit}`)
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(200)

                expect(result.body).toBeDefined()
                expect(result.body.limit).toBe(limit)
                expect(result.body.data).toHaveLength(limit)
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })

        it('should handle offset pagination', async () => {
            try {
                const offset = 1
                const result = await request(app.getHttpServer())
                    .get(`/SalesOrder/?offset=${offset}`)
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(200)

                expect(result.body).toBeDefined()
                expect(result.body.offset).toBe(offset)
                expect(result.body.data.length).toBeLessThanOrEqual(result.body.total)
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })

        it('should handle invalid pagination parameters gracefully', async () => {
            try {
                await request(app.getHttpServer())
                    .get('/SalesOrder/?limit=invalid')
                    .set('Authorization', `Bearer ${jwt}`)
                    .expect(400)
            } catch (error) {
                logger.error(`Test failed: ${error.message}`, 'test')
                throw error
            }
        })
    })

    afterAll(async () => {
        try {
            logger.log('Cleaning up test data...', 'test')
            // Clean up orders first due to foreign key constraints
            for (const order of orders) {
                if (order && order[salesOrderSchema.primary_key]) {
                    await salesOrderTestingService.deleteOrder(order[salesOrderSchema.primary_key])
                }
            }

            // Clean up other test data
            if (customer && customerSchema) {
                await customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
            }
            if (employee && employeeSchema) {
                await employeeTestingService.deleteEmployee(employee[employeeSchema.primary_key])
            }
            if (shipper && shipperSchema) {
                await shipperTestingService.deleteShipper(shipper[shipperSchema.primary_key])
            }
        } catch (error) {
            logger.error(`Cleanup failed: ${error.message}`, 'test')
        } finally {
            if (app) {
                await app.close()
            }
        }
    }, TIMEOUT)
})
