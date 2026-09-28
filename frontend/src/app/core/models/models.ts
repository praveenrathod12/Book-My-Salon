export type UserRole = 'CUSTOMER' | 'SALON_OWNER';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface AuthUser {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface BusinessHour {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  isClosed: boolean;
  openTime?: string | null;  // "HH:mm"
  closeTime?: string | null; // "HH:mm"
}

export interface Salon {
  id: number;
  ownerId: number;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phoneNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating: number;
  isActive: boolean;
  startingPrice?: number | null;
  serviceCount: number;
  activeBarberCount: number;
  businessHours: BusinessHour[];
}

export interface SalonUpsert {
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phoneNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Service {
  id: number;
  salonId: number;
  name: string;
  description?: string | null;
  price: number;
  durationInMinutes: number;
  isActive: boolean;
}

export interface ServiceUpsert {
  name: string;
  description?: string | null;
  price: number;
  durationInMinutes: number;
  salonId?: number;
}

export interface BarberSchedule {
  dayOfWeek: number;
  isOff: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface BarberLeave {
  id: number;
  leaveDate: string; // yyyy-MM-dd
  reason?: string | null;
}

export interface Barber {
  id: number;
  salonId: number;
  name: string;
  phoneNumber?: string | null;
  experienceYears: number;
  isActive: boolean;
  offToday: boolean;
  serviceIds: number[];
  serviceNames: string[];
  schedules: BarberSchedule[];
  leaves: BarberLeave[];
}

export interface BarberUpsert {
  name: string;
  phoneNumber?: string | null;
  experienceYears: number;
  serviceIds: number[];
}

export interface Slot {
  time: string;     // "HH:mm"
  endTime: string;  // "HH:mm"
  available: boolean;
  availableBarbers: number;
}

export interface DayAvailability {
  date: string;    // yyyy-MM-dd
  dayName: string;
  isClosed: boolean;
  slots: Slot[];
}

export interface AvailabilityResponse {
  salonId: number;
  serviceId: number;
  durationInMinutes: number;
  days: DayAvailability[];
}

export interface Appointment {
  id: number;
  customerId: number;
  customerName: string;
  salonId: number;
  salonName: string;
  barberId: number;
  barberName: string;
  serviceId: number;
  serviceName: string;
  appointmentDate: string; // yyyy-MM-dd
  startTime: string;       // "HH:mm"
  endTime: string;         // "HH:mm"
  status: AppointmentStatus;
  amount: number;
  cancellationReason?: string | null;
  createdAt: string;
}

export interface CreateAppointmentRequest {
  salonId: number;
  serviceId: number;
  barberId?: number | null;
  appointmentDate: string;
  startTime: string;
}

export interface RescheduleRequest {
  appointmentDate: string;
  startTime: string;
  barberId?: number | null;
}

export interface OwnerDashboard {
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  activeBarbers: number;
  totalServices: number;
  totalAppointments: number;
}
