import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  company: string;

  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  process: string;
}
