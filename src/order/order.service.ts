import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';

@Injectable()
export class OrderService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
  
  create(createOrderDto: CreateOrderDto) {
    return this.order.create({data: createOrderDto});
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalOrder = await this.order.count({
      where: {status: orderPaginationDto.status}
    });

    const currentPage = orderPaginationDto.page;
    const limit = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        skip: (currentPage -1 ) * limit,
        take:limit,
        where: {
          status: orderPaginationDto.status
        }
      }),
      metadata: {
        totalOrder,
        currentPage,
        lastPage: Math.ceil(totalOrder/limit)
      }
    }
  }

  async findOne(id: string) {
    const orderFound = await this.order.findFirst({
      where: {id}
    });

    if(!orderFound){
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND
      })
    }

    return orderFound;
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const {id, status} = changeOrderStatusDto;

    const orderFound = await this.findOne(id);

    if(orderFound.status === status){
      return orderFound
    }

    return this.order.update({
      where: {id},
      data: {
        status
      }
    })
  }

}
