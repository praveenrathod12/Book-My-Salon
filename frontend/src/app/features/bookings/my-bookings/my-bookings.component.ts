import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { Appointment } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';
import { PrettyDatePipe } from '../../../shared/pipes/pretty-date.pipe';
import { RescheduleModalComponent } from '../reschedule-modal/reschedule-modal.component';
import { extractError } from '../../../core/utils/error.util';

type Tab = 'upcoming' | 'history';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    RescheduleModalComponent,
    InrPipe,
    PrettyTimePipe,
    PrettyDatePipe
  ],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.css'
})
export class MyBookingsComponent {
  private data = inject(DataService);
  private notify = inject(NotificationService);

  readonly tab = signal<Tab>('upcoming');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly bookings = signal<Appointment[]>([]);

  readonly rescheduleTarget = signal<Appointment | null>(null);
  readonly cancelling = signal<number | null>(null);

  readonly canCancel = (a: Appointment) =>
    a.status === 'CONFIRMED' || a.status === 'PENDING';

  constructor() {
    this.load();
  }

  setTab(t: Tab) {
    if (this.tab() === t) return;
    this.tab.set(t);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.data.getAppointments(this.tab()).subscribe({
      next: (list) => {
        this.bookings.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractError(err, 'Could not load your bookings.'));
        this.loading.set(false);
      }
    });
  }

  cancel(a: Appointment) {
    if (!confirm(`Cancel your ${a.serviceName} appointment at ${a.salonName}?`)) return;
    this.cancelling.set(a.id);
    this.data.cancelAppointment(a.id, 'Cancelled by customer').subscribe({
      next: () => {
        this.cancelling.set(null);
        this.notify.success('Appointment cancelled.');
        this.load();
      },
      error: (err) => {
        this.cancelling.set(null);
        this.notify.error(extractError(err, 'Could not cancel the appointment.'));
      }
    });
  }

  openReschedule(a: Appointment) {
    this.rescheduleTarget.set(a);
  }

  onRescheduled() {
    this.rescheduleTarget.set(null);
    this.notify.success('Appointment rescheduled.');
    this.load();
  }
}
