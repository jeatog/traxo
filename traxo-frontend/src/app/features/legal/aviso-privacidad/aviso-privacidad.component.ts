import { Component, OnInit, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TEXTOS_AVISO } from '../../../../app/shared/textos';

@Component({
  selector: 'trx-aviso-privacidad',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-fondo-base">

      <!-- Header -->
      <div class="bg-fondo-tarjeta border-b border-borde-sutil px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <a routerLink="/rastreo"
           class="w-9 h-9 flex items-center justify-center rounded-xl bg-fondo-input
                  text-secundario hover:bg-fondo-input/80 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="flex items-center gap-2">
          <img src="assets/icon.svg" alt="traxo" class="w-6 h-6 rounded-md"/>
          <span class="font-semibold text-principal">{{ TEXTOS.titulo }}</span>
        </div>
      </div>

      <!-- Contenido -->
      <div class="max-w-xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

        <div class="bg-fondo-tarjeta rounded-2xl p-5 shadow-sm space-y-4">
          <h1 class="text-lg font-bold text-principal">{{ TEXTOS.tituloPagina }}</h1>
          <p class="text-sm text-secundario leading-relaxed">{{ TEXTOS.intro }}</p>
        </div>

        <div class="bg-fondo-tarjeta rounded-2xl p-5 shadow-sm space-y-2">
          <h2 class="text-sm font-bold text-principal uppercase tracking-wider">
            {{ TEXTOS.seccionResponsable }}
          </h2>
          <p class="text-sm text-secundario leading-relaxed">
            {{ TEXTOS.responsableTexto }}
            <a href="mailto:{{ TEXTOS.responsableEmail }}" class="text-primario font-medium">{{ TEXTOS.responsableEmail }}</a>.
          </p>
        </div>

        <div class="bg-fondo-tarjeta rounded-2xl p-5 shadow-sm space-y-3">
          <h2 class="text-sm font-bold text-principal uppercase tracking-wider">
            {{ TEXTOS.seccionRecopilados }}
          </h2>
          <ul class="space-y-2">
            @for (item of datosRecopilados; track item.titulo) {
              <li class="flex items-start gap-3">
                <span class="mt-0.5 w-5 h-5 rounded-full bg-primario-tenue flex items-center justify-center flex-shrink-0">
                  <svg class="w-3 h-3 text-primario" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
                <div>
                  <p class="text-sm font-semibold text-principal">{{ item.titulo }}</p>
                  <p class="text-xs text-secundario mt-0.5">{{ item.desc }}</p>
                </div>
              </li>
            }
          </ul>
        </div>

        <div class="bg-error-fondo border border-error-borde rounded-2xl p-5 space-y-3">
          <h2 class="text-sm font-bold text-error uppercase tracking-wider">
            {{ TEXTOS.seccionNunca }}
          </h2>
          <ul class="space-y-2">
            @for (item of datosNunca; track item) {
              <li class="flex items-center gap-2.5">
                <span class="w-4 h-4 rounded-full bg-error-borde flex items-center justify-center flex-shrink-0">
                  <svg class="w-2.5 h-2.5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </span>
                <p class="text-sm text-error">{{ item }}</p>
              </li>
            }
          </ul>
        </div>

        <div class="bg-fondo-tarjeta rounded-2xl p-5 shadow-sm space-y-3">
          <h2 class="text-sm font-bold text-principal uppercase tracking-wider">
            {{ TEXTOS.seccionArco }}
          </h2>
          <p class="text-sm text-secundario leading-relaxed">
            {{ TEXTOS.arcoTexto1 }}
            <strong class="text-principal">{{ TEXTOS.arcoEmail }}</strong>.
          </p>
          <p class="text-sm text-secundario leading-relaxed">
            {{ TEXTOS.arcoTexto2 }}
            <strong class="text-principal">{{ TEXTOS.arcoSeccionPerfil }}</strong>,
            {{ TEXTOS.arcoTexto2Fin }}
          </p>
        </div>

        <div class="pb-4 text-center">
          <a routerLink="/rastreo"
             class="inline-flex items-center gap-2 text-sm font-semibold text-primario">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            {{ TEXTOS.volverRastrear }}
          </a>
        </div>

      </div>
    </div>
  `,
})
export class AvisoPrivacidadComponent implements OnInit {
  protected readonly TEXTOS = TEXTOS_AVISO;
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  readonly datosRecopilados = [
    { titulo: 'Correo electrónico', desc: 'Identificación y acceso a la cuenta' },
    { titulo: 'Contraseña cifrada', desc: 'Nunca almacenada en texto plano' },
    { titulo: 'Fecha y monto de operación', desc: 'Para el historial de consultas' },
    { titulo: 'Nombre del banco emisor y receptor', desc: 'Para el historial' },
    { titulo: 'Alias de consulta', desc: 'Etiqueta opcional que asignas a cada transferencia' },
    { titulo: 'Concepto (en caso de datos completos)', desc: 'Para el historial de consultas' },
  ];

  readonly datosNunca = [
    'Imagen del comprobante',
    'Clave de rastreo SPEI',
    'CLABE (ninguna, de nadie)',
    'Nombre del ordenante ni del beneficiario',
  ];
}
