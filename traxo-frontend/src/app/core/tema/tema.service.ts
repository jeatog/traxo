import { Inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const CLAVE = 'traxo_tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly esModoOscuro = signal(false);

  constructor(@Inject(DOCUMENT) private doc: Document) {
    const guardado = localStorage.getItem(CLAVE);
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.aplicar(guardado ? guardado === 'oscuro' : prefiereDark);
  }

  alternar(): void {
    this.aplicar(!this.esModoOscuro());
  }

  private aplicar(oscuro: boolean): void {
    this.esModoOscuro.set(oscuro);
    this.doc.documentElement.classList.toggle('dark', oscuro);
    localStorage.setItem(CLAVE, oscuro ? 'oscuro' : 'claro');
  }
}
