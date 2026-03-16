import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'trx-layout-publico',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-fondo-base flex flex-col">
      <router-outlet />
    </div>
  `,
})
export class LayoutPublicoComponent {}
