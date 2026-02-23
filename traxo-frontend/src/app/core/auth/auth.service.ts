import { Injectable, signal, computed } from '@angular/core';
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

  readonly estaAutenticado = computed(() => this._token() !== null);
  readonly token = this._token.asReadonly();

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, contrasena: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, contrasena })
      .pipe(tap(resp => this.guardarToken(resp.token)));
  }

  registrar(nombre: string, email: string, contrasena: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/auth/registro`, { nombre, email, contrasena });
  }

  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  private guardarToken(token: string): void {
    localStorage.setItem(CLAVE_TOKEN, token);
    this._token.set(token);
  }
}
