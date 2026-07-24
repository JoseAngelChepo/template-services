import { randomBytes } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import { getCookieValue } from './cookies';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
  };
}

export function setCsrfCookie(res: Response, token: string = generateCsrfToken()): string {
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
  return token;
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions());
}

export function readCsrfToken(req: Request): string | undefined {
  const headerTokenRaw = req.headers[CSRF_HEADER_NAME];
  const headerToken = Array.isArray(headerTokenRaw) ? headerTokenRaw[0] : headerTokenRaw;
  return headerToken?.trim() || getCookieValue(req.headers.cookie, CSRF_COOKIE_NAME)?.trim();
}
