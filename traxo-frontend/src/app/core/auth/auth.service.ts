import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  token: string;
  tipo: string;
}

const CLAVE_TOKEN = 'traxo_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(localStorage.getItem(CLAVE_TOKEN));
  private _logoutTimer?: any;

  readonly estaAutenticado = computed(() => {
    const token = this._token();
    if (!token) return false;
    return !this.estaTokenExpirado(token);
  });

  readonly token = this._token.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    // Al iniciar, si el token ya expiró, lo limpiamos
    const tokenInicial = this._token();
    if (tokenInicial && this.estaTokenExpirado(tokenInicial)) {
      this.cerrarSesion();
    } else if (tokenInicial) {
      this.programarCierreSesion(tokenInicial);
    }
  }

  login(email: string, contrasena: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, contrasena })
      .pipe(tap(resp => this.guardarToken(resp.token)));
  }

  registrar(nombre: string, email: string, contrasena: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/auth/registro`, { nombre, email, contrasena });
  }

  cerrarSesion(): void {
    this.limpiarTimer();
    localStorage.removeItem(CLAVE_TOKEN);
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  private guardarToken(token: string): void {
    localStorage.setItem(CLAVE_TOKEN, token);
    this._token.set(token);
    this.programarCierreSesion(token);
  }

  private estaTokenExpirado(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload.exp) return false;
      // exp está en segundos, Date.now() en ms
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private programarCierreSesion(token: string): void {
    this.limpiarTimer();
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload.exp) return;

      const expMs = payload.exp * 1000;
      const ahoraMs = Date.now();
      const tiempoRestante = expMs - ahoraMs;

      if (tiempoRestante <= 0) {
        this.cerrarSesion();
      } else {
        this._logoutTimer = setTimeout(() => {
          this.cerrarSesion();
        }, tiempoRestante);
      }
    } catch {
      this.cerrarSesion();
    }
  }

  private limpiarTimer(): void {
    if (this._logoutTimer) {
      clearTimeout(this._logoutTimer);
      this._logoutTimer = undefined;
    }
  }
}
