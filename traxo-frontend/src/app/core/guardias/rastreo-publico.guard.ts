import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

// Redirige al usuario autenticado a /app/rastreo si intenta acceder a la ruta pública
export const guardiaRastreoPublico: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado()) return router.createUrlTree(['/app/rastreo']);
  return true;
};
