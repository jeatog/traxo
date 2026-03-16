import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HistorialService } from '../../historial.service';
import { ItemHistorial } from '../../../../shared/utils/modelos';
import { TEXTOS_HISTORIAL, TEXTOS_RESULTADO, TEXTOS_GENERAL, TEXTOS_ERRORES } from '../../../../shared/textos';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog.component';

@Component({
  selector: 'trx-historial',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <trx-confirm-dialog #dialog />

    <div class="space-y-4 animate-fade-in">
      <h1 class="text-xl font-bold text-principal">{{ TEXTOS.titulo }}</h1>

      @if (errorEliminar()) {
        <div class="text-xs text-error bg-error-fondo border border-error-borde rounded-2xl px-4 py-2.5 font-medium">
          {{ errorEliminar() }}
        </div>
      }

      <!-- Skeleton loader -->
      @if (cargando()) {
        <ul class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <li class="bg-fondo-tarjeta rounded-2xl p-4 space-y-2 shadow-sm border border-borde-sutil">
              <div class="flex justify-between items-center">
                <div class="skeleton h-4 w-40"></div>
                <div class="skeleton h-5 w-20 rounded-full"></div>
              </div>
              <div class="skeleton h-3 w-48"></div>
              <div class="flex justify-between items-end pt-1">
                <div class="skeleton h-4 w-24"></div>
                <div class="space-y-1">
                  <div class="skeleton h-3 w-28"></div>
                  <div class="skeleton h-3 w-28"></div>
                </div>
              </div>
            </li>
          }
        </ul>
      }

      <!-- Estado vacío -->
      @else if (items().length === 0) {
        <div class="flex flex-col items-center justify-center py-20 space-y-4 animate-scale-in">
          <div class="w-16 h-16 bg-fondo-input rounded-full flex items-center justify-center text-2xl">
            📋
          </div>
          <p class="text-secundario text-sm text-center">{{ TEXTOS.vacio }}</p>
          <a routerLink="/rastreo"
             class="bg-primario hover:bg-primario-hover text-white text-sm font-bold px-6 py-3 rounded-2xl
                    transition-colors shadow-lg shadow-primario/25">
            {{ TEXTOS.vacioCta }}
          </a>
        </div>
      }

      <!-- Lista -->
      @else {
        <ul class="space-y-3">
          @for (item of items(); track item.id; let i = $index) {
            <li class="bg-fondo-tarjeta rounded-2xl shadow-sm border border-borde-sutil overflow-hidden
                       animate-slide-up hover:shadow-md transition-shadow"
                [style.animation-delay]="(i * 60) + 'ms'">
              <div class="flex">
                <div [class]="bordeLateralClase(item.estado)" class="w-1 flex-shrink-0 rounded-l-2xl"></div>
                <div class="flex-1 p-4 space-y-1.5">
                  <!-- Fila 1: alias (si existe) + chip estado -->
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-sm font-semibold text-principal leading-tight">
                      {{ item.alias ? item.alias : (item.bancoEmisor + ' → ' + item.bancoReceptor) }}
                    </span>
                    <span [class]="chipClase(item.estado)"
                          class="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1">
                      {{ estadoIcono(item.estado) }} {{ etiquetaEstado(item.estado) }}
                    </span>
                  </div>
                  <!-- Fila 2: bancos (siempre visible, incluso cuando hay alias) -->
                  @if (item.alias) {
                    <p class="text-xs text-atenuado">{{ item.bancoEmisor }} → {{ item.bancoReceptor }}</p>
                  }
                  <!-- Concepto (cuando fue guardado) -->
                  @if (item.concepto) {
                    <p class="text-xs text-atenuado italic">{{ item.concepto }}</p>
                  }
                  <!-- Fila 3: monto + fechas -->
                  <div class="flex justify-between items-end pt-0.5">
                    <span class="text-base font-bold text-principal">
                      {{ item.monto | currency:'MXN':'symbol-narrow':'1.2-2' }}
                    </span>
                    <div class="text-right space-y-0.5">
                      <p class="text-xs text-atenuado flex items-center justify-end gap-1">
                        <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/>
                        </svg>
                        {{ item.fechaOperacion | date:'dd MMM yyyy' }}{{ item.horaOperacion ? ', ' + item.horaOperacion.substring(0, 5) : '' }}
                      </p>
                      <p class="text-xs text-atenuado flex items-center justify-end gap-1">
                        <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                        {{ item.fechaConsulta | date:'dd MMM yyyy, HH:mm' }}
                      </p>
                    </div>
                  </div>
                  <!-- Fila 4: re-verificar + eliminar -->
                  <div class="pt-1.5 mt-0.5 border-t border-borde-sutil flex items-center justify-between">
                    <button (click)="reverificar(item)"
                            class="text-xs font-semibold text-primario hover:text-primario-hover
                                   flex items-center gap-1 transition-colors">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                      {{ TEXTOS.botonReverificar }}
                    </button>
                    <button (click)="eliminar(item)" [disabled]="eliminando() === item.id"
                            class="text-xs font-semibold text-error hover:text-error/70
                                   flex items-center gap-1 transition-colors disabled:opacity-50">
                      @if (eliminando() === item.id) {
                        <span class="spinner"></span>
                      } @else {
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class HistorialComponent implements OnInit {
  @ViewChild('dialog') dialog!: ConfirmDialogComponent;

  private readonly historialService = inject(HistorialService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly TEXTOS     = TEXTOS_HISTORIAL;
  protected readonly TEXTOS_RES = TEXTOS_RESULTADO;
  protected readonly TEXTOS_GEN = TEXTOS_GENERAL;

  readonly items          = signal<ItemHistorial[]>([]);
  readonly cargando       = signal(true);
  readonly eliminando     = signal<string | null>(null);
  readonly errorEliminar  = signal<string | null>(null);

  ngOnInit(): void {
    this.historialService.obtener()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => { this.items.set(data); this.cargando.set(false); },
        error: () => this.cargando.set(false),
      });
  }

  async eliminar(item: ItemHistorial): Promise<void> {
    const confirmado = await this.dialog.preguntar({
      titulo:         this.TEXTOS.confirmarEliminarTitulo,
      mensaje:        this.TEXTOS.confirmarEliminarMensaje,
      textoConfirmar: this.TEXTOS.confirmarEliminarBoton,
      textoCancelar:  this.TEXTOS_GEN.cancelar,
      destructivo:    true,
    });
    if (!confirmado) return;
    this.eliminando.set(item.id);
    this.errorEliminar.set(null);
    this.historialService.eliminar(item.id).subscribe({
      next: () => {
        this.items.update(lista => lista.filter(i => i.id !== item.id));
        this.eliminando.set(null);
      },
      error: (err: any) => {
        this.eliminando.set(null);
        const msg = err?.status === 0 ? TEXTOS_ERRORES.sinConexion : (err?.error?.detail ?? TEXTOS_GENERAL.error);
        this.errorEliminar.set(msg);
        setTimeout(() => this.errorEliminar.set(null), 4000);
      },
    });
  }

  reverificar(item: ItemHistorial): void {
    this.router.navigate(['/app/rastreo'], {
      state: {
        prefill: {
          fechaOperacion: item.fechaOperacion,
          monto: item.monto,
          emisor: item.bancoEmisor,
          receptor: item.bancoReceptor,
        },
      },
    });
  }

  bordeLateralClase(estado: string): string {
    const mapa: Record<string, string> = {
      LIQUIDADA:     'bg-exito',
      RECHAZADA:     'bg-error',
      EN_PROCESO:    'bg-acento',
      NO_ENCONTRADA: 'bg-atenuado',
    };
    return mapa[estado] ?? mapa['NO_ENCONTRADA'];
  }

  chipClase(estado: string): string {
    const mapa: Record<string, string> = {
      LIQUIDADA:     'bg-exito-fondo text-exito',
      RECHAZADA:     'bg-error-tenue text-error',
      EN_PROCESO:    'bg-aviso-fondo text-aviso',
      NO_ENCONTRADA: 'bg-fondo-input text-secundario',
    };
    return mapa[estado] ?? mapa['NO_ENCONTRADA'];
  }

  estadoIcono(estado: string): string {
    const mapa: Record<string, string> = {
      LIQUIDADA: '✓', RECHAZADA: '✕', EN_PROCESO: '⏳', NO_ENCONTRADA: '–',
    };
    return mapa[estado] ?? '–';
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
