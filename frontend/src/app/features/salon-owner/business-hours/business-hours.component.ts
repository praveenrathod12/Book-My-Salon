import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { BusinessHour, Salon } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { extractError } from '../../../core/utils/error.util';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-business-hours',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent, EmptyStateComponent],
  templateUrl: './business-hours.component.html',
  styleUrl: './business-hours.component.css'
})
export class BusinessHoursComponent {
  private data = inject(DataService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly hasSalon = signal(true);
  readonly salon = signal<Salon | null>(null);
  readonly hours = signal<BusinessHour[]>([]);

  constructor() {
    this.data.getMySalon().subscribe((salon) => {
      if (!salon) {
        this.hasSalon.set(false);
        this.loading.set(false);
        return;
      }
      this.salon.set(salon);
      this.data.getBusinessHours(salon.id).subscribe((hours) => {
        // Ensure Monday-first display order.
        const order = [1, 2, 3, 4, 5, 6, 0];
        const sorted = order.map(
          (d) =>
            hours.find((h) => h.dayOfWeek === d) ?? {
              dayOfWeek: d,
              isClosed: false,
              openTime: '09:00',
              closeTime: '21:00'
            }
        );
        this.hours.set(sorted);
        this.loading.set(false);
      });
    });
  }

  dayName(d: number): string {
    return DAY_NAMES[d];
  }

  save() {
    const salon = this.salon();
    if (!salon) return;
    this.saving.set(true);
    this.data.updateBusinessHours(salon.id, this.hours()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Business hours updated.');
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(extractError(err, 'Could not update hours.'));
      }
    });
  }
}
