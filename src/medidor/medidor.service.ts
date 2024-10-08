import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Medidor } from './entities/medidor.entity';
import { CreateMedidorDto } from './dto/create-medidor.dto';
import axios from 'axios';

@Injectable()
export class MedidorService {
  constructor(
    @InjectRepository(Medidor)
    private medidorRepository: Repository<Medidor>,
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
  //funcao pra fazer a requisicao para o gemini
  async extactMedidaFromImage(image_url: string) {
    try {
      const response = await axios.post(
        'https://ai.google.dev/gemini-api/vision',
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
