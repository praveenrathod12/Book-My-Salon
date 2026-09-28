import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { DataService } from '../../../core/data/data-service';
import { AuthService } from '../../../core/services/auth.service';
import { Appointment, OwnerDashboard, Salon } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    InrPipe,
    PrettyTimePipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private data = inject(DataService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly hasSalon = signal(true);
  readonly salon = signal<Salon | null>(null);
  readonly stats = signal<OwnerDashboard | null>(null);
  readonly todayAppointments = signal<Appointment[]>([]);
  readonly userName = this.auth.user()?.name ?? '';

  readonly today = new Date().toISOString().slice(0, 10);

  constructor() {
    this.data.getMySalon().subscribe((salon) => {
      if (!salon) {
        this.hasSalon.set(false);
        this.loading.set(false);
        return;
      }
      this.salon.set(salon);
      forkJoin({
        stats: this.data.getOwnerDashboard().pipe(catchError(() => of(null))),
        today: this.data.getAppointments(undefined, this.today).pipe(catchError(() => of([] as Appointment[])))
      }).subscribe((res) => {
        this.stats.set(res.stats);
        this.todayAppointments.set(res.today);
        this.loading.set(false);
      });
    });
  }
}
