import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/models';
import { AuthService } from '../services/auth.service';

// Usage: { canActivate: [roleGuard], data: { role: 'SALON_OWNER' } }
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const required = route.data['role'] as UserRole | undefined;
  if (required && auth.role() !== required) {
    // Send users to their own home area instead of a forbidden screen.
    const home = auth.role() === 'SALON_OWNER' ? '/owner/dashboard' : '/home';
    return router.createUrlTree([home]);
  }
  return true;
};
