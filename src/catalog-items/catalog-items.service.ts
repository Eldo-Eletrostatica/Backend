import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CatalogItem } from "./entities/catalog-item.entity";
import { Repository } from "typeorm";
import { CreateCatalogItemDto } from "./dto/create-catalog-item.dto";
import { UpdateCatalogItemDto } from "./dto/update-catalog-item.dto";

@Injectable()
export class CatalogItemsService {
    constructor(
        @InjectRepository(CatalogItem)
        private readonly catalogItemRepository: Repository<CatalogItem>
    ){}

    async createCatalogItem(dto: CreateCatalogItemDto): Promise<String>{
        const catalogItem = this.catalogItemRepository.create({
            type: dto.type,
            name: dto.name,
            pricePerM2: dto.pricePerM2,
            priceFactor: dto.priceFactor,
            isActive: dto.isActive,
            createdAt: new Date()
        });

        const saved = await this.catalogItemRepository.save(catalogItem);
        return saved.catalogItemId;
    }

    async updateCatalogItem(catalogItemId: string, dto: UpdateCatalogItemDto): Promise<String>{
        let catalogItem = await this.getCatalogItem(catalogItemId)   

        Object.assign(catalogItem, dto);

        catalogItem.updatedAt = new Date();

        const saved = await this.catalogItemRepository.save(catalogItem)
        return saved.catalogItemId;
    }

    async toggleCatalogItem(catalogItemId : string,enabled: boolean): Promise<Boolean>{
        let catalogItem = await this.getCatalogItem(catalogItemId)   

        catalogItem.isActive = enabled;
        catalogItem.updatedAt = new Date();

        await this.catalogItemRepository.save(catalogItem)
        return enabled;
    }

    async deleteCatalogItem(catalogItemId : string): Promise<String>{
        let catalogItem = await this.getCatalogItem(catalogItemId)        

        catalogItem.deletedAt = new Date();

        const saved = await this.catalogItemRepository.save(catalogItem)
        return saved.catalogItemId;
    }

    async getCatalogItem(catalogItemId): Promise<CatalogItem>{
        const catalogItem = await this.catalogItemRepository.findOne({
            where: {catalogItemId}
        });

        if(!catalogItem) throw new NotFoundException("Item não encontrado");

        return catalogItem;
    }
}