import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  async onModuleInit() {
    const kafka = new Kafka({
      clientId: 'transaction-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { retries: 5 },
    });
    this.producer = kafka.producer();
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async emitTransactionCreated(payload: Record<string, unknown>) {
    await this.producer.send({
      topic: 'transaction.created',
      messages: [{ key: String(payload.merchantId), value: JSON.stringify(payload) }],
    });
  }
}
