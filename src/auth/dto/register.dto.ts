import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
  USERNAME_REGEX,
} from '../../users/username.constants';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  /** Optional; when omitted the API generates a unique handle from the email. */
  @Transform(({ value }) => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : undefined;
  })
  @IsOptional()
  @IsString()
  @MinLength(USERNAME_MIN_LEN)
  @MaxLength(USERNAME_MAX_LEN)
  @Matches(USERNAME_REGEX, {
    message:
      'Username must use only lowercase letters, digits, and underscores (3–30 characters)',
  })
  username?: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;
}
