import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ItemHistorial } from '../../shared/utils/modelos';

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/historial`;
  private readonly TTL = 3 * 60 * 1000; // 3 minutos

  private readonly _cache = signal<ItemHistorial[] | null>(null);
  private _cacheTs = 0;

  obtener(forzar = false): Observable<ItemHistorial[]> {
    const valido = !forzar && this._cache() !== null && (Date.now() - this._cacheTs) < this.TTL;
    if (valido) return of(this._cache()!);
    return this.http.get<ItemHistorial[]>(this.url).pipe(
      tap(data => { this._cache.set(data); this._cacheTs = Date.now(); }),
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  invalidar(): void { this._cacheTs = 0; }
  limpiar(): void   { this._cache.set(null); this._cacheTs = 0; }
}
