import { PartialType } from '@nestjs/mapped-types';
import { CreateMedidorDto } from './create-medidor.dto';

export class ConfirmMedidorDto extends PartialType(CreateMedidorDto) {
  measure_uuid: string;
  confirmed_value: number;
}
