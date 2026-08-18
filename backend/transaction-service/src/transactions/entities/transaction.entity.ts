import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  merchantId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ default: 'UPI' })
  method: 'UPI' | 'CARD' | 'QR' | 'SMS_LINK';

  @Column({ default: 'SUCCESS' })
  status: 'SUCCESS' | 'FAILED' | 'PENDING';

  @CreateDateColumn()
  createdAt: Date;
}
