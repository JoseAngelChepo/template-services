import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { readCsrfToken } from '../http/csrf';

function isBearerAuth(request: Request): boolean {
  const authHeader = request.headers['authorization'];
  if (!authHeader) return false;
  return authHeader.startsWith('Bearer ');
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (isBearerAuth(request)) {
      return true;
    }

    const cookieToken = readCsrfToken(request);
    const headerTokenRaw = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(headerTokenRaw) ? headerTokenRaw[0] : headerTokenRaw;
    const normalizedHeader = headerToken?.trim();

    if (!cookieToken || !normalizedHeader) {
      throw new UnauthorizedException('Missing CSRF token');
    }

    if (cookieToken !== normalizedHeader) {
      throw new UnauthorizedException('Invalid CSRF token');
    }

    return true;
  }
}
