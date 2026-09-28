import { Component, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-host">
      @for (toast of notifications.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}">
          <span>{{ toast.message }}</span>
          <button (click)="notifications.dismiss(toast.id)" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `
})
export class ToastHostComponent {
  notifications = inject(NotificationService);
}
