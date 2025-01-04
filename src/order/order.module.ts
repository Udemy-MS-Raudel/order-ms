import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs, PRODUCT_SERVICE } from 'src/config';

@Module({
  controllers: [OrderController],
  providers: [OrderService],
  imports: [
    ClientsModule.register([
      { 
        name: PRODUCT_SERVICE, 
        transport: Transport.TCP,
        options: {
          host: envs.productMicroHost,
          port: envs.productMicroPort
        }
      },
    ]),
  ],
})
export class OrderModule {}
