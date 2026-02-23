import {
  Component, Input, computed, signal, forwardRef,
  HostListener, ElementRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface DiaCelda {
  dia: number | null;
  fecha: string;
  esHoy: boolean;
  esFutura: boolean;
  seleccionado: boolean;
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

@Component({
  selector: 'trx-calendario',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CalendarioComponent),
    multi: true,
  }],
  template: `
    <div class="relative">

      <!-- Trigger -->
      <button type="button"
              (click)="alternar($event)"
              class="w-full border-2 rounded-2xl px-4 py-3.5 text-sm text-left transition-all duration-200
                     bg-fondo-input focus:outline-none focus:bg-fondo-tarjeta flex items-center justify-between"
              [class.border-error]="error"
              [class.border-primario]="abierto() && !error"
              [class.border-borde]="!abierto() && !error">
        <span [class.text-principal]="valor()" [class.text-atenuado]="!valor()">
          {{ textoFecha() || placeholder }}
        </span>
        <svg class="w-4 h-4 text-atenuado flex-shrink-0 transition-transform duration-200"
             [class.rotate-180]="abierto()"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </button>

      <!-- Panel del calendario -->
      @if (abierto()) {
        <div class="absolute z-50 mt-2 w-full bg-fondo-tarjeta border border-borde rounded-2xl
                    shadow-xl p-4 animate-scale-in">

          <!-- Navegación de mes -->
          <div class="flex items-center justify-between mb-3">
            <button type="button" (click)="mesAnterior()"
                    class="w-8 h-8 flex items-center justify-center rounded-full
                           hover:bg-fondo-input text-secundario transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span class="text-sm font-semibold text-principal capitalize">{{ tituloMes() }}</span>
            <button type="button" (click)="mesSiguiente()"
                    class="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                    [class.hover:bg-fondo-input]="!mesSiguienteEsFuturo()"
                    [class.text-secundario]="!mesSiguienteEsFuturo()"
                    [class.text-atenuado]="mesSiguienteEsFuturo()"
                    [class.opacity-30]="mesSiguienteEsFuturo()"
                    [disabled]="mesSiguienteEsFuturo()">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <!-- Encabezado días de semana -->
          <div class="grid grid-cols-7 mb-1">
            @for (d of diasSemana; track d) {
              <div class="text-center text-xs font-semibold text-atenuado py-1">{{ d }}</div>
            }
          </div>

          <!-- Rejilla de días -->
          <div class="grid grid-cols-7 gap-y-0.5">
            @for (celda of diasMes(); track $index) {
              @if (celda.dia === null) {
                <div></div>
              } @else {
                <button type="button"
                        (click)="seleccionar(celda)"
                        [disabled]="celda.esFutura"
                        class="h-8 w-full flex items-center justify-center rounded-lg text-sm
                               font-medium transition-colors"
                        [class.bg-primario]="celda.seleccionado"
                        [class.text-white]="celda.seleccionado"
                        [class.font-bold]="celda.seleccionado"
                        [class.ring-1]="celda.esHoy && !celda.seleccionado"
                        [class.ring-primario]="celda.esHoy && !celda.seleccionado"
                        [class.text-primario]="celda.esHoy && !celda.seleccionado"
                        [class.text-secundario]="!celda.esHoy && !celda.seleccionado && !celda.esFutura"
                        [class.text-atenuado]="celda.esFutura"
                        [class.opacity-30]="celda.esFutura"
                        [class.cursor-default]="celda.esFutura"
                        [class.hover:bg-fondo-input]="!celda.seleccionado && !celda.esFutura">
                  {{ celda.dia }}
                </button>
              }
            }
          </div>

        </div>
      }

    </div>
  `,
})
export class CalendarioComponent implements ControlValueAccessor {
  @Input() error = false;
  @Input() placeholder = 'Selecciona una fecha';

  readonly diasSemana = DIAS_SEMANA;

  readonly valor    = signal<string>('');
  readonly abierto  = signal(false);
  readonly mesVista = signal(new Date());

  private onChange:  (v: string) => void = () => {};
  private onTouched: () => void          = () => {};

  constructor(private elRef: ElementRef) {}

  writeValue(value: string): void {
    this.valor.set(value ?? '');
    if (value) {
      this.mesVista.set(new Date(value + 'T00:00:00'));
    }
  }

  registerOnChange(fn: (v: string) => void): void  { this.onChange  = fn; }
  registerOnTouched(fn: () => void): void           { this.onTouched = fn; }

  readonly textoFecha = computed(() => {
    if (!this.valor()) return '';
    const d = new Date(this.valor() + 'T00:00:00');
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(d);
  });

  readonly tituloMes = computed(() =>
    new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(this.mesVista()),
  );

  readonly mesSiguienteEsFuturo = computed(() => {
    const hoy = new Date();
    const sig = new Date(this.mesVista().getFullYear(), this.mesVista().getMonth() + 1, 1);
    return sig.getFullYear() > hoy.getFullYear() ||
      (sig.getFullYear() === hoy.getFullYear() && sig.getMonth() > hoy.getMonth());
  });

  readonly diasMes = computed((): DiaCelda[] => {
    const hoy      = new Date();
    const vista    = this.mesVista();
    const anio     = vista.getFullYear();
    const mes      = vista.getMonth();
    const total    = new Date(anio, mes + 1, 0).getDate();
    const offset   = (new Date(anio, mes, 1).getDay() + 6) % 7; // lunes = 0

    const celdas: DiaCelda[] = Array.from({ length: offset }, () => ({
      dia: null, fecha: '', esHoy: false, esFutura: false, seleccionado: false,
    }));

    for (let d = 1; d <= total; d++) {
      const fecha  = new Date(anio, mes, d);
      const iso    = this.toIso(fecha);
      const hoyIso = this.toIso(hoy);
      celdas.push({
        dia: d,
        fecha: iso,
        esHoy: iso === hoyIso,
        esFutura: fecha > hoy,
        seleccionado: iso === this.valor(),
      });
    }
    return celdas;
  });

  // Acciones
  alternar(event: Event): void {
    event.stopPropagation();
    this.abierto.update(v => !v);
    if (this.abierto()) this.onTouched();
  }

  seleccionar(celda: DiaCelda): void {
    if (celda.esFutura || !celda.fecha) return;
    this.valor.set(celda.fecha);
    this.onChange(celda.fecha);
    this.onTouched();
    this.abierto.set(false);
  }

  mesAnterior(): void {
    const v = this.mesVista();
    this.mesVista.set(new Date(v.getFullYear(), v.getMonth() - 1, 1));
  }

  mesSiguiente(): void {
    if (this.mesSiguienteEsFuturo()) return;
    const v = this.mesVista();
    this.mesVista.set(new Date(v.getFullYear(), v.getMonth() + 1, 1));
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: Event): void {
    if (this.abierto() && !this.elRef.nativeElement.contains(event.target)) {
      this.abierto.set(false);
    }
  }

  // Helpers
  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
