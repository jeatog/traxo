import { Routes } from '@angular/router';
import { guardiaAutenticado } from './core/guardias/autenticado.guard';
import { guardiaInvitado } from './core/guardias/invitado.guard';
import { guardiaRastreoPublico } from './core/guardias/rastreo-publico.guard';

export const routes: Routes = [
  // Redirección raíz
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },

  {
    path: '',
    loadComponent: () =>
      import('./layouts/layout-auth/layout-auth.component').then(m => m.LayoutAuthComponent),
    children: [
      {
        path: 'login',
        canActivate: [guardiaInvitado],
        loadComponent: () =>
          import('./features/autenticacion/paginas/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'registro',
        canActivate: [guardiaInvitado],
        loadComponent: () =>
          import('./features/autenticacion/paginas/registro/registro.component').then(m => m.RegistroComponent),
      },
    ],
  },
  // Rutas públicas
  {
    path: '',
    loadComponent: () =>
      import('./layouts/layout-publico/layout-publico.component').then(m => m.LayoutPublicoComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/inicio/inicio.component').then(m => m.InicioComponent),
      },
      {
        path: 'rastreo',
        canActivate: [guardiaRastreoPublico],
        loadComponent: () =>
          import('./features/rastreo/paginas/rastreo/rastreo.component').then(m => m.RastreoComponent),
      },
      {
        path: 'aviso-privacidad',
        loadComponent: () =>
          import('./features/legal/aviso-privacidad/aviso-privacidad.component').then(m => m.AvisoPrivacidadComponent),
      },
    ],
  },
  // Rutas autenticadas
  {
    path: 'app',
    canActivate: [guardiaAutenticado],
    loadComponent: () =>
      import('./layouts/layout-autenticado/layout-autenticado.component').then(m => m.LayoutAutenticadoComponent),
    children: [
      { path: '', redirectTo: 'historial', pathMatch: 'full' },
      {
        path: 'rastreo',
        loadComponent: () =>
          import('./features/rastreo/paginas/rastreo/rastreo.component').then(m => m.RastreoComponent),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./features/historial/paginas/historial/historial.component').then(m => m.HistorialComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/autenticacion/paginas/perfil/perfil.component').then(m => m.PerfilComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'rastreo' },
];
