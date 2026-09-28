import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly user = this.auth.user;

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
