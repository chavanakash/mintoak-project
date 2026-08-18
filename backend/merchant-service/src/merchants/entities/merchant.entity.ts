import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessName: string;

  @Column()
  ownerName: string;

  @Column({ unique: true })
  phone: string;

  @Column({ default: 'IN' })
  country: string;

  @Column({ default: 'PENDING' })
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @CreateDateColumn()
  createdAt: Date;
}
