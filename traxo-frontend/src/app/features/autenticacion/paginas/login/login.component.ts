import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TEXTOS_AUTH, TEXTOS_ERRORES } from '../../../../shared/textos';

@Component({
  selector: 'trx-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex flex-col min-h-screen sm:min-h-0 w-full sm:max-w-sm">

      <div class="flex flex-col items-center justify-center pt-14 pb-8 px-6 sm:pt-10 sm:pb-6 animate-fade-in">
        <img src="assets/icon.svg" alt="traxo" class="w-14 h-14 rounded-2xl shadow-lg mb-4"/>
        <p class="text-white font-bold text-3xl tracking-tight">
          tra<span class="text-acento">x</span>o
        </p>
        <p class="text-sobre-marca text-sm mt-1">{{ TEXTOS.subtituloLogin }}</p>
      </div>

      <div class="flex-1 sm:flex-none bg-fondo-tarjeta rounded-t-3xl sm:rounded-3xl px-6 pt-8 pb-10 shadow-2xl animate-slide-up">
        <h2 class="text-xl font-bold text-principal mb-6">{{ TEXTOS.tituloLogin }}</h2>

        <form [formGroup]="formulario" (ngSubmit)="entrar()" class="space-y-4">

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
            <input formControlName="contrasena" type="password" autocomplete="current-password"
                   [placeholder]="TEXTOS.placeholderContrasena"
                   class="w-full border-2 rounded-2xl px-4 py-3.5 text-sm text-principal bg-fondo-input
                          placeholder:text-atenuado focus:outline-none focus:border-primario focus:bg-fondo-tarjeta
                          transition-all duration-200"
                   [class.border-error]="campo('contrasena')?.invalid && campo('contrasena')?.touched"
                   [class.border-borde]="!(campo('contrasena')?.invalid && campo('contrasena')?.touched)"/>
          </div>

          @if (errorMensaje()) {
            <div class="bg-error-fondo border border-error-borde rounded-2xl px-4 py-3 animate-scale-in">
              <p class="text-error text-sm">{{ errorMensaje() }}</p>
            </div>
          }

          <button type="submit" [disabled]="cargando()"
                  class="w-full bg-primario hover:bg-primario-hover active:scale-[0.98] disabled:opacity-60
                         text-white font-bold py-4 rounded-2xl text-sm transition-all duration-150
                         flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primario/25">
            @if (cargando()) { <span class="spinner"></span> }
            @else { {{ TEXTOS.botonLogin }} }
          </button>
        </form>

        <p class="text-center text-sm text-secundario mt-6">
          {{ TEXTOS.preguntaSinCuenta }}
          <a routerLink="/registro" class="text-primario font-semibold ml-1">{{ TEXTOS.enlaceRegistroTexto }}</a>
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
        <p class="text-center mt-3">
          <a routerLink="/aviso-privacidad" class="text-xs text-atenuado underline underline-offset-2">
            {{ TEXTOS.avisoPrivacidad }}
          </a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  protected readonly TEXTOS = TEXTOS_AUTH;
  protected readonly TEXTOS_ERR = TEXTOS_ERRORES;

  readonly cargando = signal(false);
  readonly errorMensaje = signal<string | null>(null);

  readonly formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {}

  campo(nombre: string) { return this.formulario.get(nombre); }

  entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.errorMensaje.set(null);

    const { email, contrasena } = this.formulario.value;
    this.auth.login(email!, contrasena!).subscribe({
      next: () => this.router.navigate(['/app/historial']),
      error: () => {
        this.errorMensaje.set(TEXTOS_ERRORES.credencialesIncorrectas);
        this.cargando.set(false);
      },
    });
  }
}
