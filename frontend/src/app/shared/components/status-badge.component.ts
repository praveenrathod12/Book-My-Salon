import { Component, computed, input } from '@angular/core';
import { AppointmentStatus } from '../../core/models/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge {{ cls() }}">{{ label() }}</span>`
})
export class StatusBadgeComponent {
  status = input.required<AppointmentStatus | string>();

  cls = computed(() => {
    switch (this.status()) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'badge-success';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'badge-danger';
      case 'PENDING':
        return 'badge-warning';
      default:
        return 'badge-muted';
    }
  });

  label = computed(() => String(this.status()).replace('_', ' '));
}
