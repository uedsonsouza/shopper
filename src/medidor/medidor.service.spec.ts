import { Test, TestingModule } from '@nestjs/testing';
import { MedidorService } from './medidor.service';

describe('MedidorService', () => {
  let service: MedidorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MedidorService],
    }).compile();

    service = module.get<MedidorService>(MedidorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
