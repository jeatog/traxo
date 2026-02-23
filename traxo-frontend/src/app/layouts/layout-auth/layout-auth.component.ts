import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemaService } from '../../core/tema/tema.service';

@Component({
  selector: 'trx-layout-auth',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primario to-primario-hover flex flex-col sm:items-center sm:justify-center sm:py-10 relative">
      <!-- Toggle modo oscuro (esquina) -->
      <button (click)="tema.alternar()"
              class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full
                     text-white/70 hover:bg-white/15 transition-colors z-10"
              [attr.aria-label]="tema.esModoOscuro() ? 'Modo claro' : 'Modo oscuro'">
        @if (tema.esModoOscuro()) {
          <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4"/>
            <path stroke-linecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        } @else {
          <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        }
      </button>
      <router-outlet />
    </div>
  `,
})
export class LayoutAuthComponent {
  constructor(protected readonly tema: TemaService) {}
}
