import type { NextFunction, Request, Response } from 'express';

function setHeaderIfMissing(res: Response, name: string, value: string): void {
  if (!res.getHeader(name)) {
    res.setHeader(name, value);
  }
}

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  setHeaderIfMissing(res, 'X-Content-Type-Options', 'nosniff');
  setHeaderIfMissing(res, 'X-Frame-Options', 'DENY');
  setHeaderIfMissing(res, 'Referrer-Policy', 'same-origin');
  setHeaderIfMissing(res, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  setHeaderIfMissing(res, 'Cross-Origin-Opener-Policy', 'same-origin');
  setHeaderIfMissing(res, 'Cross-Origin-Resource-Policy', 'same-site');
  setHeaderIfMissing(res, 'Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  next();
}
