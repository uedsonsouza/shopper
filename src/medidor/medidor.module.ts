import { Module } from '@nestjs/common';
import { MedidorService } from './medidor.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedidorController } from './medidor.controller';
import { Medidor } from '../../typeorm/entities/medidor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Medidor])],
  controllers: [MedidorController],
  providers: [MedidorService],
})
export class MedidorModule {}
