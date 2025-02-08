import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CustomerService } from '../services/customer.service';
import { EmployeeService } from '../services/employee.service';
import { ShipperService } from '../services/shipper.service';
import { Customer } from '../models/customer.model';
import { Employee } from '../models/employee.model';
import { Shipper } from '../models/shipper.model';
import { CustomerInput } from '../dto/customer.input';
import { EmployeeInput } from '../dto/employee.input';
import { ShipperInput } from '../dto/shipper.input';

@Resolver()
export class Resolvers {
  constructor(
    private readonly customerService: CustomerService,
    private readonly employeeService: EmployeeService,
    private readonly shipperService: ShipperService,
  ) {}

  @Query(() => Customer)
  async getCustomer(@Args('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Query(() => [Customer])
  async getCustomers() {
    return this.customerService.findAll();
  }

  @Mutation(() => Customer)
  async createCustomer(@Args('input') input: CustomerInput) {
    return this.customerService.create(input);
  }

  @Mutation(() => Customer)
  async updateCustomer(@Args('id') id: string, @Args('input') input: CustomerInput) {
    return this.customerService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteCustomer(@Args('id') id: string) {
    return this.customerService.delete(id);
  }

  @Query(() => Employee)
  async getEmployee(@Args('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Query(() => [Employee])
  async getEmployees() {
    return this.employeeService.findAll();
  }

  @Mutation(() => Employee)
  async createEmployee(@Args('input') input: EmployeeInput) {
    return this.employeeService.create(input);
  }

  @Mutation(() => Employee)
  async updateEmployee(@Args('id') id: string, @Args('input') input: EmployeeInput) {
    return this.employeeService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteEmployee(@Args('id') id: string) {
    return this.employeeService.delete(id);
  }

  @Query(() => Shipper)
  async getShipper(@Args('id') id: string) {
    return this.shipperService.findOne(id);
  }

  @Query(() => [Shipper])
  async getShippers() {
    return this.shipperService.findAll();
  }

  @Mutation(() => Shipper)
  async createShipper(@Args('input') input: ShipperInput) {
    return this.shipperService.create(input);
  }

  @Mutation(() => Shipper)
  async updateShipper(@Args('id') id: string, @Args('input') input: ShipperInput) {
    return this.shipperService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteShipper(@Args('id') id: string) {
    return this.shipperService.delete(id);
  }
}
