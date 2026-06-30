import { Module } from '@nestjs/common';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { TemplateModule } from '../templates/template.module';

@Module({
  imports: [TemplateModule],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
