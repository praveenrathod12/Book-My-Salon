import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { DataService } from '../../../core/data/data-service';
import { AuthService } from '../../../core/services/auth.service';
import { Barber, Salon, Service } from '../../../core/models/models';
import { SpinnerComponent } from '../../../shared/components/spinner.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { PrettyTimePipe } from '../../../shared/pipes/pretty-time.pipe';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-salon-details',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, InrPipe, PrettyTimePipe],
  templateUrl: './salon-details.component.html',
  styleUrl: './salon-details.component.css'
})
export class SalonDetailsComponent {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly salon = signal<Salon | null>(null);
  readonly services = signal<Service[]>([]);
  readonly barbers = signal<Barber[]>([]);

  readonly isCustomer = this.auth.isCustomer;
  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly orderedHours = computed(() => {
    const s = this.salon();
    if (!s) return [];
    // Display Monday-first.
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((d) => {
      const h = s.businessHours.find((x) => x.dayOfWeek === d);
      return {
        name: DAY_NAMES[d],
        isClosed: !h || h.isClosed,
        open: h?.openTime,
        close: h?.closeTime
      };
    });
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      salon: this.data.getSalon(id).pipe(catchError(() => of(null))),
      services: this.data.getServices(id).pipe(catchError(() => of([] as Service[]))),
      barbers: this.data.getBarbers(id).pipe(catchError(() => of([] as Barber[])))
    }).subscribe((res) => {
      this.loading.set(false);
      if (!res.salon) {
        this.error.set('This salon could not be found.');
        return;
      }
      this.salon.set(res.salon);
      this.services.set(res.services);
      this.barbers.set(res.barbers);
    });
  }

  book(serviceId?: number) {
    const s = this.salon();
    if (!s) return;
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/book/${s.id}` } });
      return;
    }
    this.router.navigate(['/book', s.id], {
      queryParams: serviceId ? { serviceId } : {}
    });
  }
}
