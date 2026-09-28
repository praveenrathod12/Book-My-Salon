import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <div class="state-block">
      <div class="spinner"></div>
      @if (label()) {
        <p class="muted">{{ label() }}</p>
      }
    </div>
  `
})
export class SpinnerComponent {
  label = input<string>('Loading...');
}
