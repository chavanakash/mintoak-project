import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantsModule } from './merchants/merchants.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'mintoak',
      password: process.env.DB_PASSWORD || 'mintoak',
      database: process.env.DB_NAME || 'mintoak',
      autoLoadEntities: true,
      synchronize: true, // fine for a learning project; use migrations in real prod
    }),
    MerchantsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
