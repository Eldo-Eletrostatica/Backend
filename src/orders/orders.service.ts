import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { Order, OrderStatus } from "./entities/order.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Repository } from "typeorm";
import { EstimatedQuoteDto } from "./dto/estimated-quote.dto";
import { CreateOrderItemDto } from "./dto/create-order-item.dto";
import { OrderItem } from "./entities/order-item.entity";
import { SiteSettingsService } from "src/site-settings/site-settings.service";


@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,

        private readonly siteSettingsService: SiteSettingsService
        
    ){}

    async createOrder(dto: CreateOrderDto): Promise<String>{
        const order = this.orderRepository.create({
            customerId: dto.customerId,
            source: dto.source,
            customerMessage: dto.customerMessage,
            pdfUrl: dto.pdfUrl,
            createdAt: new Date(),
            status: OrderStatus.Requested,
            dueDate: dto.dueDate
        });

        const saved = await this.orderRepository.save(order);
        return saved.orderId;
    }

    async createOrderItem(dto: CreateOrderItemDto): Promise<String>{
        const orderItem = this.orderItemRepository.create({
            orderId: dto.orderId,
            materialCatalogItemId: dto.materialCatalogItemId,
            paintCatalogItemId: dto.paintCatalogItemId,
            areaM2: dto.areaM2,
            quantity: dto.quantity,
            pricePerM2: dto.pricePerM2,
            priceFactor: dto.priceFactor,
            createdAt: new Date()
        });

        const saved = await this.orderItemRepository.save(orderItem);
        return saved.orderItemId;
    }

    // Gera estimativa de orçamento
    async estimateQuote(orderId: string): Promise<EstimatedQuoteDto> {
        if(! this.siteSettingsService.getIsEstimatorEnabled()) throw new EstimatorNotAllowedException();

        const order = await this.orderRepository.findOne({
            where: { orderId }
        });

        if(!order) throw new NotFoundException("Pedido não encontrado");

        const orderItems = await this.orderItemRepository.find({
            where: {orderId: orderId}
        });

        let total = 0;

        orderItems.forEach((item) => {
            let itemPriceMul = 0;

            if(item.pricePerM2) itemPriceMul = item.pricePerM2;
            else itemPriceMul = item.priceFactor;

            total += item.areaM2 * itemPriceMul * item.quantity;
        })

        const margin = (await this.siteSettingsService.getNegotiationMargin()).valueOf();
        const marginFactor = margin + 1

        return {
            orderId: orderId,
            createdAt: new Date(),
            lowerBound: total,
            upperBound: total * marginFactor
        };
    }
}

export class EstimatorNotAllowedException extends HttpException {
    constructor(){
        super('Estimator is not allowed', HttpStatus.METHOD_NOT_ALLOWED)
    }
}