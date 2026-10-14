import { ServiceOrderStatus } from '../entities/service-order.entity';

export interface UpdateServiceOrderStatusDto {
  status: ServiceOrderStatus;
}
