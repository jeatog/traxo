import { Component, AfterViewInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TEXTOS_AUTH, TEXTOS_AVISO, TEXTOS_ERRORES, TEXTOS_GENERAL } from '../../../../shared/textos';
import { environment } from '../../../../../environments/environment';

declare const turnstile: { render: (el: string, opts: object) => void } | undefined;

@Component({
  selector: 'trx-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex flex-col min-h-screen sm:min-h-0 w-full sm:max-w-sm">

      <div class="flex flex-col items-center justify-center pt-12 pb-8 px-6 sm:pt-8 sm:pb-5 animate-fade-in">
        <img src="assets/icon.svg" alt="traxo" class="w-14 h-14 rounded-2xl shadow-lg mb-4"/>
        <p class="text-white font-bold text-3xl tracking-tight">
          tra<span class="text-acento">x</span>o
        </p>
        <p class="text-sobre-marca text-sm mt-1">{{ TEXTOS.subtituloRegistro }}</p>
      </div>

      <div class="flex-1 sm:flex-none bg-fondo-tarjeta rounded-t-3xl sm:rounded-3xl px-6 pt-8 pb-10 shadow-2xl animate-slide-up">
        <h2 class="text-xl font-bold text-principal mb-6">{{ TEXTOS.tituloRegistro }}</h2>

        <form [formGroup]="formulario" (ngSubmit)="registrar()" class="space-y-4">

          <div class="space-y-1">
            <label class="text-xs font-semibold text-atenuado uppercase tracking-wider">{{ TEXTOS.etiquetaNombre }}</label>
            <input formControlName="nombre" type="text" autocomplete="name"
                   [placeholder]="TEXTOS.placeholderNombre"
                   class="w-full border-2 rounded-2xl px-4 py-3.5 text-sm text-principal bg-fondo-input
                          placeholder:text-atenuado focus:outline-none focus:border-primario focus:bg-fondo-tarjeta
                          transition-all duration-200"
                   [class.border-error]="campo('nombre')?.invalid && campo('nombre')?.touched"
                   [class.border-borde]="!(campo('nombre')?.invalid && campo('nombre')?.touched)"/>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-atenuado uppercase tracking-wider">
              {{ TEXTOS.etiquetaEmail }}
            </label>
            <input formControlName="email" type="email" autocomplete="email"
                   [placeholder]="TEXTOS.placeholderEmail"
                   class="w-full border-2 rounded-2xl px-4 py-3.5 text-sm text-principal bg-fondo-input
                          placeholder:text-atenuado focus:outline-none focus:border-primario focus:bg-fondo-tarjeta
                          transition-all duration-200"
                   [class.border-error]="campo('email')?.invalid && campo('email')?.touched"
                   [class.border-borde]="!(campo('email')?.invalid && campo('email')?.touched)"/>
            @if (campo('email')?.invalid && campo('email')?.touched) {
              <p class="text-error text-xs pl-1 animate-fade-in">{{ TEXTOS_ERR.emailInvalido }}</p>
            }
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-atenuado uppercase tracking-wider">
              {{ TEXTOS.etiquetaContrasena }}
            </label>
            <input formControlName="contrasena" type="password" autocomplete="new-password"
                   [placeholder]="TEXTOS.placeholderContrasenaNueva"
                   class="w-full border-2 rounded-2xl px-4 py-3.5 text-sm text-principal bg-fondo-input
                          placeholder:text-atenuado focus:outline-none focus:border-primario focus:bg-fondo-tarjeta
                          transition-all duration-200"
                   [class.border-error]="campo('contrasena')?.invalid && campo('contrasena')?.touched"
                   [class.border-borde]="!(campo('contrasena')?.invalid && campo('contrasena')?.touched)"/>
            @if (campo('contrasena')?.invalid && campo('contrasena')?.touched) {
              <p class="text-error text-xs pl-1 animate-fade-in">{{ TEXTOS_ERR.contrasenaMinimo }}</p>
            }
          </div>

          @if (siteKey) {
            <div id="trx-turnstile" class="flex justify-center pt-1"></div>
          }

          @if (errorMensaje()) {
            <div class="bg-error-fondo border border-error-borde rounded-2xl px-4 py-3 animate-scale-in">
              <p class="text-error text-sm">{{ errorMensaje() }}</p>
            </div>
          }

          <button type="submit" [disabled]="cargando() || (!!siteKey && !turnstileToken())"
                  class="w-full bg-primario hover:bg-primario-hover active:scale-[0.98] disabled:opacity-60
                         text-white font-bold py-4 rounded-2xl text-sm transition-all duration-150
                         flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primario/25">
            @if (cargando()) { <span class="spinner"></span> }
            @else { {{ TEXTOS.botonRegistro }} }
          </button>
        </form>

        <p class="text-center text-sm text-secundario mt-6">
          {{ TEXTOS.preguntaTieneCuenta }}
          <a routerLink="/login" class="text-primario font-semibold ml-1">{{ TEXTOS.enlaceLoginTexto }}</a>
        </p>
        <div class="border-t border-borde-sutil mt-5 pt-4 text-center">
          <a routerLink="/rastreo"
             class="inline-flex items-center gap-1.5 text-sm text-secundario hover:text-primario transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            {{ TEXTOS.consultarSinCuenta }}
          </a>
        </div>

        <p class="text-center text-xs text-atenuado mt-4">
          {{ TEXTOS_AV.avisoRegistro }}
          <a routerLink="/aviso-privacidad" class="text-primario underline underline-offset-2">{{ TEXTOS_AV.avisoRegistroEnlace }}</a>.
        </p>
      </div>
    </div>
  `,
})
export class RegistroComponent implements AfterViewInit {
  protected readonly TEXTOS = TEXTOS_AUTH;
  protected readonly TEXTOS_ERR = TEXTOS_ERRORES;
  protected readonly TEXTOS_AV = TEXTOS_AVISO;
  protected readonly siteKey = environment.turnstileSiteKey;

  readonly cargando = signal(false);
  readonly errorMensaje = signal<string | null>(null);
  readonly turnstileToken = signal<string | null>(null);

  readonly formulario = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngAfterViewInit(): void {
    if (!this.siteKey) return;
    const render = () => {
      if (typeof turnstile !== 'undefined') {
        turnstile.render('#trx-turnstile', {
          sitekey: this.siteKey,
          callback: (t: string) => this.turnstileToken.set(t),
          'expired-callback': () => this.turnstileToken.set(null),
          'error-callback': () => this.turnstileToken.set(null),
        });
      } else {
        setTimeout(render, 150);
      }
    };
    setTimeout(render, 0);
  }

  campo(nombre: string) { return this.formulario.get(nombre); }

  registrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const token = this.turnstileToken();
    if (this.siteKey && !token) {
      this.errorMensaje.set(TEXTOS_ERRORES.turnstileRequerido);
      return;
    }
    this.cargando.set(true);
    this.errorMensaje.set(null);

    const { nombre, email, contrasena } = this.formulario.value;
    this.auth.registrar(nombre!, email!, contrasena!, token ?? '').subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err: any) => {
        const msg = err?.status === 429
          ? TEXTOS_ERRORES.demasiadosIntentos
          : (err?.error?.detail ?? TEXTOS_GENERAL.error);
        this.errorMensaje.set(msg);
        this.cargando.set(false);
      },
    });
  }
}
