import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/salons/salon-list/salon-list.component').then((m) => m.SalonListComponent)
  },
  {
    path: 'salons',
    loadComponent: () =>
      import('./features/salons/salon-list/salon-list.component').then((m) => m.SalonListComponent)
  },
  {
    path: 'salons/:id',
    loadComponent: () =>
      import('./features/salons/salon-details/salon-details.component').then(
        (m) => m.SalonDetailsComponent
      )
  },
  {
    path: 'book/:salonId',
    canActivate: [roleGuard],
    data: { role: 'CUSTOMER' },
    loadComponent: () =>
      import('./features/bookings/booking/booking.component').then((m) => m.BookingComponent)
  },
  {
    path: 'booking-confirmation/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/booking-confirmation/booking-confirmation.component').then(
        (m) => m.BookingConfirmationComponent
      )
  },
  {
    path: 'customer/bookings',
    canActivate: [roleGuard],
    data: { role: 'CUSTOMER' },
    loadComponent: () =>
      import('./features/bookings/my-bookings/my-bookings.component').then(
        (m) => m.MyBookingsComponent
      )
  },
  {
    path: 'customer/bookings/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/booking-details/booking-details.component').then(
        (m) => m.BookingDetailsComponent
      )
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent)
  },
  // ----- Owner area -----
  {
    path: 'owner',
    canActivate: [roleGuard],
    data: { role: 'SALON_OWNER' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/salon-owner/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          )
      },
      {
        path: 'salon',
        loadComponent: () =>
          import('./features/salon-owner/salon-profile/salon-profile.component').then(
            (m) => m.SalonProfileComponent
          )
      },
      {
        path: 'business-hours',
        loadComponent: () =>
          import('./features/salon-owner/business-hours/business-hours.component').then(
            (m) => m.BusinessHoursComponent
          )
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./features/salon-owner/services/services.component').then(
            (m) => m.ServicesComponent
          )
      },
      {
        path: 'barbers',
        loadComponent: () =>
          import('./features/salon-owner/barbers/barbers.component').then((m) => m.BarbersComponent)
      },
      {
        path: 'barbers/:id',
        loadComponent: () =>
          import('./features/salon-owner/barber-manage/barber-manage.component').then(
            (m) => m.BarberManageComponent
          )
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/salon-owner/appointments/appointments.component').then(
            (m) => m.OwnerAppointmentsComponent
          )
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
