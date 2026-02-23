import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BancosService {
  private readonly url = `${environment.apiUrl}/bancos`;
  // shareReplay(1) evita múltiples peticiones si varios componentes se suscriben.
  private readonly bancos$ = this.http.get<string[]>(this.url).pipe(shareReplay(1));

  constructor(private http: HttpClient) {}

  obtener(): Observable<string[]> {
    return this.bancos$;
  }
}
