import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tablero } from './maqueta/tablero';

@Component({
  selector: 'app-root',
  imports: [Tablero],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
