import { Global, Module } from '@nestjs/common';
import { CsrfGuard } from './guards/csrf.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [RolesGuard, CsrfGuard, RateLimitGuard],
  exports: [RolesGuard, CsrfGuard, RateLimitGuard],
})
export class CommonModule {}
