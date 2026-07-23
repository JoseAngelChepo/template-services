import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { decode } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { UserApiTokensService } from '../user-api-tokens/user-api-tokens.service';
import { CreateUserApiTokenDto } from '../user-api-tokens/dto/create-user-api-token.dto';
import { UsernameService } from '../users/username.service';
import { UsernameAvailabilityQueryDto } from './dto/username-availability-query.dto';
import { getCookieValue } from '../common/http/cookies';
import { setCsrfCookie, clearCsrfCookie } from '../common/http/csrf';
import type { AuthResponse } from './interfaces/auth-response.interface';

const AUTH_COOKIE_NAMES = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function authCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    expires,
  };
}

function getJwtExpiryDate(token: string): Date | undefined {
  const decoded = decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    return undefined;
  }
  return new Date(decoded.exp * 1000);
}

function setAuthCookies(
  res: Response,
  authResponse: Pick<AuthResponse, 'access_token' | 'refresh_token'>,
): void {
  const accessExpires = getJwtExpiryDate(authResponse.access_token);
  const refreshExpires = getJwtExpiryDate(authResponse.refresh_token);

  if (accessExpires) {
    res.cookie(AUTH_COOKIE_NAMES.accessToken, authResponse.access_token, authCookieOptions(accessExpires));
  }
  if (refreshExpires) {
    res.cookie(AUTH_COOKIE_NAMES.refreshToken, authResponse.refresh_token, authCookieOptions(refreshExpires));
  }
}

function clearAuthCookies(res: Response): void {
  const clearOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
  };

  res.clearCookie(AUTH_COOKIE_NAMES.accessToken, clearOptions);
  res.clearCookie(AUTH_COOKIE_NAMES.refreshToken, clearOptions);
}

function readRefreshToken(
  req: Request,
  body?: RefreshTokenDto,
): string | undefined {
  return body?.refresh_token ?? getCookieValue(req.headers.cookie, AUTH_COOKIE_NAMES.refreshToken);
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userApiTokensService: UserApiTokensService,
    private readonly usernameService: UsernameService,
  ) {}

  @Post('register')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const authResponse = await this.authService.register(registerDto);
    setAuthCookies(res, authResponse);
    setCsrfCookie(res);
    return { user: authResponse.user };
  }

  /** Validate username format and whether it is still available (public; for sign-up UI). */
  @Get('username/availability')
  async usernameAvailability(@Query() query: UsernameAvailabilityQueryDto) {
    return this.usernameService.checkAvailabilityResponse(query.username ?? '');
  }

  @Post('login')
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const authResponse = await this.authService.login(loginDto);
    setAuthCookies(res, authResponse);
    setCsrfCookie(res);
    return { user: authResponse.user };
  }

  @Post('refresh')
  @RateLimit({ limit: 30, windowMs: 15 * 60 * 1000 })
  @UseGuards(CsrfGuard)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshToken(req, refreshTokenDto);
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const authResponse = await this.authService.refreshToken(refreshToken);
    setAuthCookies(res, authResponse);
    setCsrfCookie(res);
    return { user: authResponse.user };
  }

  @Post('logout')
  @RateLimit({ limit: 15, windowMs: 15 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async logout(
    @Req() req: RequestWithUser,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshToken(req, body);
    if (refreshToken) {
      await this.authService.logout(req.user.sub, refreshToken);
    }
    clearAuthCookies(res);
    clearCsrfCookie(res);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async logoutAll(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.sub);
    clearAuthCookies(res);
    clearCsrfCookie(res);
    return { message: 'Logged out from all devices successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async getMe(@Req() req: RequestWithUser) {
    return this.authService.getMe(req.user.sub);
  }

  @Post('forgot-password')
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('google')
  @RateLimit({ limit: 20, windowMs: 15 * 60 * 1000 })
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    return;
  }

  @Get('google/callback')
  @RateLimit({ limit: 20, windowMs: 15 * 60 * 1000 })
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const authResponse = await this.authService.googleLogin(req.user as Record<string, unknown>);
    setAuthCookies(res, authResponse);
    setCsrfCookie(res);

    const params = new URLSearchParams();
    const rawState = req.query?.state;
    const state = Array.isArray(rawState) ? rawState[0] : rawState;
    if (typeof state === 'string' && state.length > 0) {
      params.set('state', state);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const query = params.toString();
    const redirectUrl = query
      ? `${frontendUrl}/auth/google/callback?${query}`
      : `${frontendUrl}/auth/google/callback`;

    return res.status(HttpStatus.FOUND).redirect(redirectUrl);
  }

  /** Create a per-user API token (for agents / automation). Raw token is returned once. JWT only. */
  @Post('api-tokens')
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async createApiToken(
    @Req() req: RequestWithUser,
    @Body() dto: CreateUserApiTokenDto,
  ) {
    return this.userApiTokensService.create(req.user.sub, dto);
  }

  @Get('api-tokens')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async listApiTokens(@Req() req: RequestWithUser) {
    return this.userApiTokensService.listForUser(req.user.sub);
  }

  @Delete('api-tokens/:id')
  @RateLimit({ limit: 20, windowMs: 60 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async revokeApiToken(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.userApiTokensService.revoke(req.user.sub, id);
    return { message: 'Token revoked' };
  }
}
