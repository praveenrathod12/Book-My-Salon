import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private auth = inject(AuthService);
  readonly isOwner = this.auth.isOwner;
  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly features = [
    { icon: '🔍', title: 'Discover salons', text: 'Browse salons near you by name or city with ratings and pricing.' },
    { icon: '📅', title: 'Live availability', text: 'See real available slots for the whole week, not fake fixed times.' },
    { icon: '⚡', title: 'Instant booking', text: 'Pick a service, choose a slot and confirm — no waiting in line.' },
    { icon: '🔁', title: 'Reschedule freely', text: 'Change your mind? Reschedule or cancel eligible bookings anytime.' }
  ];
}
