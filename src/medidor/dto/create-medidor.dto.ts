import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsDateString,
  IsBase64,
} from 'class-validator';
export class CreateMedidorDto {
  @IsString()
  @IsNotEmpty()
  customer_code: string;

  @IsEnum(['agua', 'gas'])
  @IsNotEmpty()
  measure_type: 'agua' | 'gas';

  @IsDateString()
  @IsNotEmpty()
  measure_dateTime: string;

  @IsBase64()
  @IsNotEmpty()
  image_url: string;
}
