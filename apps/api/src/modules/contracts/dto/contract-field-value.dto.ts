import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ContractFieldValueDto {
  @ApiProperty({ example: 'Nome do contratante' })
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @ApiProperty({
    example: 'Acme LTDA',
    description:
      'Valor do campo, sempre enviado como string; o tipo declarado no template (TEXT/NUMBER/DATE/BOOLEAN) define como é validado e interpretado no backend',
  })
  @IsString()
  value: string;
}
