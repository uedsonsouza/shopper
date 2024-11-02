import { Test, TestingModule } from '@nestjs/testing';
import { MedidorController } from './medidor.controller';
import { MedidorService } from './medidor.service';

describe('MedidorController', () => {
  let controller: MedidorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedidorController],
      providers: [
        MedidorService,
        {
          provide: 'MedidorRepository',
          useValue: {}, // Mock the repository or provide a proper implementation
        },
      ],
    }).compile();

    controller = module.get<MedidorController>(MedidorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
