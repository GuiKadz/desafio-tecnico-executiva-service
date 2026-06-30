import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ContractFieldValueDto } from './contract-field-value.dto';

export class CreateContractDto {
  @ApiProperty({ type: [ContractFieldValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractFieldValueDto)
  values: ContractFieldValueDto[];
}
