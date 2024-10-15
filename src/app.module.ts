import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedidorService } from './medidor/medidor.service';
import { Medidor } from '../typeorm/entities/medidor.entity';
import { MedidorController } from './medidor/medidor.controller';
import { MedidorModule } from './medidor/medidor.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [Medidor],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Medidor]),
    MedidorModule,
  ],
  providers: [MedidorService],
  controllers: [MedidorController],

  exports: [MedidorService],
})
export class AppModule {}
