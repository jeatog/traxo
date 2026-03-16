import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemaService } from '../../core/tema/tema.service';
import { TEXTOS_AUTH, TEXTOS_LANDING } from '../../shared/textos';

@Component({
  selector: 'trx-inicio',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-fondo-base flex flex-col transition-colors duration-200">

      <!-- Barra superior: solo toggle de tema -->
      <header class="flex justify-end px-5 py-4">
        <button (click)="tema.alternar()"
                class="w-9 h-9 flex items-center justify-center rounded-xl
                       text-secundario hover:bg-fondo-input transition-colors"
                [attr.aria-label]="T_L.ariaToggleTema">
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
      </header>

      <!-- Hero -->
      <main class="flex-1 flex flex-col items-center justify-center px-6 pb-16 gap-8 max-w-sm mx-auto w-full">

        <!-- Logo + nombre -->
        <div class="flex flex-col items-center gap-4">
          <div class="w-20 h-20 rounded-3xl bg-primario flex items-center justify-center shadow-lg">
            <svg width="48" height="48" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <line x1="140" y1="140" x2="372" y2="372"
                    stroke="rgba(255,255,255,0.92)" stroke-width="72" stroke-linecap="round"/>
              <line x1="140" y1="372" x2="372" y2="140"
                    stroke="#fbbf24" stroke-width="72" stroke-linecap="round"/>
              <circle cx="140" cy="372" r="30" fill="#fbbf24"/>
              <circle cx="372" cy="140" r="30" fill="#fbbf24"/>
            </svg>
          </div>

          <h1 class="text-4xl font-black tracking-tight text-principal leading-none">
            tra<span class="text-primario">x</span>o
          </h1>
        </div>

        <!-- Tagline + descripción -->
        <div class="text-center space-y-2">
          <p class="text-lg font-semibold text-principal leading-snug">
            {{ T_L.tagline }}
          </p>
          <p class="text-sm text-secundario leading-relaxed">
            {{ T_L.descripcion }}
          </p>
        </div>

        <!-- Features -->
        <div class="flex flex-wrap justify-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-primario-tenue text-primario text-xs font-semibold">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            {{ T_L.feature1 }}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-primario-tenue text-primario text-xs font-semibold">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            {{ T_L.feature2 }}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-primario-tenue text-primario text-xs font-semibold">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            {{ T_L.feature3 }}
          </span>
        </div>

        <!-- CTAs -->
        <div class="w-full space-y-3">
          <!-- Primario: consultar sin cuenta -->
          <a routerLink="/rastreo"
             class="flex items-center justify-center gap-2 w-full
                    bg-primario hover:bg-primario-hover text-white
                    font-semibold py-3.5 rounded-2xl text-sm transition-colors shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            {{ T_A.consultarSinCuenta }}
          </a>

          <!-- Secundario: iniciar sesión -->
          <a routerLink="/login"
             class="flex items-center justify-center w-full
                    border-2 border-borde text-principal
                    font-semibold py-3.5 rounded-2xl text-sm transition-colors
                    hover:bg-fondo-input">
            {{ T_A.enlaceLoginTexto }}
          </a>

          <!-- Ghost: registrarse -->
          <a routerLink="/registro"
             class="flex items-center justify-center w-full
                    text-primario font-semibold py-2 text-sm
                    hover:underline transition-colors">
            {{ T_A.enlaceRegistroTexto }}
          </a>
        </div>

      </main>
    </div>
  `,
})
export class InicioComponent {
  protected readonly tema = inject(TemaService);
  protected readonly T_L = TEXTOS_LANDING;
  protected readonly T_A = TEXTOS_AUTH;
}
