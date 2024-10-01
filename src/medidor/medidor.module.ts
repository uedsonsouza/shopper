import { Module } from '@nestjs/common';
import { MedidorService } from './medidor.service';
import { MedidorController } from './medidor.controller';

@Module({
  controllers: [MedidorController],
  providers: [MedidorService],
})
export class MedidorModule {}
