import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { DayAvailability, Salon, Service, Slot } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';
import { extractError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, InrPipe, PrettyTimePipe],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css'
})
export class BookingComponent {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notify = inject(NotificationService);

  readonly salonId = Number(this.route.snapshot.paramMap.get('salonId'));

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly salon = signal<Salon | null>(null);
  readonly services = signal<Service[]>([]);

  readonly selectedServiceId = signal<number | null>(null);
  readonly selectedService = computed(
    () => this.services().find((s) => s.id === this.selectedServiceId()) ?? null
  );

  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal('');
  readonly days = signal<DayAvailability[]>([]);
  readonly selectedDayIndex = signal(0);
  readonly selectedSlot = signal<Slot | null>(null);
  readonly booking = signal(false);

  readonly selectedDay = computed(() => this.days()[this.selectedDayIndex()] ?? null);

  constructor() {
    forkJoin({
      salon: this.data.getSalon(this.salonId).pipe(catchError(() => of(null))),
      services: this.data.getServices(this.salonId).pipe(catchError(() => of([] as Service[])))
    }).subscribe((res) => {
      this.loading.set(false);
      if (!res.salon) {
        this.loadError.set('This salon could not be found.');
        return;
      }
      this.salon.set(res.salon);
      this.services.set(res.services);

      const preselect = Number(this.route.snapshot.queryParamMap.get('serviceId'));
      if (preselect && res.services.some((s) => s.id === preselect)) {
        this.selectService(preselect);
      }
    });
  }

  selectService(id: number) {
    this.selectedServiceId.set(id);
    this.selectedSlot.set(null);
    this.selectedDayIndex.set(0);
    this.loadAvailability();
  }

  private loadAvailability() {
    const serviceId = this.selectedServiceId();
    if (!serviceId) return;
    this.availabilityLoading.set(true);
    this.availabilityError.set('');
    this.days.set([]);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 6);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    this.data.getAvailability(this.salonId, serviceId, iso(start), iso(end)).subscribe({
      next: (res) => {
        this.availabilityLoading.set(false);
        this.days.set(res.days);
        // Default to the first day that has any available slot.
        const idx = res.days.findIndex((d) => !d.isClosed && d.slots.some((s) => s.available));
        this.selectedDayIndex.set(idx >= 0 ? idx : 0);
      },
      error: (err) => {
        this.availabilityLoading.set(false);
        this.availabilityError.set(extractError(err, 'Could not load availability.'));
      }
    });
  }

  selectDay(i: number) {
    this.selectedDayIndex.set(i);
    this.selectedSlot.set(null);
  }

  selectSlot(slot: Slot) {
    if (!slot.available) return;
    this.selectedSlot.set(slot);
  }

  confirm() {
    const service = this.selectedService();
    const day = this.selectedDay();
    const slot = this.selectedSlot();
    if (!service || !day || !slot) return;

    this.booking.set(true);
    this.data
      .createAppointment({
        salonId: this.salonId,
        serviceId: service.id,
        appointmentDate: day.date,
        startTime: slot.time
      })
      .subscribe({
        next: (appt) => {
          this.booking.set(false);
          this.notify.success('Appointment booked!');
          this.router.navigate(['/booking-confirmation', appt.id]);
        },
        error: (err) => {
          this.booking.set(false);
          const msg = extractError(err, 'Booking failed.');
          this.notify.error(msg);
          // If the slot was taken, refresh availability so the user sees the change.
          if (String(msg).toLowerCase().includes('no longer available') || String(msg).toLowerCase().includes('slot')) {
            this.selectedSlot.set(null);
            this.loadAvailability();
          }
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
