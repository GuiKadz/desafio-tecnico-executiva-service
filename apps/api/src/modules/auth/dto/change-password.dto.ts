import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'SenhaAtual123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'SenhaNova456!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
