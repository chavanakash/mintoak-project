import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { CreateMerchantDto } from './dto/create-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant) private readonly repo: Repository<Merchant>,
  ) {}

  create(dto: CreateMerchantDto) {
    const merchant = this.repo.create(dto);
    return this.repo.save(merchant);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const merchant = await this.repo.findOne({ where: { id } });
    if (!merchant) throw new NotFoundException(`Merchant ${id} not found`);
    return merchant;
  }
}
