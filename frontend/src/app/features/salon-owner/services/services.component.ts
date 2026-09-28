import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { Salon, Service } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { extractError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-owner-services',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent, EmptyStateComponent, InrPipe],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent {
  private fb = inject(FormBuilder);
  private data = inject(DataService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly hasSalon = signal(true);
  readonly salon = signal<Salon | null>(null);
  readonly services = signal<Service[]>([]);

  readonly modalOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    price: [250, [Validators.required, Validators.min(0)]],
    durationInMinutes: [30, [Validators.required, Validators.min(5)]]
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
    this.data.getServices(salon.id, true).subscribe((list) => {
      this.services.set(list);
      this.loading.set(false);
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', price: 250, durationInMinutes: 30 });
    this.modalOpen.set(true);
  }

  openEdit(svc: Service) {
    this.editingId.set(svc.id);
    this.form.reset({
      name: svc.name,
      description: svc.description ?? '',
      price: svc.price,
      durationInMinutes: svc.durationInMinutes
    });
    this.modalOpen.set(true);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const salon = this.salon();
    if (!salon) return;
    this.saving.set(true);
    const payload = { ...this.form.getRawValue(), salonId: salon.id };
    const id = this.editingId();
    const request$ = id ? this.data.updateService(id, payload) : this.data.createService(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.notify.success(id ? 'Service updated.' : 'Service added.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(extractError(err, 'Could not save service.'));
      }
    });
  }

  toggleStatus(svc: Service) {
    this.data.setServiceStatus(svc.id, !svc.isActive).subscribe({
      next: () => {
        this.notify.success(svc.isActive ? 'Service deactivated.' : 'Service activated.');
        this.load();
      },
      error: (err) => this.notify.error(extractError(err, 'Could not update status.'))
    });
  }

  remove(svc: Service) {
    if (!confirm(`Delete "${svc.name}"? If it has bookings it will be deactivated instead.`)) return;
    this.data.deleteService(svc.id).subscribe({
      next: () => {
        this.notify.success('Service removed.');
        this.load();
      },
      error: (err) => this.notify.error(extractError(err, 'Could not delete service.'))
    });
  }
}
