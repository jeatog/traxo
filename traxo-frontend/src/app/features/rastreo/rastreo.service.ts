import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OcrRespuesta, ResultadoRastreo } from '../../shared/utils/modelos';

export interface RastreoPeticion {
  fechaOperacion: string;
  monto: number;
  claveRastreo: string;
  emisor: string;
  receptor: string;
  cuentaBeneficiaria: string;
  datosCompletos: boolean;
}

export interface GuardarConsultaPeticion {
  resultado: ResultadoRastreo;
  alias?: string;
}

@Injectable({ providedIn: 'root' })
export class RastreoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/rastreo`;

  rastrear(peticion: RastreoPeticion): Observable<ResultadoRastreo> {
    return this.http.post<ResultadoRastreo>(this.url, peticion);
  }

  guardar(peticion: GuardarConsultaPeticion): Observable<unknown> {
    return this.http.post(`${this.url}/guardar`, peticion);
  }

  analizarComprobante(archivo: File): Observable<OcrRespuesta> {
    const form = new FormData();
    form.append('imagen', archivo);
    return this.http.post<OcrRespuesta>(`${this.url}/ocr`, form);
  }
}
