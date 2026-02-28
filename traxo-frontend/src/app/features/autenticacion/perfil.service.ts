import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PerfilDatos {
  nombre: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly url = `${environment.apiUrl}/perfil`;
  private readonly TTL = 30 * 60 * 1000; // 30 minutos

  private readonly _cache = signal<PerfilDatos | null>(null);
  private _cacheTs = 0;

  constructor(private http: HttpClient) {}

  obtener(forzar = false): Observable<PerfilDatos> {
    const valido = !forzar && this._cache() !== null && (Date.now() - this._cacheTs) < this.TTL;
    if (valido) return of(this._cache()!);
    return this.http.get<PerfilDatos>(this.url).pipe(
      tap(data => { this._cache.set(data); this._cacheTs = Date.now(); }),
    );
  }

  actualizarNombre(nombre: string): void {
    const actual = this._cache();
    if (actual) this._cache.set({ ...actual, nombre });
  }

  limpiar(): void { this._cache.set(null); this._cacheTs = 0; }
}
