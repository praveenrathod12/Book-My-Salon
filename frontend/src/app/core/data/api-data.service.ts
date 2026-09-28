import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Appointment,
  AuthResponse,
  AuthUser,
  AvailabilityResponse,
  Barber,
  BarberLeave,
  BarberSchedule,
  BarberUpsert,
  BusinessHour,
  CreateAppointmentRequest,
  LoginRequest,
  OwnerDashboard,
  RegisterRequest,
  RescheduleRequest,
  Salon,
  SalonUpsert,
  Service,
  ServiceUpsert
} from '../models/models';
import { DataService } from './data-service';

@Injectable()
export class ApiDataService extends DataService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ----- Auth -----
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, request);
  }
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/register`, request);
  }
  getProfile(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.base}/auth/profile`);
  }

  // ----- Salons -----
  getSalons(search?: string, city?: string): Observable<Salon[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (city) params = params.set('city', city);
    return this.http.get<Salon[]>(`${this.base}/salons`, { params });
  }
  getSalon(id: number): Observable<Salon> {
    return this.http.get<Salon>(`${this.base}/salons/${id}`);
  }
  getMySalon(): Observable<Salon | null> {
    return this.http
      .get<Salon | null>(`${this.base}/salons/mine`)
      .pipe(catchError(() => of(null)));
  }
  createSalon(request: SalonUpsert): Observable<Salon> {
    return this.http.post<Salon>(`${this.base}/salons`, request);
  }
  updateSalon(id: number, request: SalonUpsert): Observable<Salon> {
    return this.http.put<Salon>(`${this.base}/salons/${id}`, request);
  }
  getBusinessHours(salonId: number): Observable<BusinessHour[]> {
    return this.http.get<BusinessHour[]>(`${this.base}/salons/${salonId}/business-hours`);
  }
  updateBusinessHours(salonId: number, hours: BusinessHour[]): Observable<BusinessHour[]> {
    return this.http.put<BusinessHour[]>(`${this.base}/salons/${salonId}/business-hours`, { hours });
  }

  // ----- Services -----
  getServices(salonId: number, includeInactive = false): Observable<Service[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<Service[]>(`${this.base}/salons/${salonId}/services`, { params });
  }
  createService(request: ServiceUpsert): Observable<Service> {
    return this.http.post<Service>(`${this.base}/services`, request);
  }
  updateService(id: number, request: ServiceUpsert): Observable<Service> {
    return this.http.put<Service>(`${this.base}/services/${id}`, request);
  }
  setServiceStatus(id: number, isActive: boolean): Observable<Service> {
    return this.http.patch<Service>(`${this.base}/services/${id}/status`, { isActive });
  }
  deleteService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/services/${id}`);
  }

  // ----- Barbers -----
  getBarbers(salonId: number, includeInactive = false): Observable<Barber[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<Barber[]>(`${this.base}/salons/${salonId}/barbers`, { params });
  }
  getBarber(id: number): Observable<Barber> {
    return this.http.get<Barber>(`${this.base}/barbers/${id}`);
  }
  createBarber(salonId: number, request: BarberUpsert): Observable<Barber> {
    return this.http.post<Barber>(`${this.base}/salons/${salonId}/barbers`, request);
  }
  updateBarber(id: number, request: BarberUpsert): Observable<Barber> {
    return this.http.put<Barber>(`${this.base}/barbers/${id}`, request);
  }
  setBarberStatus(id: number, isActive: boolean): Observable<Barber> {
    return this.http.patch<Barber>(`${this.base}/barbers/${id}/status`, { isActive });
  }
  updateBarberSchedule(id: number, schedules: BarberSchedule[]): Observable<Barber> {
    return this.http.put<Barber>(`${this.base}/barbers/${id}/schedule`, { schedules });
  }
  addBarberLeave(id: number, leaveDate: string, reason?: string): Observable<BarberLeave> {
    return this.http.post<BarberLeave>(`${this.base}/barbers/${id}/leaves`, { leaveDate, reason });
  }
  removeBarberLeave(id: number, leaveId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/barbers/${id}/leaves/${leaveId}`);
  }

  // ----- Availability -----
  getAvailability(salonId: number, serviceId: number, startDate: string, endDate: string): Observable<AvailabilityResponse> {
    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<AvailabilityResponse>(`${this.base}/salons/${salonId}/availability`, { params });
  }

  // ----- Appointments -----
  getAppointments(status?: string, date?: string): Observable<Appointment[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (date) params = params.set('date', date);
    return this.http.get<Appointment[]>(`${this.base}/appointments`, { params });
  }
  getAppointment(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.base}/appointments/${id}`);
  }
  createAppointment(request: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.base}/appointments`, request);
  }
  rescheduleAppointment(id: number, request: RescheduleRequest): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.base}/appointments/${id}/reschedule`, request);
  }
  cancelAppointment(id: number, reason?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.base}/appointments/${id}/cancel`, { reason });
  }
  updateAppointmentStatus(id: number, status: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.base}/appointments/${id}/status`, { status });
  }

  // ----- Owner -----
  getOwnerDashboard(): Observable<OwnerDashboard> {
    return this.http.get<OwnerDashboard>(`${this.base}/owner/dashboard`);
  }
}
