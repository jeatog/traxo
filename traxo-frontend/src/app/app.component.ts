import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SoporteComponent } from './shared/components/soporte.component';

@Component({
  selector: 'trx-root',
  standalone: true,
  imports: [RouterOutlet, SoporteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <trx-soporte />
  `,
})
export class AppComponent {}
