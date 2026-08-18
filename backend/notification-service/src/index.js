const express = require('express');
const { Kafka } = require('kafkajs');
const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/mintoak_analytics';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3003;

async function main() {
  const mongo = new MongoClient(MONGO_URL);
  await mongo.connect();
  const events = mongo.db().collection('transaction_events');

  const redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.error('redis error', err));
  await redis.connect();

  const kafka = new Kafka({
    clientId: 'notification-service',
    brokers: [KAFKA_BROKER],
    retry: { retries: 8 },
  });
  const consumer = kafka.consumer({ groupId: 'notification-service' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'transaction.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      console.log('received transaction.created', payload.id);

      // analytics: append the raw event for later querying
      await events.insertOne({ ...payload, receivedAt: new Date() });

      // cache: running per-merchant transaction count for fast dashboard reads
      await redis.incr(`merchant:${payload.merchantId}:txn_count`);
      await redis.incrByFloat(`merchant:${payload.merchantId}:txn_total`, Number(payload.amount));
    },
  });

  console.log('notification-service consuming transaction.created events');

  // liveness/readiness endpoint for k8s probes
  const app = express();
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));
  app.listen(PORT, () => console.log(`notification-service health endpoint on ${PORT}`));
}

main().catch((err) => {
  console.error('notification-service failed to start', err);
  process.exit(1);
});
