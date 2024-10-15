import {
  Controller,
  Post,
  Body,
  ConflictException,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { MedidorService } from './medidor.service';
import { CreateMedidorDto } from './dto/create-medidor.dto';

@Controller('medidor')
export class MedidorController {
  constructor(private readonly medidorService: MedidorService) {}

  @Post('upload')
  async uploadMedidor(@Body() createMedidorDto: CreateMedidorDto) {
    try {
      await this.medidorService.uploadMedidor(createMedidorDto);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Customer code already exists');
      } else {
        throw new BadRequestException(error.message);
      }
    }
  }
}