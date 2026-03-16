import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PerfilDatos {
  nombre: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/perfil`;
  private readonly TTL = 30 * 60 * 1000; // 30 minutos

  private readonly _cache = signal<PerfilDatos | null>(null);
  private _cacheTs = 0;

  obtener(forzar = false): Observable<PerfilDatos> {
    const valido = !forzar && this._cache() !== null && (Date.now() - this._cacheTs) < this.TTL;
    if (valido) return of(this._cache()!);
    return this.http.get<PerfilDatos>(this.url).pipe(
      tap(data => { this._cache.set(data); this._cacheTs = Date.now(); }),
    );
  }

  cambiarNombre(nombre: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/nombre`, { nombre }).pipe(
      tap(() => {
        const actual = this._cache();
        if (actual) this._cache.set({ ...actual, nombre });
      }),
    );
  }

  cambiarContrasena(contrasenaActual: string, contrasenaNueva: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/contrasena`, { contrasenaActual, contrasenaNueva });
  }

  eliminarCuenta(): Observable<void> {
    return this.http.delete<void>(this.url);
  }

  limpiar(): void { this._cache.set(null); this._cacheTs = 0; }
}
