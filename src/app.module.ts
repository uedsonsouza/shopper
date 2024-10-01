import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComponentsController } from './components/components.controller';
import { WaterGasConsumptionModule } from './water-gas-consumption/water-gas-consumption.module';
import { MedidorModule } from './medidor/medidor.module';
import { WaterGasConsumptionModule } from './water-gas-consumption/water-gas-consumption.module';

@Module({
  imports: [WaterGasConsumptionModule, MedidorModule],
  controllers: [AppController, ComponentsController],
  providers: [AppService],
})
export class AppModule {}
