import { Test, TestingModule } from '@nestjs/testing';
import { MedidorService } from './medidor.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Medidor } from '../../typeorm/entities/medidor.entity';
import { Repository } from 'typeorm';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMedidorDto } from './dto/create-medidor.dto';
import { ConfirmMedidorDto } from './dto/confirm-medidor.dto';
import axios from 'axios';

jest.mock('axios');

describe('MedidorService', () => {
  let service: MedidorService;
  let medidorRepository: Repository<Medidor>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedidorService,
        {
          provide: getRepositoryToken(Medidor),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<MedidorService>(MedidorService);
    medidorRepository = module.get<Repository<Medidor>>(
      getRepositoryToken(Medidor),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadMedidor', () => {
    it('should upload medidor successfully', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockResolvedValue('base64image');
      jest.spyOn(service, 'extactMedidaFromImage').mockResolvedValue({
        measure_value: '100',
        image_url: 'base64image',
      });
      jest
        .spyOn(medidorRepository, 'create')
        .mockReturnValue({ id: 'uuid' } as any);
      jest
        .spyOn(medidorRepository, 'save')
        .mockResolvedValue({ id: 'uuid' } as any);

      const result = await service.uploadMedidor(createMedidorDto);

      expect(result).toEqual({
        image_url: 'base64image',
        measure_value: '100',
        medidor_uuid: 'uuid',
      });
    });

    it('should throw ConflictException if medidor already exists', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue({} as any);

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if image is not recognized', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockResolvedValue('base64image');
      jest.spyOn(service, 'extactMedidaFromImage').mockResolvedValue(null);

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if image conversion fails', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockRejectedValue(new BadRequestException('Conversion error'));

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if API call to extract measure fails', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockResolvedValue('base64image');
      jest
        .spyOn(service, 'extactMedidaFromImage')
        .mockRejectedValue(new BadRequestException('API error'));

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('convertImageUrlToBase64', () => {
    it('should convert image URL to base64 successfully', async () => {
      const url = 'http://example.com/image.jpg';
      const base64 = Buffer.from('teste').toString('base64'); // Corrigindo a string para base64 válida

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from(base64, 'base64'), // Simulando o buffer do conteúdo da imagem
      });

      const result = await service.convertImageUrlToBase64(url);

      expect(result).toBe(base64); // Verificando se o retorno é o esperado
    });

    it('should throw BadRequestException if conversion fails', async () => {
      const url = 'http://example.com/image.jpg';
      (axios.get as jest.Mock).mockRejectedValue(new Error('Conversion error'));

      await expect(service.convertImageUrlToBase64(url)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('extactMedidaFromImage', () => {
    it('should extract measure from image successfully', async () => {
      const imageBase64 = 'base64image';
      const response = {
        status: 200,
        data: {
          response: '100',
          done: true,
        },
      };
      (axios.post as jest.Mock).mockResolvedValue(response);

      const result = await service.extactMedidaFromImage(imageBase64);

      expect(result).toEqual({ measure_value: '100', image_url: imageBase64 });
    });

    it('should throw BadRequestException if API call fails', async () => {
      const imageBase64 = 'base64image';
      (axios.post as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(service.extactMedidaFromImage(imageBase64)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmMedidor', () => {
    it('should confirm medidor successfully', async () => {
      const confirmMedidorDto: ConfirmMedidorDto = {
        measure_uuid: 'uuid',
        confirmed_value: 100,
      };

      jest
        .spyOn(medidorRepository, 'findOne')
        .mockResolvedValue({ has_confirmed: false } as any);
      jest.spyOn(medidorRepository, 'save').mockResolvedValue({} as any);

      const result = await service.confirmMedidor(confirmMedidorDto);

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if medidor not found', async () => {
      const confirmMedidorDto: ConfirmMedidorDto = {
        measure_uuid: 'uuid',
        confirmed_value: 100,
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.confirmMedidor(confirmMedidorDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if medidor already confirmed', async () => {
      const confirmMedidorDto: ConfirmMedidorDto = {
        measure_uuid: 'uuid',
        confirmed_value: 100,
      };

      jest
        .spyOn(medidorRepository, 'findOne')
        .mockResolvedValue({ has_confirmed: true } as any);

      await expect(service.confirmMedidor(confirmMedidorDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('listMedidores', () => {
    it('should list medidores successfully', async () => {
      const customerCode = '123';
      const medidores: Medidor[] = [
        {
          id: 'uuid',
          measure_dateTime: new Date(),
          measure_type: 'WATER',
          has_confirmed: true,
          image_url: 'http://example.com/image.jpg',
          customer_code: '',
          measure_value: 0,
        },
      ];

      jest.spyOn(medidorRepository, 'find').mockResolvedValue(medidores);

      const result = await service.listMedidores(customerCode);

      expect(result).toEqual({
        customer_code: customerCode,
        measures: medidores.map((medidor) => ({
          measure_uuid: medidor.id,
          measure_datetime: medidor.measure_dateTime,
          measure_type: medidor.measure_type,
          has_confirmed: medidor.has_confirmed,
          image_url: medidor.image_url,
        })),
      });
    });

    it('should throw NotFoundException if no medidores found', async () => {
      const customerCode = '123';

      jest.spyOn(medidorRepository, 'find').mockResolvedValue([]);

      await expect(service.listMedidores(customerCode)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if measure type is invalid', async () => {
      const customerCode = '123';
      const measureType = 'invalid';

      await expect(
        service.listMedidores(customerCode, measureType),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listAllMedidores', () => {
    it('should list all medidores successfully', async () => {
      const medidores: Medidor[] = [
        {
          id: 'uuid',
          customer_code: '123',
          measure_dateTime: new Date(),
          measure_type: 'WATER',
          has_confirmed: true,
          image_url: 'http://example.com/image.jpg',
          measure_value: 0,
        },
      ];

      jest.spyOn(medidorRepository, 'find').mockResolvedValue(medidores);

      const result = await service.listAllMedidores();

      expect(result).toEqual({
        measures: medidores.map((medidor) => ({
          measure_uuid: medidor.id,
          customer_code: medidor.customer_code,
          measure_datetime: medidor.measure_dateTime,
          measure_type: medidor.measure_type,
          has_confirmed: medidor.has_confirmed,
          image_url: medidor.image_url,
        })),
      });
    });

    it('should throw NotFoundException if no medidores found', async () => {
      jest.spyOn(medidorRepository, 'find').mockResolvedValue([]);

      await expect(service.listAllMedidores()).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
jest.mock('axios');

describe('MedidorService', () => {
  let service: MedidorService;
  let medidorRepository: Repository<Medidor>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedidorService,
        {
          provide: getRepositoryToken(Medidor),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<MedidorService>(MedidorService);
    medidorRepository = module.get<Repository<Medidor>>(
      getRepositoryToken(Medidor),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadMedidor', () => {
    it('should upload medidor successfully', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockResolvedValue('base64image');
      jest.spyOn(service, 'extactMedidaFromImage').mockResolvedValue({
        measure_value: '100',
        image_url: 'base64image',
      });
      jest
        .spyOn(medidorRepository, 'create')
        .mockReturnValue({ id: 'uuid' } as any);
      jest
        .spyOn(medidorRepository, 'save')
        .mockResolvedValue({ id: 'uuid' } as any);

      const result = await service.uploadMedidor(createMedidorDto);

      expect(result).toEqual({
        image_url: 'base64image',
        measure_value: '100',
        medidor_uuid: 'uuid',
      });
    });

    it('should throw ConflictException if medidor already exists', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue({} as any);

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if image is not recognized', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockResolvedValue('base64image');
      jest.spyOn(service, 'extactMedidaFromImage').mockResolvedValue(null);

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if image conversion fails', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockRejectedValue(new BadRequestException('Conversion error'));

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if API call to extract measure fails', async () => {
      const createMedidorDto: CreateMedidorDto = {
        customer_code: '123',
        measure_type: 'agua',
        measure_dateTime: new Date().toISOString(),
        image_url: 'http://example.com/image.jpg',
      };

      jest.spyOn(medidorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'convertImageUrlToBase64')
        .mockResolvedValue('base64image');
      jest
        .spyOn(service, 'extactMedidaFromImage')
        .mockRejectedValue(new BadRequestException('API error'));

      await expect(service.uploadMedidor(createMedidorDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
