import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class OnboardingDto {
  @ApiProperty({ example: 'Acme Contratos LTDA' })
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @ApiProperty({
    example: 'acme-contratos',
    description:
      'Identificador único do tenant (slug), usado em URLs/subdomínios futuros',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'tenantSlug deve conter apenas letras minúsculas, números e hífens',
  })
  tenantSlug: string;

  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'SenhaForte123!' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  adminPassword: string;
}
