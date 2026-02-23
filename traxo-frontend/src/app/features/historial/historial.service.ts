import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ItemHistorial } from '../../shared/utils/modelos';

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly url = `${environment.apiUrl}/historial`;

  constructor(private http: HttpClient) {}

  obtener(): Observable<ItemHistorial[]> {
    return this.http.get<ItemHistorial[]>(this.url);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
