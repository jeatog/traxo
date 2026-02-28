import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/auth/auth.service';
import { PerfilService } from '../../perfil.service';
import { environment } from '../../../../../environments/environment';
import { TEXTOS_PERFIL, TEXTOS_GENERAL, TEXTOS_ERRORES } from '../../../../shared/textos';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog.component';

@Component({
  selector: 'trx-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <trx-confirm-dialog #dialog />

    <div class="space-y-4 animate-fade-in">
      <h1 class="text-xl font-bold text-principal">{{ TEXTOS.titulo }}</h1>

      <!-- Cambiar nombre -->
      <div class="bg-fondo-tarjeta rounded-2xl shadow-sm border border-borde-sutil p-5 space-y-3">
        <h2 class="text-sm font-semibold text-secundario uppercase tracking-wide">{{ TEXTOS.etiquetaNombre }}</h2>
        <form [formGroup]="formNombre" (ngSubmit)="guardarNombre()" class="flex gap-2">
          <input formControlName="nombre" type="text" [placeholder]="TEXTOS.placeholderNombre"
                 class="flex-1 border-2 border-borde rounded-2xl px-4 py-2.5 text-sm text-principal
                        bg-fondo-input focus:outline-none focus:border-primario focus:bg-fondo-tarjeta transition-all"/>
          <button type="submit" [disabled]="guardandoNombre()"
                  class="bg-primario hover:bg-primario-hover disabled:opacity-60 text-white text-sm font-bold
                         px-5 py-2.5 rounded-2xl transition-colors flex items-center gap-1.5">
            @if (guardandoNombre()) { <span class="spinner"></span> }
            @else { {{ TEXTOS.botonGuardar }} }
          </button>
        </form>
        @if (exitoNombre()) {
          <p class="text-xs text-exito font-medium flex items-center gap-1">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            {{ TEXTOS.exitoNombre }}
          </p>
        }
        @if (errorNombre()) {
          <p class="text-xs text-error font-medium">{{ errorNombre() }}</p>
        }
      </div>

      <!-- Cambiar contraseña -->
      <div class="bg-fondo-tarjeta rounded-2xl shadow-sm border border-borde-sutil p-5 space-y-3">
        <h2 class="text-sm font-semibold text-secundario uppercase tracking-wide">{{ TEXTOS.botonCambiarContrasena }}</h2>
        <form [formGroup]="formContrasena" (ngSubmit)="cambiarContrasena()" class="space-y-3">
          <input formControlName="contrasenaActual" type="password" [placeholder]="TEXTOS.contrasenaActual"
                 class="w-full border-2 border-borde rounded-2xl px-4 py-3 text-sm text-principal
                        bg-fondo-input placeholder:text-atenuado focus:outline-none focus:border-primario
                        focus:bg-fondo-tarjeta transition-all"/>
          <input formControlName="contrasenaNueva" type="password" [placeholder]="TEXTOS.contrasenaNueva"
                 class="w-full border-2 border-borde rounded-2xl px-4 py-3 text-sm text-principal
                        bg-fondo-input placeholder:text-atenuado focus:outline-none focus:border-primario
                        focus:bg-fondo-tarjeta transition-all"/>
          <button type="submit" [disabled]="guardandoContrasena()"
                  class="w-full bg-primario hover:bg-primario-hover disabled:opacity-60 text-white text-sm font-bold
                         py-3 rounded-2xl transition-colors flex items-center justify-center gap-2
                         shadow-md shadow-primario/20">
            @if (guardandoContrasena()) { <span class="spinner"></span> }
            @else { {{ TEXTOS.botonCambiarContrasena }} }
          </button>
        </form>
        @if (exitoContrasena()) {
          <p class="text-xs text-exito font-medium flex items-center gap-1">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            {{ TEXTOS.exitoContrasena }}
          </p>
        }
        @if (errorContrasena()) {
          <p class="text-xs text-error font-medium">{{ errorContrasena() }}</p>
        }
      </div>

      <!-- Cerrar sesion -->
      <button (click)="auth.cerrarSesion()"
              class="w-full border-2 border-borde text-principal font-semibold py-3.5 rounded-2xl
                     text-sm hover:bg-fondo-input transition-colors">
        {{ TEXTOS.botonCerrarSesion }}
      </button>

      <!-- Zona de peligro -->
      <div class="bg-error-fondo rounded-2xl border border-error-borde p-5 space-y-3">
        <h2 class="text-sm font-semibold text-error uppercase tracking-wide">{{ TEXTOS.zonaPeligro }}</h2>
        <button (click)="confirmarEliminar()"
                class="w-full border-2 border-error-borde text-error font-semibold py-3 rounded-2xl
                       text-sm hover:bg-error-tenue transition-colors">
          {{ TEXTOS.botonEliminarCuenta }}
        </button>
        @if (errorEliminarCuenta()) {
          <p class="text-xs text-error font-medium">{{ errorEliminarCuenta() }}</p>
        }
      </div>
    </div>
  `,
})
export class PerfilComponent implements OnInit {
  @ViewChild('dialog') dialog!: ConfirmDialogComponent;

  protected readonly TEXTOS     = TEXTOS_PERFIL;
  protected readonly TEXTOS_GEN = TEXTOS_GENERAL;

  readonly guardandoNombre      = signal(false);
  readonly guardandoContrasena  = signal(false);
  readonly exitoNombre          = signal(false);
  readonly exitoContrasena      = signal(false);
  readonly errorNombre          = signal<string | null>(null);
  readonly errorContrasena      = signal<string | null>(null);
  readonly errorEliminarCuenta  = signal<string | null>(null);

  readonly formNombre = this.fb.group({ nombre: ['', Validators.required] });
  readonly formContrasena = this.fb.group({
    contrasenaActual: ['', Validators.required],
    contrasenaNueva:  ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private perfilService: PerfilService,
    protected readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.perfilService.obtener().subscribe({
      next: perfil => this.formNombre.patchValue({ nombre: perfil.nombre }),
    });
  }

  guardarNombre(): void {
    if (this.formNombre.invalid) return;
    this.guardandoNombre.set(true);
    this.errorNombre.set(null);
    this.exitoNombre.set(false);
    this.http.patch(`${environment.apiUrl}/perfil/nombre`, this.formNombre.value).subscribe({
      next: () => {
        this.perfilService.actualizarNombre(this.formNombre.value.nombre ?? '');
        this.guardandoNombre.set(false);
        this.exitoNombre.set(true);
        setTimeout(() => this.exitoNombre.set(false), 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoNombre.set(false);
        this.errorNombre.set(this.mensajeError(err));
      },
    });
  }

  cambiarContrasena(): void {
    if (this.formContrasena.invalid) return;
    this.guardandoContrasena.set(true);
    this.errorContrasena.set(null);
    this.exitoContrasena.set(false);
    this.http.patch(`${environment.apiUrl}/perfil/contrasena`, this.formContrasena.value).subscribe({
      next: () => {
        this.formContrasena.reset();
        this.guardandoContrasena.set(false);
        this.exitoContrasena.set(true);
        setTimeout(() => this.exitoContrasena.set(false), 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoContrasena.set(false);
        this.errorContrasena.set(this.mensajeError(err));
      },
    });
  }

  async confirmarEliminar(): Promise<void> {
    const confirmado = await this.dialog.preguntar({
      titulo:         this.TEXTOS.confirmarEliminarTitulo,
      mensaje:        this.TEXTOS.confirmacionEliminar,
      textoConfirmar: this.TEXTOS.confirmarEliminarBoton,
      textoCancelar:  this.TEXTOS_GEN.cancelar,
      destructivo:    true,
    });
    if (!confirmado) return;
    this.errorEliminarCuenta.set(null);
    this.http.delete(`${environment.apiUrl}/perfil`).subscribe({
      next: () => this.auth.cerrarSesion(),
      error: (err: HttpErrorResponse) => this.errorEliminarCuenta.set(this.mensajeError(err)),
    });
  }

  private mensajeError(err: HttpErrorResponse): string {
    if (err.status === 0) return TEXTOS_ERRORES.sinConexion;
    return err.error?.detail ?? TEXTOS_GENERAL.error;
  }
}
