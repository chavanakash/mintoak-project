import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    private readonly kafka: KafkaProducerService,
  ) {}

  async create(dto: CreateTransactionDto) {
    const txn = this.repo.create(dto);
    const saved = await this.repo.save(txn);
    await this.kafka.emitTransactionCreated(saved as unknown as Record<string, unknown>);
    return saved;
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const txn = await this.repo.findOne({ where: { id } });
    if (!txn) throw new NotFoundException(`Transaction ${id} not found`);
    return txn;
  }
}
