import {
  Controller,
  Post,
  Patch,
  Body,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MedidorService } from './medidor.service';
import { CreateMedidorDto } from './dto/create-medidor.dto';
import { ConfirmMedidorDto } from './dto/confirm-medidor.dto';

@Controller('medidor')
export class MedidorController {
  constructor(private readonly medidorService: MedidorService) {}

  @Post('upload')
  async uploadMedidor(@Body() createMedidorDto: CreateMedidorDto) {
    try {
      return await this.medidorService.uploadMedidor(createMedidorDto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      } else {
        throw new BadRequestException(error.message);
      }
    }
  }

  @Patch('confirm')
  async confirmMedidor(@Body() confirmMedidorDto: ConfirmMedidorDto) {
    try {
      return await this.medidorService.confirmMedidor(confirmMedidorDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      } else {
        throw new BadRequestException(error.message);
      }
    }
  }
}
