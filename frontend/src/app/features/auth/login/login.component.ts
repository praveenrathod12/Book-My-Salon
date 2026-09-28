import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IS_DEMO_MODE } from '../../../core/data/data.providers';
import { DEMO_ACCOUNTS } from '../../../core/data/demo-data';
import { extractError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: '../auth.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);

  readonly isDemo = IS_DEMO_MODE;
  readonly demo = DEMO_ACCOUNTS;
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  fillDemo(kind: 'customer' | 'owner') {
    const acc = this.demo[kind];
    this.form.patchValue({ email: acc.email, password: acc.password });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.notify.success(`Welcome back, ${res.user.name}!`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const fallback = res.user.role === 'SALON_OWNER' ? '/owner/dashboard' : '/salons';
        this.router.navigateByUrl(returnUrl || fallback);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(extractError(err, 'Login failed. Please check your credentials.'));
      }
    });
  }
}
