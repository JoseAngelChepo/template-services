import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

function getClientId(context: ExecutionContext): string {
  const request = context.switchToHttp().getRequest<{
    ip?: string;
    headers?: { 'x-forwarded-for'?: string | string[]; 'user-agent'?: string };
  }>();
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const ip = forwarded?.split(',')[0]?.trim() || request.ip || 'unknown-ip';
  const userAgent = request.headers?.['user-agent']?.trim() || 'unknown-ua';
  return `${ip}:${userAgent}`;
}

function prune(windowMs: number, timestamps: number[], now: number): number[] {
  return timestamps.filter((ts) => now - ts < windowMs);
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const now = Date.now();
    const routeKey = `${context.getClass().name}:${context.getHandler().name}`;
    const clientId = getClientId(context);
    const bucketKey = `${routeKey}:${clientId}`;
    const bucket = buckets.get(bucketKey) ?? { hits: [] };
    bucket.hits = prune(options.windowMs, bucket.hits, now);

    if (bucket.hits.length >= options.limit) {
      throw new HttpException('Too many attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.hits.push(now);
    buckets.set(bucketKey, bucket);

    return true;
  }
}
