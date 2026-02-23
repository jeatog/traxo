import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const guardiaInvitado: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) return true;
  return router.createUrlTree(['/app/historial']);
};
