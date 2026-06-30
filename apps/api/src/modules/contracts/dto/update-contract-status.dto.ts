import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ContractStatus } from '../../../../generated/prisma/enums';

export class UpdateContractStatusDto {
  @ApiProperty({ enum: ContractStatus, example: ContractStatus.ACTIVE })
  @IsEnum(ContractStatus)
  status: ContractStatus;
}
