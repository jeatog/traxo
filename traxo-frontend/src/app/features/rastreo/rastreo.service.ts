import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResultadoRastreo } from '../../shared/utils/modelos';

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
  private readonly url = `${environment.apiUrl}/rastreo`;

  constructor(private http: HttpClient) {}

  rastrear(peticion: RastreoPeticion): Observable<ResultadoRastreo> {
    return this.http.post<ResultadoRastreo>(this.url, peticion);
  }

  guardar(peticion: GuardarConsultaPeticion): Observable<unknown> {
    return this.http.post(`${this.url}/guardar`, peticion);
  }
}
