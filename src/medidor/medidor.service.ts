import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Medidor } from '../../typeorm/entities/medidor.entity';
import { CreateMedidorDto } from './dto/create-medidor.dto';
import { ConfirmMedidorDto } from './dto/confirm-medidor.dto';
import axios from 'axios';

@Injectable()
export class MedidorService {
  constructor(
    @InjectRepository(Medidor)
    public medidorRepository: Repository<Medidor>,
  ) {}

  async uploadMedidor(
    createMedidorDto: CreateMedidorDto,
  ): Promise<{ image_url: any; measure_value: any; medidor_uuid: string }> {
    const { customer_code, measure_type, measure_dateTime } = createMedidorDto;

    // verifica a existencia de uma leitura no mes
    const existingMedidor = await this.medidorRepository.findOne({
      where: {
        customer_code,
        measure_type,
        measure_dateTime: Between(
          new Date(
            new Date(measure_dateTime).getFullYear(),
            new Date(measure_dateTime).getMonth(),
            1,
          ),
          new Date(
            new Date(measure_dateTime).getFullYear(),
            new Date(measure_dateTime).getMonth() + 1,
            0,
          ),
        ),
      },
    });

    if (existingMedidor) {
      throw new ConflictException('Medidor already exists');
    }

    // faz a consulta e busca a imagem

    const geminiResponse = await this.extactMedidaFromImage(
      createMedidorDto.image_url,
    );
    if (!geminiResponse) {
      throw new BadRequestException('Image not recognized');
    }

    const medidor = this.medidorRepository.create({
      customer_code,
      measure_type,
      measure_dateTime: new Date(measure_dateTime),
      measure_value: geminiResponse.measure_value,
      image_url: geminiResponse.image_url,
    });

    await this.medidorRepository.save(medidor);

    return {
      image_url: geminiResponse.image_url,
      measure_value: geminiResponse.measure_value,
      medidor_uuid: medidor.id,
    };
  }
  async confirmMedidor(
    confirmMedidorDto: ConfirmMedidorDto,
  ): Promise<{ success: boolean }> {
    const { measure_uuid, confirmed_value } = confirmMedidorDto;

    const medidor = await this.medidorRepository.findOne({
      where: { id: measure_uuid },
    });

    if (!medidor) {
      throw new NotFoundException('Leitura não encontrada');
    }

    if (medidor.has_confirmed) {
      throw new ConflictException('Leitura já confirmada');
    }

    medidor.measure_value = confirmed_value;
    medidor.has_confirmed = true;

    await this.medidorRepository.save(medidor);

    return { success: true };
  }
  async listMedidores(
    customerCode: string,
    measureType?: string,
  ): Promise<{ customer_code: string; measures: any[] }> {
    const whereCondition: any = { customer_code: customerCode };

    if (measureType) {
      const typeUpper = measureType.toUpperCase();
      if (typeUpper !== 'WATER' && typeUpper !== 'GAS') {
        throw new BadRequestException('Tipo de medição não permitida');
      }
      whereCondition.measure_type = typeUpper;
    }

    const medidores = await this.medidorRepository.find({
      where: whereCondition,
    });

    if (medidores.length === 0) {
      throw new NotFoundException('Nenhuma leitura encontrada');
    }

    return {
      customer_code: customerCode,
      measures: medidores.map((medidor) => ({
        measure_uuid: medidor.id,
        measure_datetime: medidor.measure_dateTime,
        measure_type: medidor.measure_type,
        has_confirmed: medidor.has_confirmed,
        image_url: medidor.image_url,
      })),
    };
  }
  //funcao pra fazer a requisicao para o gemini
  async extactMedidaFromImage(image_url: string) {
    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={AIzaSyBpCr5pVT1KJM5qXCi8LO-jLICm6KSTxsY}',
        {
          image_url,
        },
        {
          headers: {
            Autorization: `Bearer ${process.env.GEMINI_API_KEY}`,
          },
        },
      );

      if (response.status === 200) {
        const { measure_value, image_url } = response.data;
        return { measure_value, image_url };
      }
    } catch {
      return null;
    }
  }
}
