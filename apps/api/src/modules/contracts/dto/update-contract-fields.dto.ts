import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ContractFieldValueDto } from './contract-field-value.dto';

export class UpdateContractFieldsDto {
  @ApiProperty({ type: [ContractFieldValueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractFieldValueDto)
  values: ContractFieldValueDto[];
}
