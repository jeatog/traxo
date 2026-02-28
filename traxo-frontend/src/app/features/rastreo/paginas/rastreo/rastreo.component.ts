import { Component, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RastreoService } from '../../rastreo.service';
import { HistorialService } from '../../../historial/historial.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { TemaService } from '../../../../core/tema/tema.service';
import { BancosService } from '../../../../core/bancos/bancos.service';
import { ResultadoRastreo } from '../../../../shared/utils/modelos';
import { TEXTOS_RASTREO, TEXTOS_RESULTADO, TEXTOS_ERRORES, TEXTOS_GENERAL } from '../../../../shared/textos';
import { CalendarioComponent } from '../../../../shared/components/calendario/calendario.component';

@Component({
  selector: 'trx-rastreo',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, CalendarioComponent],
  templateUrl: './rastreo.component.html',
})
export class RastreoComponent implements OnInit {
  protected readonly TEXTOS = TEXTOS_RASTREO;
  protected readonly TEXTOS_RES = TEXTOS_RESULTADO;
  protected readonly TEXTOS_ERR = TEXTOS_ERRORES;
  protected readonly TEXTOS_GEN = TEXTOS_GENERAL;

  readonly cargando      = signal(false);
  readonly resultado     = signal<ResultadoRastreo | null>(null);
  readonly errorMensaje  = signal<string | null>(null);
  readonly guardando      = signal(false);
  readonly guardado       = signal(false);
  readonly errorGuardado  = signal(false);

  // Modo de entrada: comprobante (OCR) o manual
  readonly modoEntrada   = signal<'comprobante' | 'manual'>('comprobante');
  // Nombre del archivo seleccionado (preview)
  readonly archivoNombre = signal<string | null>(null);
  // Lista de bancos cargada desde el servidor
  readonly bancos        = signal<string[]>([]);

  // Estado del análisis OCR
  readonly analizandoOcr  = signal(false);
  readonly errorOcr       = signal(false);
  readonly faltantes      = signal<string[]>([]);

  readonly etiquetasCampo: Record<string, string> = {
    fechaOperacion:     TEXTOS_RASTREO.etiquetaFecha,
    monto:              TEXTOS_RASTREO.etiquetaMonto,
    claveRastreo:       TEXTOS_RASTREO.etiquetaClaveRastreo,
    emisor:             TEXTOS_RASTREO.etiquetaBancoEmisor,
    receptor:           TEXTOS_RASTREO.etiquetaBancoReceptor,
    cuentaBeneficiaria: TEXTOS_RASTREO.etiquetaCuenta,
  };

  readonly formulario: FormGroup;

  constructor(
    private fb: FormBuilder,
    private rastreoService: RastreoService,
    private historialService: HistorialService,
    private bancosService: BancosService,
    protected readonly auth: AuthService,
    protected readonly tema: TemaService,
  ) {
    this.formulario = this.fb.group({
      fechaOperacion:     ['', Validators.required],
      monto:              ['', [Validators.required, Validators.min(0.01)]],
      claveRastreo:       ['', Validators.required],
      emisor:             ['', Validators.required],
      receptor:           ['', Validators.required],
      cuentaBeneficiaria: ['', Validators.required],
      datosCompletos:     [false],
      alias:              [''],
    });
  }

  ngOnInit(): void {
    this.bancosService.obtener().subscribe({
      next: lista => this.bancos.set(lista),
      error: () => { /* falla silenciosa: el select quedará vacío */ },
    });

    // Pre-llenado desde re-verificar del historial
    // history.state.prefill contiene los campos que sí se persisten
    const prefill = history.state?.prefill;
    if (prefill) {
      this.formulario.patchValue({
        fechaOperacion: prefill.fechaOperacion,
        monto:          prefill.monto,
        emisor:         prefill.emisor,
        receptor:       prefill.receptor,
      });
      this.modoEntrada.set('manual');
    }
  }

  seleccionarArchivo(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    this.archivoNombre.set(archivo.name);
    this.analizandoOcr.set(true);
    this.errorOcr.set(false);
    this.faltantes.set([]);
    this.rastreoService.analizarComprobante(archivo).subscribe({
      next: res => {
        this.formulario.patchValue(res.campos);
        this.faltantes.set(res.faltantes);
        this.analizandoOcr.set(false);
        this.modoEntrada.set('manual');
      },
      error: () => {
        this.errorOcr.set(true);
        this.analizandoOcr.set(false);
      },
    });
  }

  consultar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.errorMensaje.set(null);
    this.resultado.set(null);
    this.guardado.set(false);

    const { alias, ...datos } = this.formulario.value;
    this.rastreoService.rastrear(datos).subscribe({
      next: res => { this.resultado.set(res); this.cargando.set(false); },
      error: () => { this.errorMensaje.set(this.TEXTOS_GEN.error); this.cargando.set(false); },
    });
  }

  guardarEnHistorial(): void {
    const res = this.resultado();
    if (!res || !this.auth.estaAutenticado()) return;
    this.guardando.set(true);
    this.errorGuardado.set(false);
    const alias = this.formulario.get('alias')?.value || undefined;
    this.rastreoService.guardar({ resultado: res, alias }).subscribe({
      next: () => { this.historialService.invalidar(); this.guardado.set(true); this.guardando.set(false); },
      error: () => { this.guardando.set(false); this.errorGuardado.set(true); },
    });
  }

  nuevaConsulta(): void {
    this.resultado.set(null);
    this.errorMensaje.set(null);
    this.guardado.set(false);
    this.errorGuardado.set(false);
    this.archivoNombre.set(null);
    this.faltantes.set([]);
    this.errorOcr.set(false);
    this.formulario.reset({ datosCompletos: false });
  }

  campo(nombre: string) { return this.formulario.get(nombre); }

  tieneError(nombre: string): boolean {
    const c = this.campo(nombre);
    return !!(c?.invalid && c?.touched);
  }

  estadoIcono(estado: string): string {
    const mapa: Record<string, string> = {
      LIQUIDADA: '✓', RECHAZADA: '✕', EN_PROCESO: '⏳', NO_ENCONTRADA: '?',
    };
    return mapa[estado] ?? '?';
  }

  estadoIconoClase(estado: string): string {
    const mapa: Record<string, string> = {
      LIQUIDADA:     'bg-exito-fondo text-exito',
      RECHAZADA:     'bg-error-tenue text-error',
      EN_PROCESO:    'bg-aviso-fondo text-aviso',
      NO_ENCONTRADA: 'bg-fondo-input text-secundario',
    };
    return mapa[estado] ?? mapa['NO_ENCONTRADA'];
  }

  estadoTextoClase(estado: string): string {
    const mapa: Record<string, string> = {
      LIQUIDADA:     'text-exito',
      RECHAZADA:     'text-error',
      EN_PROCESO:    'text-aviso',
      NO_ENCONTRADA: 'text-secundario',
    };
    return mapa[estado] ?? mapa['NO_ENCONTRADA'];
  }

  etiquetaEstado(estado: string): string {
    const mapa: Record<string, string> = {
      LIQUIDADA:     this.TEXTOS_RES.estadoLiquidada,
      RECHAZADA:     this.TEXTOS_RES.estadoRechazada,
      EN_PROCESO:    this.TEXTOS_RES.estadoEnProceso,
      NO_ENCONTRADA: this.TEXTOS_RES.estadoNoEncontrada,
    };
    return mapa[estado] ?? estado;
  }
}
