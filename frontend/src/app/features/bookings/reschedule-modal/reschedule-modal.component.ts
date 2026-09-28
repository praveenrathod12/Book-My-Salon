import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { Appointment, DayAvailability, Slot } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';
import { extractError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-reschedule-modal',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, PrettyTimePipe],
  templateUrl: './reschedule-modal.component.html'
})
export class RescheduleModalComponent implements OnInit {
  @Input({ required: true }) appointment!: Appointment;
  @Output() closed = new EventEmitter<void>();
  @Output() rescheduled = new EventEmitter<void>();

  private data = inject(DataService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly days = signal<DayAvailability[]>([]);
  readonly selectedDayIndex = signal(0);
  readonly selectedSlot = signal<Slot | null>(null);
  readonly saving = signal(false);

  get selectedDay(): DayAvailability | null {
    return this.days()[this.selectedDayIndex()] ?? null;
  }

  ngOnInit() {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 6);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    this.data
      .getAvailability(this.appointment.salonId, this.appointment.serviceId, iso(start), iso(end))
      .subscribe({
        next: (res) => {
          this.days.set(res.days);
          const idx = res.days.findIndex((d) => !d.isClosed && d.slots.some((s) => s.available));
          this.selectedDayIndex.set(idx >= 0 ? idx : 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(extractError(err, 'Could not load availability.'));
          this.loading.set(false);
        }
      });
  }

  selectDay(i: number) {
    this.selectedDayIndex.set(i);
    this.selectedSlot.set(null);
  }
  selectSlot(slot: Slot) {
    if (slot.available) this.selectedSlot.set(slot);
  }

  save() {
    const day = this.selectedDay;
    const slot = this.selectedSlot();
    if (!day || !slot) return;
    this.saving.set(true);
    this.data
      .rescheduleAppointment(this.appointment.id, { appointmentDate: day.date, startTime: slot.time })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.rescheduled.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.notify.error(extractError(err, 'Could not reschedule.'));
        }
      });
  }

  dayShort(name: string): string {
    return name.slice(0, 3);
  }
  dayDate(iso: string): string {
    return new Date(iso + 'T00:00:00').getDate().toString();
  }
}
