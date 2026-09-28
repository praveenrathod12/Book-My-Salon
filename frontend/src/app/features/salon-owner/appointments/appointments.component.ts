import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { Appointment } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';
import { PrettyDatePipe } from '../../../shared/pipes/pretty-date.pipe';
import { extractError } from '../../../core/utils/error.util';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' }
];

@Component({
  selector: 'app-owner-appointments',
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    InrPipe,
    PrettyTimePipe,
    PrettyDatePipe
  ],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.css'
})
export class OwnerAppointmentsComponent {
  private data = inject(DataService);
  private notify = inject(NotificationService);

  readonly filters = FILTERS;
  readonly activeFilter = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly appointments = signal<Appointment[]>([]);
  readonly updating = signal<number | null>(null);

  constructor() {
    this.load();
  }

  setFilter(key: string) {
    if (this.activeFilter() === key) return;
    this.activeFilter.set(key);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.data.getAppointments(this.activeFilter() || undefined).subscribe({
      next: (list) => {
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractError(err, 'Could not load appointments.'));
        this.loading.set(false);
      }
    });
  }

  canManage(a: Appointment): boolean {
    return a.status === 'CONFIRMED' || a.status === 'PENDING';
  }

  updateStatus(a: Appointment, status: string) {
    this.updating.set(a.id);
    this.data.updateAppointmentStatus(a.id, status).subscribe({
      next: () => {
        this.updating.set(null);
        this.notify.success('Appointment updated.');
        this.load();
      },
      error: (err) => {
        this.updating.set(null);
        this.notify.error(extractError(err, 'Could not update appointment.'));
      }
    });
  }
}
