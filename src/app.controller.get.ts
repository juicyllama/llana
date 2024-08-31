import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { FindService } from './app.service.find';
import { Logger, context } from './helpers/Logger';
import { UrlToTable } from './helpers/Database';
import { Schema } from './helpers/Schema';
import { GetResponseObject, ListResponseObject } from './types/response.types';
import { Authentication } from './helpers/Authentication';
import { Pagination } from './helpers/Pagination';
import { Sort } from './helpers/Sort';

@Controller()
export class GetController {
	constructor(
		private readonly pagination: Pagination,
		private readonly service: FindService,
		private readonly logger: Logger,
		private readonly schema: Schema,
		private readonly sort: Sort,
		private readonly authentication: Authentication
	) {
		logger.setContext(context)
	}

	@Get('')
	getDocs(@Res() res): string {
		this.logger.log('docs')
		return res.send(`
        <link rel="icon" href="/favicon.ico">
        <h1>Docs</h1>`
		);
	}

	@Get('/favicon.ico')
	fav(@Res() res): string {
		return res.sendFile('favicon.ico', { root: 'public' });
	}

	@Get('*/list')
	async list(@Req() req, @Res() res): Promise<ListResponseObject> {

		const table_name = UrlToTable(req.originalUrl, 1)

		let schema

		try {
			schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send('Endpoint not found')
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(403).send(auth.message)
		}

		const { limit, offset } = this.pagination.get(req.query)

		let validateFields
		if (req.query.fields) {
			validateFields = this.schema.validateFields(schema, req.query.fields)
			if (!validateFields.valid) {
				return res.status(400).send(validateFields.message)
			}
		}

		const validateWhere = this.schema.validateWhereParams(schema, req.query)
		if (!validateWhere.valid) {
			return res.status(400).send(validateWhere.message)
		}

		let validateRelations
		if (req.query.relations) {
			validateRelations = await this.schema.validateRelations(schema, req.query.relations)
			if (!validateRelations.valid) {
				return res.status(400).send(validateRelations.message)
			}

			for (const relation of validateRelations.params) {
				const relation_schema = await this.schema.getSchema(relation)
				if (!relation_schema) {
					return res.status(400).send(`Relation ${relation} not found`)
				}

				const relation_fields = req.query.fields.split(',').filter(field => field.includes(relation))
				const relation_fields_no_prefix = relation_fields.map(field => field.replace(`${relation}.`, ''))

				if(relation_fields_no_prefix.length > 0){
					const validateRelationFields = this.schema.validateFields(relation_schema, relation_fields_no_prefix.join(','))
					if (!validateRelationFields.valid) {
						return res.status(400).send(validateRelationFields.message)
					}
				}

				const relationship_where_fields = Object.keys(req.query)	
				.filter(key => key.includes(`${relation}.`))
				.map(key => key.replace(`${relation}.`, ''))
				.reduce((obj, key) => {
					obj[key] = req.query[`${relation}.${key}`];
					return obj;
				  }, {});

				if(relationship_where_fields){
					const relationshipValidateWhere = this.schema.validateWhereParams(relation_schema, relationship_where_fields)
					if (!relationshipValidateWhere.valid) {
						return res.status(400).send(relationshipValidateWhere.message)
					}

					for(const r in relationshipValidateWhere.where){
						relationshipValidateWhere.where[r].column = `${relation}.${relationshipValidateWhere.where[r].column}`
					}

					validateWhere.where = validateWhere.where.concat(relationshipValidateWhere.where)
				}

				const relationship_sort_fields = req.query.sort.split(',').filter(key => key.includes(`${relation}.`))
				if(relationship_sort_fields.length > 0){
					const validateOrder = this.schema.validateOrder(relation_schema, relationship_sort_fields.join(', '))
					if (!validateOrder.valid) {
						return res.status(400).send(validateOrder.message)
					}
				}
			}
		}

		let validateOrder
		if (req.query.sort) {
			validateOrder = this.schema.validateOrder(schema, req.query.sort)
			if (!validateOrder.valid) {
				return res.status(400).send(validateOrder.message)
			}
		}

		return res.status(200).send(await this.service.findMany({
			schema,
			fields: req.query.fields,
			relations: req.query.relations,
			where: validateWhere.where,
			limit,
			offset,
			sort: this.sort.createSortArray(req.query.sort),
		}))
	}

