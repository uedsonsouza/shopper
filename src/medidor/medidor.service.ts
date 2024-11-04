import axios from 'axios';
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
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class MedidorService {
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(Medidor)
    public medidorRepository: Repository<Medidor>,
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.API_KEY);
  }

  async uploadMedidor(createMedidorDto: CreateMedidorDto): Promise<{
    image_url: string;
    measure_value: string;
    medidor_uuid: string;
  }> {
    const { customer_code, measure_type, measure_dateTime, image_url } =
      createMedidorDto;

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

    // Converte a imagem para base64
    const imageBase64 = await this.convertImageUrlToBase64(image_url);

    // Extrai o valor da medida da imagem usando a API Gemini
    const responseGemini = await this.extractMeasureFromImage(imageBase64);
    if (!responseGemini) {
      throw new BadRequestException('Imagem não reconhecida');
    }

    // Cria uma nova entrada de medidor no banco de dados
    const medidor = this.medidorRepository.create({
      customer_code,
      measure_type,
      measure_dateTime: new Date(measure_dateTime),
      measure_value: parseFloat(responseGemini.measure_value),
      image_url: responseGemini.image_url,
    });

    await this.medidorRepository.save(medidor);

    return {
      image_url: responseGemini.image_url,
      measure_value: responseGemini.measure_value,
      medidor_uuid: medidor.id,
    };
  }

  async convertImageUrlToBase64(url: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const imageBase64 = Buffer.from(response.data, 'binary').toString(
        'base64',
      );
      return imageBase64;
    } catch (error) {
      console.error('Erro ao converter a imagem para Base64:', error);
      throw new BadRequestException('Falha ao processar a imagem fornecida');
    }
  }

  async extractMeasureFromImage(
    imageBase64: string,
  ): Promise<{ measure_value: string; image_url: string }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      const prompt = 'O que está nesta imagem?';
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg', // ou "image/png" dependendo do tipo de imagem
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = await result.response.text();

      return { measure_value: responseText, image_url: imageBase64 };
    } catch (error) {
      console.error('Erro ao extrair medida da imagem:', error);
      throw new BadRequestException('Erro ao processar a imagem na API Gemini');
    }
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
}
