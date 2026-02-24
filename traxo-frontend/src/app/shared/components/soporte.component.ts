import { Component, signal } from '@angular/core';
import { TEXTOS_SOPORTE } from '../textos';

@Component({
  selector: 'trx-soporte',
  standalone: true,
  template: `
    <!-- Botón flotante ? -->
    <button (click)="visible.set(true)"
            class="fixed bottom-20 right-4 z-40 w-9 h-9 rounded-full
                   bg-fondo-tarjeta border border-borde shadow-md
                   text-primario hover:shadow-lg
                   transition-all flex items-center justify-center
                   text-sm font-bold select-none"
            [attr.aria-label]="T.ariaBoton">
      ?
    </button>

    <!-- Modal -->
    @if (visible()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="visible.set(false)">
        <div class="bg-fondo-tarjeta rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in"
             (click)="$event.stopPropagation()">

          <h2 class="text-base font-bold text-principal">{{ T.titulo }}</h2>

          <p class="text-sm text-secundario leading-relaxed" style="white-space: pre-line">{{ T.mensaje }}</p>

          <a [href]="'mailto:' + T.email"
             class="flex items-center gap-2 text-primario font-semibold text-sm hover:underline">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7
                       a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            {{ T.email }}
          </a>

          <div class="pt-1">
            <button (click)="visible.set(false)"
                    class="w-full border-2 border-borde text-principal font-semibold
                           py-2.5 rounded-2xl text-sm hover:bg-fondo-input transition-colors">
              {{ T.cerrar }}
            </button>
          </div>

        </div>
      </div>
    }
  `,
})
export class SoporteComponent {
  readonly visible = signal(false);
  protected readonly T = TEXTOS_SOPORTE;
}
