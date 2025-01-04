import { OrderStatus } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsPositive, Min } from "class-validator";
import { OrderStatusList } from "../enum/order.enum";

export class CreateOrderDto {

  @IsNumber({
    maxDecimalPlaces: 2
  })
  @IsPositive()
  @Min(0.1)
  totalAmount: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  totalItems: number;

  @IsEnum(OrderStatusList, {
    message: `Possible status values are ${OrderStatusList}`
  })
  @IsOptional()
  status: OrderStatus = OrderStatus.PENDING;

}
