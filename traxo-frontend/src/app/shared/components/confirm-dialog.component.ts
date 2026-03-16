import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export interface ConfirmDialogConfig {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  textoCancelar: string;
  destructivo?: boolean;
}

@Component({
  selector: 'trx-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="responder(false)">
        <div class="bg-fondo-tarjeta rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in"
             (click)="$event.stopPropagation()">
          <h2 class="text-base font-bold text-principal">{{ config()!.titulo }}</h2>
          <p class="text-sm text-secundario leading-relaxed">{{ config()!.mensaje }}</p>
          <div class="flex gap-3 pt-1">
            <button (click)="responder(false)"
                    class="flex-1 border-2 border-borde text-principal font-semibold py-2.5 rounded-2xl
                           text-sm hover:bg-fondo-input transition-colors">
              {{ config()!.textoCancelar }}
            </button>
            <button (click)="responder(true)"
                    [class]="config()!.destructivo
                      ? 'flex-1 bg-error text-white font-bold py-2.5 rounded-2xl text-sm hover:opacity-80 transition-opacity'
                      : 'flex-1 bg-primario hover:bg-primario-hover text-white font-bold py-2.5 rounded-2xl text-sm transition-colors'">
              {{ config()!.textoConfirmar }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly visible = signal(false);
  readonly config  = signal<ConfirmDialogConfig | null>(null);

  private resolve!: (value: boolean) => void;

  preguntar(cfg: ConfirmDialogConfig): Promise<boolean> {
    this.config.set(cfg);
    this.visible.set(true);
    return new Promise(res => { this.resolve = res; });
  }

  responder(valor: boolean): void {
    this.visible.set(false);
    this.resolve(valor);
  }
}
