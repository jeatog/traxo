import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  if (token) {
    const reqAutenticado = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(reqAutenticado);
  }
  return next(req);
};
