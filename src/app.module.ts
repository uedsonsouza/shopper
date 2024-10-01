import { Module } from '@nestjs/common';
import { MedidorModule } from './medidor/medidor.module';
import { MedidorController } from './medidor/medidor.controller';
import { MedidorService } from './medidor/medidor.service';
@Module({
  imports: [MedidorModule],
  controllers: [MedidorController],
  providers: [MedidorService],
})
export class AppModule {}
