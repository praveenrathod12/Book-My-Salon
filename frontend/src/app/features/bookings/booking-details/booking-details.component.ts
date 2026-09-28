import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Appointment } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';
import { PrettyDatePipe } from '../../../shared/pipes/pretty-date.pipe';
import { extractError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SpinnerComponent,
    StatusBadgeComponent,
    InrPipe,
    PrettyTimePipe,
    PrettyDatePipe
  ],
  templateUrl: './booking-details.component.html',
  styleUrl: './booking-details.component.css'
})
export class BookingDetailsComponent {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly appt = signal<Appointment | null>(null);
  readonly cancelling = signal(false);
  readonly isCustomer = this.auth.isCustomer;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.data.getAppointment(id).subscribe({
      next: (a) => {
        this.appt.set(a);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractError(err, 'Could not load this booking.'));
        this.loading.set(false);
      }
    });
  }

  canCancel(): boolean {
    const a = this.appt();
    return !!a && (a.status === 'CONFIRMED' || a.status === 'PENDING');
  }

  cancel() {
    const a = this.appt();
    if (!a || !confirm('Cancel this appointment?')) return;
    this.cancelling.set(true);
    this.data.cancelAppointment(a.id, 'Cancelled by customer').subscribe({
      next: (updated) => {
        this.cancelling.set(false);
        this.appt.set(updated);
        this.notify.success('Appointment cancelled.');
      },
      error: (err) => {
        this.cancelling.set(false);
        this.notify.error(extractError(err, 'Could not cancel.'));
      }
    });
  }
}
