import { Observable } from 'rxjs';
import {
  Appointment,
  AuthResponse,
  AuthUser,
  AvailabilityResponse,
  Barber,
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

/**
 * Contract for all data access. The UI depends only on this abstract class;
 * it is provided by either ApiDataService (full-stack) or DemoDataService
 * (local mock data) based on environment.dataMode.
 */
export abstract class DataService {
  // ----- Auth -----
  abstract login(request: LoginRequest): Observable<AuthResponse>;
  abstract register(request: RegisterRequest): Observable<AuthResponse>;
  abstract getProfile(): Observable<AuthUser>;

  // ----- Salons -----
  abstract getSalons(search?: string, city?: string): Observable<Salon[]>;
  abstract getSalon(id: number): Observable<Salon>;
  abstract getMySalon(): Observable<Salon | null>;
  abstract createSalon(request: SalonUpsert): Observable<Salon>;
  abstract updateSalon(id: number, request: SalonUpsert): Observable<Salon>;
  abstract getBusinessHours(salonId: number): Observable<BusinessHour[]>;
  abstract updateBusinessHours(salonId: number, hours: BusinessHour[]): Observable<BusinessHour[]>;

  // ----- Services -----
  abstract getServices(salonId: number, includeInactive?: boolean): Observable<Service[]>;
  abstract createService(request: ServiceUpsert): Observable<Service>;
  abstract updateService(id: number, request: ServiceUpsert): Observable<Service>;
  abstract setServiceStatus(id: number, isActive: boolean): Observable<Service>;
  abstract deleteService(id: number): Observable<void>;

  // ----- Barbers -----
  abstract getBarbers(salonId: number, includeInactive?: boolean): Observable<Barber[]>;
  abstract getBarber(id: number): Observable<Barber>;
  abstract createBarber(salonId: number, request: BarberUpsert): Observable<Barber>;
  abstract updateBarber(id: number, request: BarberUpsert): Observable<Barber>;
  abstract setBarberStatus(id: number, isActive: boolean): Observable<Barber>;
  abstract updateBarberSchedule(id: number, schedules: Barber['schedules']): Observable<Barber>;
  abstract addBarberLeave(id: number, leaveDate: string, reason?: string): Observable<Barber['leaves'][number]>;
  abstract removeBarberLeave(id: number, leaveId: number): Observable<void>;

  // ----- Availability -----
  abstract getAvailability(
    salonId: number,
    serviceId: number,
    startDate: string,
    endDate: string
  ): Observable<AvailabilityResponse>;

  // ----- Appointments -----
  abstract getAppointments(status?: string, date?: string): Observable<Appointment[]>;
  abstract getAppointment(id: number): Observable<Appointment>;
  abstract createAppointment(request: CreateAppointmentRequest): Observable<Appointment>;
  abstract rescheduleAppointment(id: number, request: RescheduleRequest): Observable<Appointment>;
  abstract cancelAppointment(id: number, reason?: string): Observable<Appointment>;
  abstract updateAppointmentStatus(id: number, status: string): Observable<Appointment>;

  // ----- Owner -----
  abstract getOwnerDashboard(): Observable<OwnerDashboard>;
}