	@Get('*/:id')
	async getById(@Req() req, @Res() res): Promise<GetResponseObject> {

		const table_name = UrlToTable(req.originalUrl, 1)

		let schema

		try {
			schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send('Endpoint not found')
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(403).send(auth.message)
		}

		//validate :id field
		const primary_key = this.schema.getPrimaryKey(schema)

		if (!primary_key) {
			return res.status(400).send(`No primary key found for table ${table_name}`)
		}

		const validateKey = this.schema.validateColumnData(schema, primary_key, req.params.id)
		if (!validateKey.valid) {
			return res.status(400).send(validateKey.message)
		}

		let validateFields
		if (req.query.fields) {
			validateFields = this.schema.validateFields(schema, req.query.fields)
			if (!validateFields.valid) {
				return res.status(400).send(validateFields.message)
			}
		}

		let validateRelations
		if (req.query.relations) {
			validateRelations = await this.schema.validateRelations(schema, req.query.relations)
			if (!validateRelations.valid) {
				return res.status(400).send(validateRelations.message)
			}
		}

		return res.status(200).send(await this.service.findById({
			schema,
			id: req.params.id,
			fields: req.query.fields,
			relations: req.query.relations
		}))

	}

	@Get('*/')
	async getOne(@Req() req, @Res() res): Promise<ListResponseObject> {

		const table_name = UrlToTable(req.originalUrl, 1)

		let schema

		try {
			schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send('Endpoint not found')
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(403).send(auth.message)
		}

		let validateFields
		if (req.query.fields) {
			validateFields = this.schema.validateFields(schema, req.query.fields)
			if (!validateFields.valid) {
				return res.status(400).send(validateFields.message)
			}
		}

		const validateWhere = this.schema.validateWhereParams(schema, req.query)
		if (!validateWhere.valid) {
			return res.status(400).send(validateWhere.message)
		}

		let validateRelations
		if (req.query.relations) {
			validateRelations = await this.schema.validateRelations(schema, req.query.relations)
			if (!validateRelations.valid) {
				return res.status(400).send(validateRelations.message)
			}

			for (const relation of validateRelations.params) {
				const relation_schema = await this.schema.getSchema(relation)
				if (!relation_schema) {
					return res.status(400).send(`Relation ${relation} not found`)
				}

				const relation_fields = req.query.fields.split(',').filter(field => field.includes(relation))
				const relation_fields_no_prefix = relation_fields.map(field => field.replace(`${relation}.`, ''))

				if(relation_fields_no_prefix.length > 0){
					const validateRelationFields = this.schema.validateFields(relation_schema, relation_fields_no_prefix.join(','))
					if (!validateRelationFields.valid) {
						return res.status(400).send(validateRelationFields.message)
					}
				}

				const relationship_where_fields = Object.keys(req.query)	
				.filter(key => key.includes(`${relation}.`))
				.map(key => key.replace(`${relation}.`, ''))
				.reduce((obj, key) => {
					obj[key] = req.query[`${relation}.${key}`];
					return obj;
				  }, {});

				if(relationship_where_fields){
					const relationshipValidateWhere = this.schema.validateWhereParams(relation_schema, relationship_where_fields)
					if (!relationshipValidateWhere.valid) {
						return res.status(400).send(relationshipValidateWhere.message)
					}

					for(const r in relationshipValidateWhere.where){
						relationshipValidateWhere.where[r].column = `${relation}.${relationshipValidateWhere.where[r].column}`
					}

					validateWhere.where = validateWhere.where.concat(relationshipValidateWhere.where)
				}
			}
		}

		return res.status(200).send(await this.service.findOne({
			schema,
			fields: req.query.fields,
			relations: req.query.relations,
			where: validateWhere.where
		}))

	}

}
