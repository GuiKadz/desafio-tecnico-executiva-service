import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { FieldType } from '../../../../generated/prisma/enums';

export class TemplateFieldDto {
  @ApiProperty({ example: 'Nome do contratante' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FieldType, example: FieldType.TEXT })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiProperty({
    example: 0,
    description: 'Ordem de exibição do campo no formulário',
  })
  @IsInt()
  @Min(0)
  order: number;
}
