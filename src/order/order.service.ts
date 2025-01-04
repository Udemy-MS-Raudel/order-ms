import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { PRODUCT_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService extends PrismaClient implements OnModuleInit {

  constructor(@Inject(PRODUCT_SERVICE) private readonly client: ClientProxy){
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }
  
  async create(createOrderDto: CreateOrderDto) {
    try {

      //1. Coger los ids de los productos solamente 
      //Este puede tener varios IDs repetidos ya que u producto con un mismo id tenga diferentes tallas 
      const productsIds = createOrderDto.items.map(item => item.productId)

      //2. Pasar los ids al producto para verificar si existen
      //Aqui no hay Ids repetidos porque estos Ids fueron con un new Set purgados para que no se repita
      //Por eso abajo cojo el productsIds que tiene todos
      const products =  await firstValueFrom(this.client.send('validate.products.ids', productsIds))

      // console.log(products);
      
      //3.Calculo de valores total dinero
      const totalAmount = createOrderDto.items.reduce((acc, orderItem)=>{
        const price = products.find(product=> product.id === orderItem.productId).price;

        return acc + (price * orderItem.quantity);
      }, 0)

      //4. Calculo valores total items
      const totalItems = createOrderDto.items.reduce((acc, orderItem)=>{
        return acc + orderItem.quantity
      }, 0)


      //5. Crear la transaccion en la base de datos
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem)=> {
                const item = {
                  productId: orderItem.productId,
                  quantity: orderItem.quantity,
                  price: products.find(product=> product.id === orderItem.productId).price,
                }
                return item
              })
            }
          }
        },
        include: {
          //Esto me devuelve todo
          // OrderItem: true
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      })
      return {
        ...order,
        OrderItem: order.OrderItem.map( item => ({
          ...item,
          name: products.find(product => product.id === item.productId).name
        }))
      };

    } catch (error) {
      throw new RpcException(error)
    }
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
      where: {id},
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          }
        }
      }
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
