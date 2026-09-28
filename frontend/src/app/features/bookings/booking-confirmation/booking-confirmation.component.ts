import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from '../../../core/data/data-service';
import { Appointment } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';
import { PrettyDatePipe } from '../../../shared/pipes/pretty-date.pipe';

@Component({
  selector: 'app-booking-confirmation',
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
  templateUrl: './booking-confirmation.component.html',
  styleUrl: './booking-confirmation.component.css'
})
export class BookingConfirmationComponent {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly appt = signal<Appointment | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.data.getAppointment(id).subscribe({
      next: (a) => {
        this.appt.set(a);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your booking.');
        this.loading.set(false);
      }
    });
  }
}
