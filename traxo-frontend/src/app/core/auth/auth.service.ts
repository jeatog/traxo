import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map, catchError, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HistorialService } from '../../features/historial/historial.service';
import { PerfilService } from '../../features/autenticacion/perfil.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly historialService = inject(HistorialService);
  private readonly perfilService = inject(PerfilService);

  private readonly _autenticado = signal(false);

  readonly estaAutenticado = this._autenticado.asReadonly();

  verificarSesion(): Observable<boolean> {
    return this.http
      .get<void>(`${environment.apiUrl}/perfil`, { withCredentials: true })
      .pipe(
        map(() => { this._autenticado.set(true); return true; }),
        catchError(() => { this._autenticado.set(false); return of(false); }),
      );
  }

  login(email: string, contrasena: string): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/login`, { email, contrasena }, { withCredentials: true })
      .pipe(tap(() => this._autenticado.set(true)));
  }

  registrar(nombre: string, email: string, contrasena: string, turnstileToken: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/auth/registro`, { nombre, email, contrasena, turnstileToken });
  }

  cerrarSesion(): void {
    this._autenticado.set(false);
    this.historialService.limpiar();
    this.perfilService.limpiar();
    this.router.navigate(['/inicio']);
    this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe();
  }
}
