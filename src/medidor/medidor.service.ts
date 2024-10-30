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

    // Verifica a existência de uma leitura no mês
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
      throw new ConflictException('Medidor já existe');
    }

    // Processa a imagem e extrai a medida usando a API Ollama
    const responseOllama = await this.extactMedidaFromImage(
      createMedidorDto.image_url,
    );
    if (!responseOllama) {
      throw new BadRequestException('Imagem não reconhecida');
    }

    const medidor = this.medidorRepository.create({
      customer_code,
      measure_type,
      measure_dateTime: new Date(measure_dateTime),
      measure_value: responseOllama.measure_value,
      image_url: responseOllama.image_url,
    });

    await this.medidorRepository.save(medidor);

    return {
      image_url: responseOllama.image_url,
      measure_value: responseOllama.measure_value,
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
  async listAllMedidores(): Promise<{ measures: any[] }> {
    const medidores = await this.medidorRepository.find();

    if (medidores.length === 0) {
      throw new NotFoundException('Nenhuma leitura encontrada');
    }

    return {
      measures: medidores.map((medidor) => ({
        measure_uuid: medidor.id,
        customer_code: medidor.customer_code,
        measure_datetime: medidor.measure_dateTime,
        measure_type: medidor.measure_type,
        has_confirmed: medidor.has_confirmed,
        image_url: medidor.image_url,
      })),
    };
  }
  //funcao pra fazer a requisicao para o gemini
  async extactMedidaFromImage(imageBase64: string) {
    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'llava',
        prompt: 'O que está nesta imagem?',
        stream: false,
        images: [imageBase64],
      });

      if (response.status === 200) {
        const { response: content, done } = response.data;
        if (!done || !content) {
          throw new Error('A medida não foi extraída corretamente');
        }
        return { measure_value: content, image_url: imageBase64 };
      }
    } catch (error) {
      console.error('Erro ao extrair medida da imagem:', error);
      throw new BadRequestException('Erro ao processar a imagem na API Ollama');
    }
  }
}
