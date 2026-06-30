import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ContractStatus } from '../../../../generated/prisma/enums';

export class FindContractsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({
    description: 'Data inicial (inclusive) de criação do contrato, ISO 8601',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Data final (inclusive) de criação do contrato, ISO 8601',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'Nome do campo pra buscar por valor (usado junto com fieldValue)',
    example: 'Nome',
  })
  @IsOptional()
  @IsString()
  fieldName?: string;

  @ApiPropertyOptional({
    description:
      'Valor (busca parcial, case-insensitive) do campo informado em fieldName',
    example: 'acme',
  })
  @IsOptional()
  @IsString()
  fieldValue?: string;
}
