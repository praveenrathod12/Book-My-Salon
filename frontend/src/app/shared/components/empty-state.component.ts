import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="state-block">
      <div style="font-size:2.5rem">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p class="muted">{{ message() }}</p>
      }
    </div>
  `
})
export class EmptyStateComponent {
  icon = input<string>('📭');
  title = input<string>('Nothing here yet');
  message = input<string>('');
}
