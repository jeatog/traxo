export type EstadoTransferencia = 'LIQUIDADA' | 'RECHAZADA' | 'EN_PROCESO' | 'NO_ENCONTRADA';

export interface OcrRespuesta {
  campos: {
    fechaOperacion?: string;
    monto?: string;
    claveRastreo?: string;
    emisor?: string;
    receptor?: string;
    cuentaBeneficiaria?: string;
  };
  faltantes: string[];
}

export interface ResultadoRastreo {
  estado: EstadoTransferencia;
  fechaOperacion: string;
  horaOperacion?: string | null;
  monto: number;
  bancoEmisor: string;
  bancoReceptor: string;
  descripcion: string;
  // Presentes solo cuando se consultó con datosCompletos=true. No se persisten.
  nombreEmisor?: string | null;
  nombreReceptor?: string | null;
  concepto?: string | null;
}

export interface ItemHistorial {
  id: string;
  fechaConsulta: string;
  fechaOperacion: string;
  horaOperacion?: string | null;
  monto: number;
  bancoEmisor: string;
  bancoReceptor: string;
  estado: EstadoTransferencia;
  alias?: string;
  concepto?: string | null;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
}
