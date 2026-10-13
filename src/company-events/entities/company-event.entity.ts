import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_events')
export class CompanyEvent {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_company_events',
  })
  companyEventId: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Orders the timeline on the site.
  @Column({ type: 'date' })
  eventDate: string;

  @Column({ type: 'text' })
  imageUrl: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
