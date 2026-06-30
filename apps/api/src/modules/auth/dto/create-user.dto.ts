import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../../generated/prisma/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'João Lima' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SenhaForte123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, example: Role.VIEWER })
  @IsEnum(Role)
  role: Role;
}
