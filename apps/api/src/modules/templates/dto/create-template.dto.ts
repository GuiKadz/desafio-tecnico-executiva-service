import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { TemplateFieldDto } from './template-field.dto';

export class CreateTemplateDto {
  @ApiProperty({ type: [TemplateFieldDto] })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'O template precisa de pelo menos um campo',
  })
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields: TemplateFieldDto[];
}
