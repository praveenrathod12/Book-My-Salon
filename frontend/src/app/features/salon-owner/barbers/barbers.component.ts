import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { Barber, Salon, Service } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { extractError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-owner-barbers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent, EmptyStateComponent],
  templateUrl: './barbers.component.html',
  styleUrl: './barbers.component.css'
})
export class BarbersComponent {
  private fb = inject(FormBuilder);
  private data = inject(DataService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly hasSalon = signal(true);
  readonly salon = signal<Salon | null>(null);
  readonly barbers = signal<Barber[]>([]);
  readonly services = signal<Service[]>([]);

  readonly modalOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    phoneNumber: [''],
    experienceYears: [1, [Validators.required, Validators.min(0)]],
    serviceIds: [[] as number[]]
  });

  constructor() {
    this.data.getMySalon().subscribe((salon) => {
      if (!salon) {
        this.hasSalon.set(false);
        this.loading.set(false);
        return;
      }
      this.salon.set(salon);
      this.load();
    });
  }

  load() {
    const salon = this.salon();
    if (!salon) return;
    this.loading.set(true);
    forkJoin({
      barbers: this.data.getBarbers(salon.id, true),
      services: this.data.getServices(salon.id, true)
    }).subscribe((res) => {
      this.barbers.set(res.barbers);
      this.services.set(res.services.filter((s) => s.isActive));
      this.loading.set(false);
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ name: '', phoneNumber: '', experienceYears: 1, serviceIds: [] });
    this.modalOpen.set(true);
  }

  openEdit(b: Barber) {
    this.editingId.set(b.id);
    this.form.reset({
      name: b.name,
      phoneNumber: b.phoneNumber ?? '',
      experienceYears: b.experienceYears,
      serviceIds: [...b.serviceIds]
    });
    this.modalOpen.set(true);
  }

  toggleService(id: number, checked: boolean) {
    const current = this.form.controls.serviceIds.value;
    this.form.controls.serviceIds.setValue(
      checked ? [...current, id] : current.filter((x) => x !== id)
    );
  }
  isChecked(id: number): boolean {
    return this.form.controls.serviceIds.value.includes(id);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const salon = this.salon();
    if (!salon) return;
    this.saving.set(true);
    const payload = this.form.getRawValue();
    const id = this.editingId();
    const request$ = id
      ? this.data.updateBarber(id, payload)
      : this.data.createBarber(salon.id, payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.notify.success(id ? 'Barber updated.' : 'Barber added.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(extractError(err, 'Could not save barber.'));
      }
    });
  }

  toggleStatus(b: Barber) {
    this.data.setBarberStatus(b.id, !b.isActive).subscribe({
      next: () => {
        this.notify.success(b.isActive ? 'Barber deactivated.' : 'Barber activated.');
        this.load();
      },
      error: (err) => this.notify.error(extractError(err, 'Could not update status.'))
    });
  }
}
