import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/data/data-service';
import { NotificationService } from '../../../core/services/notification.service';
import { Salon } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { extractError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-salon-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent],
  templateUrl: './salon-profile.component.html'
})
export class SalonProfileComponent {
  private fb = inject(FormBuilder);
  private data = inject(DataService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly salon = signal<Salon | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    address: [''],
    city: [''],
    state: [''],
    postalCode: [''],
    phoneNumber: ['']
  });

  constructor() {
    this.data.getMySalon().subscribe((salon) => {
      if (salon) {
        this.salon.set(salon);
        this.form.patchValue({
          name: salon.name,
          description: salon.description ?? '',
          address: salon.address ?? '',
          city: salon.city ?? '',
          state: salon.state ?? '',
          postalCode: salon.postalCode ?? '',
          phoneNumber: salon.phoneNumber ?? ''
        });
      }
      this.loading.set(false);
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const payload = this.form.getRawValue();
    const existing = this.salon();

    const request$ = existing
      ? this.data.updateSalon(existing.id, payload)
      : this.data.createSalon(payload);

    request$.subscribe({
      next: (salon) => {
        this.saving.set(false);
        this.salon.set(salon);
        this.notify.success(existing ? 'Salon updated.' : 'Salon created.');
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(extractError(err, 'Could not save salon.'));
      }
    });
  }
}
