import { Global, Module } from '@nestjs/common';
import { CsrfGuard } from './guards/csrf.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [RolesGuard, CsrfGuard],
  exports: [RolesGuard, CsrfGuard],
})
export class CommonModule {}
