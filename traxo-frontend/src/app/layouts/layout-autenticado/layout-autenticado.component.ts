import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TemaService } from '../../core/tema/tema.service';
import { TEXTOS_NAV } from '../../shared/textos';

@Component({
  selector: 'trx-layout-autenticado',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-fondo-base flex flex-col transition-colors duration-200">

      <!-- Header compacto -->
      <header class="bg-fondo-tarjeta border-b border-borde-sutil
                     px-5 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <a routerLink="/" class="flex items-center gap-2">
          <img src="assets/icon.svg" alt="traxo" class="w-7 h-7 rounded-lg"/>
          <span class="font-bold text-xl tracking-tight text-principal">
            tra<span class="text-primario">x</span>o
          </span>
        </a>
        <div class="flex items-center gap-3">
          <!-- Toggle modo oscuro -->
          <button (click)="tema.alternar()"
                  class="w-8 h-8 flex items-center justify-center rounded-xl
                         text-secundario hover:bg-fondo-input transition-colors"
                  [attr.aria-label]="tema.esModoOscuro() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
            @if (tema.esModoOscuro()) {
              <!-- Sol -->
              <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path stroke-linecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            } @else {
              <!-- Luna -->
              <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            }
          </button>
          <button (click)="auth.cerrarSesion()"
                  class="text-xs font-semibold text-secundario hover:text-principal transition-colors">
            {{ TEXTOS.cerrarSesion }}
          </button>
        </div>
      </header>

      <main class="flex-1 px-4 py-5 pb-28 max-w-lg mx-auto w-full">
        <router-outlet />
      </main>

      <!-- Nav inferior -->
      <nav class="fixed bottom-0 inset-x-0 bg-fondo-tarjeta border-t border-borde-sutil z-20 shadow-lg">
        <div class="flex justify-around max-w-lg mx-auto px-2 py-2">

          <a routerLink="/app/rastreo" routerLinkActive #rastreoLink="routerLinkActive"
             class="flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl transition-all duration-200 text-xs font-semibold"
             [class.text-primario]="rastreoLink.isActive"
             [class.bg-primario-tenue]="rastreoLink.isActive"
             [class.text-atenuado]="!rastreoLink.isActive">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 [attr.stroke-width]="rastreoLink.isActive ? 2.5 : 1.8">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            {{ TEXTOS.rastreo }}
          </a>

          <a routerLink="/app/historial" routerLinkActive #histLink="routerLinkActive"
             class="flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl transition-all duration-200 text-xs font-semibold"
             [class.text-primario]="histLink.isActive"
             [class.bg-primario-tenue]="histLink.isActive"
             [class.text-atenuado]="!histLink.isActive">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 [attr.stroke-width]="histLink.isActive ? 2.5 : 1.8">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
            </svg>
            {{ TEXTOS.historial }}
          </a>

          <a routerLink="/app/perfil" routerLinkActive #perfilLink="routerLinkActive"
             class="flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl transition-all duration-200 text-xs font-semibold"
             [class.text-primario]="perfilLink.isActive"
             [class.bg-primario-tenue]="perfilLink.isActive"
             [class.text-atenuado]="!perfilLink.isActive">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 [attr.stroke-width]="perfilLink.isActive ? 2.5 : 1.8">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"/>
            </svg>
            {{ TEXTOS.perfil }}
          </a>

        </div>
      </nav>
    </div>
  `,
})
export class LayoutAutenticadoComponent {
  protected readonly TEXTOS = TEXTOS_NAV;
  constructor(
    protected readonly auth: AuthService,
    protected readonly tema: TemaService,
  ) {}
}
