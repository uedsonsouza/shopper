import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Medidor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customer_code: string;

  @Column('decimal')
  measure_value: number;

  @Column()
  measure_type: string; //agua ou gas

  @CreateDateColumn()
  measure_dateTime: Date;

  @Column()
  image_url: string;

  @Column({ default: false })
  has_confirmed: boolean;
}
