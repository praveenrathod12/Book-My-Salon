import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
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
  DayAvailability,
  LoginRequest,
  OwnerDashboard,
  RegisterRequest,
  RescheduleRequest,
  Salon,
  SalonUpsert,
  Service,
  ServiceUpsert,
  Slot
} from '../models/models';
import { DataService } from './data-service';
import { buildDemoDatabase, DemoDatabase } from './demo-data';

const STORAGE_KEY = 'salon_demo_db';
const SESSION_KEY = 'salon_demo_user_id';
const SLOT_STEP = 30;
const LATENCY = 250; // simulate network for realistic loading states

// Client-side mirror of the backend logic so the Vercel demo is fully interactive
// without any backend. Data persists to localStorage for the browser session.
@Injectable()
export class DemoDataService extends DataService {
  private db: DemoDatabase;

  constructor() {
    super();
    this.db = this.load();
  }

  // ----- persistence -----
  private load(): DemoDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    const fresh = buildDemoDatabase();
    this.persist(fresh);
    return fresh;
  }
  private persist(db = this.db): void {
    this.db = db;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* ignore quota errors */
    }
  }
  private ok<T>(value: T): Observable<T> {
    return of(structuredClone(value)).pipe(delay(LATENCY));
  }
  private fail<T>(message: string, statusCode = 400): Observable<T> {
    return throwError(() => ({ status: statusCode, error: { message, statusCode, success: false } })).pipe(delay(LATENCY)) as Observable<T>;
  }

  private currentUserId(): number | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? Number(raw) : null;
  }
  private currentUser(): (AuthUser & { password: string }) | null {
    const id = this.currentUserId();
    return id ? this.db.users.find((u) => u.id === id) ?? null : null;
  }

  // ----- Auth -----
  login(request: LoginRequest): Observable<AuthResponse> {
    const email = request.email.trim().toLowerCase();
    const user = this.db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== request.password) {
      return this.fail<AuthResponse>('Invalid email or password.', 401);
    }
    localStorage.setItem(SESSION_KEY, String(user.id));
    return this.ok(this.buildAuth(user));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    const email = request.email.trim().toLowerCase();
    if (this.db.users.some((u) => u.email.toLowerCase() === email)) {
      return this.fail<AuthResponse>('An account with this email already exists.', 409);
    }
    const id = Math.max(0, ...this.db.users.map((u) => u.id)) + 1;
    const user: AuthUser & { password: string } = {
      id,
      firstName: request.firstName,
      lastName: request.lastName,
      name: `${request.firstName} ${request.lastName}`.trim(),
      email,
      phoneNumber: request.phoneNumber ?? null,
      role: request.role,
      password: request.password
    };
    this.db.users.push(user);
    this.persist();
    localStorage.setItem(SESSION_KEY, String(user.id));
    return this.ok(this.buildAuth(user));
  }

  getProfile(): Observable<AuthUser> {
    const user = this.currentUser();
    if (!user) return this.fail<AuthUser>('Not authenticated.', 401);
    return this.ok(this.stripUser(user));
  }

  private buildAuth(user: AuthUser & { password: string }): AuthResponse {
    return {
      accessToken: 'demo-token.' + btoa(String(user.id)) + '.' + user.role,
      refreshToken: 'demo-refresh.' + btoa(String(user.id)),
      user: this.stripUser(user)
    };
  }
  private stripUser(user: AuthUser & { password: string }): AuthUser {
    const { password, ...rest } = user;
    return rest;
  }

  // ----- Salons -----
  getSalons(search?: string, city?: string): Observable<Salon[]> {
    let list = this.db.salons.filter((s) => s.isActive);
    if (search) {
      const t = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(t) ||
          (s.city ?? '').toLowerCase().includes(t) ||
          (s.address ?? '').toLowerCase().includes(t)
      );
    }
    if (city) {
      const c = city.trim().toLowerCase();
      list = list.filter((s) => (s.city ?? '').toLowerCase().includes(c));
    }
    return this.ok(list.map((s) => this.enrichSalon(s)));
  }

  getSalon(id: number): Observable<Salon> {
    const s = this.db.salons.find((x) => x.id === id);
    if (!s) return this.fail<Salon>('Salon not found.', 404);
    return this.ok(this.enrichSalon(s));
  }

  getMySalon(): Observable<Salon | null> {
    const user = this.currentUser();
    if (!user) return this.ok<Salon | null>(null);
    const s = this.db.salons.find((x) => x.ownerId === user.id) ?? null;
    return this.ok<Salon | null>(s ? this.enrichSalon(s) : null);
  }

  createSalon(request: SalonUpsert): Observable<Salon> {
    const user = this.currentUser();
    if (!user) return this.fail<Salon>('Not authenticated.', 401);
    const id = Math.max(0, ...this.db.salons.map((s) => s.id)) + 1;
    const salon: Salon = {
      id,
      ownerId: user.id,
      name: request.name,
      description: request.description ?? null,
      address: request.address ?? null,
      city: request.city ?? null,
      state: request.state ?? null,
      postalCode: request.postalCode ?? null,
      phoneNumber: request.phoneNumber ?? null,
      latitude: request.latitude ?? null,
      longitude: request.longitude ?? null,
      rating: 0,
      isActive: true,
      startingPrice: null,
      serviceCount: 0,
      activeBarberCount: 0,
      businessHours: Array.from({ length: 7 }, (_, day) => ({
        dayOfWeek: day,
        isClosed: false,
        openTime: day === 0 ? '10:00' : '09:00',
        closeTime: day === 6 ? '22:00' : day === 0 ? '18:00' : '21:00'
      }))
    };
    this.db.salons.push(salon);
    this.persist();
    return this.ok(this.enrichSalon(salon));
  }

  updateSalon(id: number, request: SalonUpsert): Observable<Salon> {
    const salon = this.ownedSalon(id);
    if (!salon) return this.fail<Salon>('You can only manage your own salon.', 403);
    Object.assign(salon, {
      name: request.name,
      description: request.description ?? null,
      address: request.address ?? null,
      city: request.city ?? null,
      state: request.state ?? null,
      postalCode: request.postalCode ?? null,
      phoneNumber: request.phoneNumber ?? null,
      latitude: request.latitude ?? null,
      longitude: request.longitude ?? null
    });
    this.persist();
    return this.ok(this.enrichSalon(salon));
  }

  getBusinessHours(salonId: number): Observable<BusinessHour[]> {
    const salon = this.db.salons.find((s) => s.id === salonId);
    if (!salon) return this.fail<BusinessHour[]>('Salon not found.', 404);
    return this.ok(salon.businessHours);
  }

  updateBusinessHours(salonId: number, hours: BusinessHour[]): Observable<BusinessHour[]> {
    const salon = this.ownedSalon(salonId);
    if (!salon) return this.fail<BusinessHour[]>('You can only manage your own salon.', 403);
    salon.businessHours = hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      isClosed: h.isClosed,
      openTime: h.isClosed ? null : h.openTime ?? null,
      closeTime: h.isClosed ? null : h.closeTime ?? null
    }));
    this.persist();
    return this.ok(salon.businessHours);
  }

  private ownedSalon(id: number): Salon | null {
    const user = this.currentUser();
    const salon = this.db.salons.find((s) => s.id === id);
    if (!salon || !user || salon.ownerId !== user.id) return null;
    return salon;
  }

  private enrichSalon(s: Salon): Salon {
    const active = this.db.services.filter((x) => x.salonId === s.id && x.isActive);
    return {
      ...s,
      startingPrice: active.length ? Math.min(...active.map((x) => x.price)) : null,
      serviceCount: active.length,
      activeBarberCount: this.db.barbers.filter((b) => b.salonId === s.id && b.isActive).length
    };
  }

  // ----- Services -----
  getServices(salonId: number, includeInactive = false): Observable<Service[]> {
    let list = this.db.services.filter((s) => s.salonId === salonId);
    if (!includeInactive) list = list.filter((s) => s.isActive);
    return this.ok(list.sort((a, b) => a.name.localeCompare(b.name)));
  }

  createService(request: ServiceUpsert): Observable<Service> {
    const salon = this.ownedSalon(request.salonId!);
    if (!salon) return this.fail<Service>('You can only manage your own services.', 403);
    const id = Math.max(0, ...this.db.services.map((s) => s.id)) + 1;
    const svc: Service = {
      id,
      salonId: salon.id,
      name: request.name,
      description: request.description ?? null,
      price: request.price,
      durationInMinutes: request.durationInMinutes,
      isActive: true
    };
    this.db.services.push(svc);
    this.persist();
    return this.ok(svc);
  }

  updateService(id: number, request: ServiceUpsert): Observable<Service> {
    const svc = this.ownedService(id);
    if (!svc) return this.fail<Service>('You can only manage your own services.', 403);
    Object.assign(svc, {
      name: request.name,
      description: request.description ?? null,
      price: request.price,
      durationInMinutes: request.durationInMinutes
    });
    this.persist();
    return this.ok(svc);
  }

  setServiceStatus(id: number, isActive: boolean): Observable<Service> {
    const svc = this.ownedService(id);
    if (!svc) return this.fail<Service>('You can only manage your own services.', 403);
    svc.isActive = isActive;
    this.persist();
    return this.ok(svc);
  }

  deleteService(id: number): Observable<void> {
    const svc = this.ownedService(id);
    if (!svc) return this.fail<void>('You can only manage your own services.', 403);
    const hasAppts = this.db.appointments.some((a) => a.serviceId === id);
    if (hasAppts) {
      svc.isActive = false;
    } else {
      this.db.services = this.db.services.filter((s) => s.id !== id);
      this.db.barbers.forEach((b) => (b.serviceIds = b.serviceIds.filter((sid) => sid !== id)));
    }
    this.persist();
    return this.ok<void>(undefined as void);
  }

  private ownedService(id: number): Service | null {
    const user = this.currentUser();
    const svc = this.db.services.find((s) => s.id === id);
    if (!svc || !user) return null;
    const salon = this.db.salons.find((s) => s.id === svc.salonId);
    if (!salon || salon.ownerId !== user.id) return null;
    return svc;
  }

  // ----- Barbers -----
  getBarbers(salonId: number, includeInactive = false): Observable<Barber[]> {
    let list = this.db.barbers.filter((b) => b.salonId === salonId);
    if (!includeInactive) list = list.filter((b) => b.isActive);
    return this.ok(list.map((b) => this.enrichBarber(b)).sort((a, b) => a.name.localeCompare(b.name)));
  }

  getBarber(id: number): Observable<Barber> {
    const b = this.db.barbers.find((x) => x.id === id);
    if (!b) return this.fail<Barber>('Barber not found.', 404);
    return this.ok(this.enrichBarber(b));
  }

  createBarber(salonId: number, request: BarberUpsert): Observable<Barber> {
    const salon = this.ownedSalon(salonId);
    if (!salon) return this.fail<Barber>('You can only manage your own barbers.', 403);
    const id = Math.max(0, ...this.db.barbers.map((b) => b.id)) + 1;
    const barber: Barber = {
      id,
      salonId,
      name: request.name,
      phoneNumber: request.phoneNumber ?? null,
      experienceYears: request.experienceYears,
      isActive: true,
      offToday: false,
      serviceIds: [...request.serviceIds],
      serviceNames: [],
      schedules: Array.from({ length: 7 }, (_, day) => ({
        dayOfWeek: day,
        isOff: day === 0,
        startTime: day === 0 ? null : '09:00',
        endTime: day === 0 ? null : '18:00'
      })),
      leaves: []
    };
    this.db.barbers.push(barber);
    this.persist();
    return this.ok(this.enrichBarber(barber));
  }

  updateBarber(id: number, request: BarberUpsert): Observable<Barber> {
    const barber = this.ownedBarber(id);
    if (!barber) return this.fail<Barber>('You can only manage your own barbers.', 403);
    Object.assign(barber, {
      name: request.name,
      phoneNumber: request.phoneNumber ?? null,
      experienceYears: request.experienceYears,
      serviceIds: [...request.serviceIds]
    });
    this.persist();
    return this.ok(this.enrichBarber(barber));
  }

  setBarberStatus(id: number, isActive: boolean): Observable<Barber> {
    const barber = this.ownedBarber(id);
    if (!barber) return this.fail<Barber>('You can only manage your own barbers.', 403);
    barber.isActive = isActive;
    this.persist();
    return this.ok(this.enrichBarber(barber));
  }

  updateBarberSchedule(id: number, schedules: BarberSchedule[]): Observable<Barber> {
    const barber = this.ownedBarber(id);
    if (!barber) return this.fail<Barber>('You can only manage your own barbers.', 403);
    barber.schedules = schedules.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      isOff: s.isOff,
      startTime: s.isOff ? null : s.startTime ?? null,
      endTime: s.isOff ? null : s.endTime ?? null
    }));
    this.persist();
    return this.ok(this.enrichBarber(barber));
  }

  addBarberLeave(id: number, leaveDate: string, reason?: string): Observable<BarberLeave> {
    const barber = this.ownedBarber(id);
    if (!barber) return this.fail<BarberLeave>('You can only manage your own barbers.', 403);
    if (barber.leaves.some((l) => l.leaveDate === leaveDate)) {
      return this.fail<BarberLeave>('This barber already has leave on that date.', 409);
    }
    const leaveId = Math.max(0, ...this.db.barbers.flatMap((b) => b.leaves.map((l) => l.id))) + 1;
    const leave: BarberLeave = { id: leaveId, leaveDate, reason: reason ?? null };
    barber.leaves.push(leave);
    this.persist();
    return this.ok(leave);
  }

  removeBarberLeave(id: number, leaveId: number): Observable<void> {
    const barber = this.ownedBarber(id);
    if (!barber) return this.fail<void>('You can only manage your own barbers.', 403);
    barber.leaves = barber.leaves.filter((l) => l.id !== leaveId);
    this.persist();
    return this.ok<void>(undefined as void);
  }

  private ownedBarber(id: number): Barber | null {
    const user = this.currentUser();
    const barber = this.db.barbers.find((b) => b.id === id);
    if (!barber || !user) return null;
    const salon = this.db.salons.find((s) => s.id === barber.salonId);
    if (!salon || salon.ownerId !== user.id) return null;
    return barber;
  }

  private enrichBarber(b: Barber): Barber {
    const today = this.todayIso();
    const dow = new Date().getDay();
    const sched = b.schedules.find((s) => s.dayOfWeek === dow);
    const onLeave = b.leaves.some((l) => l.leaveDate === today);
    return {
      ...b,
      offToday: onLeave || (sched?.isOff ?? false),
      serviceNames: b.serviceIds
        .map((id) => this.db.services.find((s) => s.id === id)?.name)
        .filter((n): n is string => !!n)
    };
  }

  // ----- Availability engine (mirrors backend) -----
  getAvailability(salonId: number, serviceId: number, startDate: string, endDate: string): Observable<AvailabilityResponse> {
    const salon = this.db.salons.find((s) => s.id === salonId && s.isActive);
    if (!salon) return this.fail<AvailabilityResponse>('Salon not found.', 404);
    const service = this.db.services.find((s) => s.id === serviceId && s.salonId === salonId);
    if (!service) return this.fail<AvailabilityResponse>('Service not found for this salon.', 404);
    if (!service.isActive) return this.fail<AvailabilityResponse>('This service is not currently available.', 400);

    const duration = service.durationInMinutes;
    const capable = this.db.barbers.filter(
      (b) => b.salonId === salonId && b.isActive && b.serviceIds.includes(serviceId)
    );

    const days: DayAvailability[] = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const now = new Date();
    const todayIso = this.todayIso();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateIso = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const bh = salon.businessHours.find((h) => h.dayOfWeek === dow);

      if (!bh || bh.isClosed || !bh.openTime || !bh.closeTime) {
        days.push({ date: dateIso, dayName, isClosed: true, slots: [] });
        continue;
      }

      const open = this.toMinutes(bh.openTime);
      const close = this.toMinutes(bh.closeTime);
      const slots: Slot[] = [];

      for (let start = open; start + duration <= close; start += SLOT_STEP) {
        const end = start + duration;
        if (dateIso === todayIso && start <= now.getHours() * 60 + now.getMinutes()) continue;

        let count = 0;
        for (const barber of capable) {
          if (this.isBarberFree(barber, dateIso, dow, start, end)) count++;
        }
        slots.push({
          time: this.toHHmm(start),
          endTime: this.toHHmm(end),
          available: count > 0,
          availableBarbers: count
        });
      }

      days.push({ date: dateIso, dayName, isClosed: false, slots });
    }

    return this.ok({ salonId, serviceId, durationInMinutes: duration, days });
  }

  private isBarberFree(barber: Barber, dateIso: string, dow: number, startMin: number, endMin: number): boolean {
    if (barber.leaves.some((l) => l.leaveDate === dateIso)) return false;
    const sched = barber.schedules.find((s) => s.dayOfWeek === dow);
    if (!sched || sched.isOff || !sched.startTime || !sched.endTime) return false;
    if (startMin < this.toMinutes(sched.startTime) || endMin > this.toMinutes(sched.endTime)) return false;

    const dayAppts = this.db.appointments.filter(
      (a) => a.barberId === barber.id && a.appointmentDate === dateIso && a.status !== 'CANCELLED'
    );
    for (const a of dayAppts) {
      const aStart = this.toMinutes(a.startTime);
      const aEnd = this.toMinutes(a.endTime);
      if (startMin < aEnd && aStart < endMin) return false;
    }
    return true;
  }

  // ----- Appointments -----
  getAppointments(status?: string, date?: string): Observable<Appointment[]> {
    const user = this.currentUser();
    if (!user) return this.fail<Appointment[]>('Not authenticated.', 401);

    let list: Appointment[];
    if (user.role === 'SALON_OWNER') {
      const salonIds = this.db.salons.filter((s) => s.ownerId === user.id).map((s) => s.id);
      list = this.db.appointments.filter((a) => salonIds.includes(a.salonId));
      if (date) list = list.filter((a) => a.appointmentDate === date);
    } else {
      list = this.db.appointments.filter((a) => a.customerId === user.id);
    }

    list = this.applyStatusFilter(list, status);
    list = list.sort((a, b) =>
      user.role === 'SALON_OWNER'
        ? a.appointmentDate.localeCompare(b.appointmentDate) || a.startTime.localeCompare(b.startTime)
        : b.appointmentDate.localeCompare(a.appointmentDate) || b.startTime.localeCompare(a.startTime)
    );
    return this.ok(list);
  }

  getAppointment(id: number): Observable<Appointment> {
    const user = this.currentUser();
    const appt = this.db.appointments.find((a) => a.id === id);
    if (!appt) return this.fail<Appointment>('Appointment not found.', 404);
    if (!user) return this.fail<Appointment>('Not authenticated.', 401);
    if (user.role === 'CUSTOMER' && appt.customerId !== user.id)
      return this.fail<Appointment>('You can only view your own bookings.', 403);
    if (user.role === 'SALON_OWNER') {
      const owns = this.db.salons.some((s) => s.id === appt.salonId && s.ownerId === user.id);
      if (!owns) return this.fail<Appointment>('You can only view appointments at your salon.', 403);
    }
    return this.ok(appt);
  }

  createAppointment(request: CreateAppointmentRequest): Observable<Appointment> {
    const user = this.currentUser();
    if (!user) return this.fail<Appointment>('Not authenticated.', 401);

    const service = this.db.services.find(
      (s) => s.id === request.serviceId && s.salonId === request.salonId && s.isActive
    );
    if (!service) return this.fail<Appointment>('Service not found for this salon.', 404);
    const salon = this.db.salons.find((s) => s.id === request.salonId && s.isActive);
    if (!salon) return this.fail<Appointment>('Salon not found.', 404);

    const date = new Date(request.appointmentDate + 'T00:00:00');
    const dow = date.getDay();
    const startMin = this.toMinutes(request.startTime);
    const endMin = startMin + service.durationInMinutes;

    const bh = salon.businessHours.find((h) => h.dayOfWeek === dow);
    if (!bh || bh.isClosed || !bh.openTime || !bh.closeTime)
      return this.fail<Appointment>('The salon is closed on the selected day.', 409);
    if (startMin < this.toMinutes(bh.openTime) || endMin > this.toMinutes(bh.closeTime))
      return this.fail<Appointment>('The selected time is outside salon working hours.', 409);

    const barberId = this.pickBarber(request.salonId, request.serviceId, request.barberId ?? null, request.appointmentDate, dow, startMin, endMin, null);
    if (barberId === null) return this.fail<Appointment>('The selected time slot is no longer available.', 409);

    const barber = this.db.barbers.find((b) => b.id === barberId)!;
    const id = Math.max(0, ...this.db.appointments.map((a) => a.id)) + 1;
    const appt: Appointment = {
      id,
      customerId: user.id,
      customerName: user.name,
      salonId: request.salonId,
      salonName: salon.name,
      barberId,
      barberName: barber.name,
      serviceId: request.serviceId,
      serviceName: service.name,
      appointmentDate: request.appointmentDate,
      startTime: request.startTime,
      endTime: this.toHHmm(endMin),
      status: 'CONFIRMED',
      amount: service.price,
      cancellationReason: null,
      createdAt: new Date().toISOString()
    };
    this.db.appointments.push(appt);
    this.persist();
    return this.ok(appt);
  }

  rescheduleAppointment(id: number, request: RescheduleRequest): Observable<Appointment> {
    const user = this.currentUser();
    const appt = this.db.appointments.find((a) => a.id === id);
    if (!appt) return this.fail<Appointment>('Appointment not found.', 404);
    if (!user || appt.customerId !== user.id)
      return this.fail<Appointment>('You can only reschedule your own bookings.', 403);
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status))
      return this.fail<Appointment>('This appointment can no longer be rescheduled.', 400);

    const service = this.db.services.find((s) => s.id === appt.serviceId)!;
    const date = new Date(request.appointmentDate + 'T00:00:00');
    const dow = date.getDay();
    const startMin = this.toMinutes(request.startTime);
    const endMin = startMin + service.durationInMinutes;

    const salon = this.db.salons.find((s) => s.id === appt.salonId)!;
    const bh = salon.businessHours.find((h) => h.dayOfWeek === dow);
    if (!bh || bh.isClosed || !bh.openTime || !bh.closeTime)
      return this.fail<Appointment>('The salon is closed on the selected day.', 409);
    if (startMin < this.toMinutes(bh.openTime) || endMin > this.toMinutes(bh.closeTime))
      return this.fail<Appointment>('The selected time is outside salon working hours.', 409);

    const barberId = this.pickBarber(appt.salonId, appt.serviceId, request.barberId ?? appt.barberId, request.appointmentDate, dow, startMin, endMin, appt.id);
    if (barberId === null) return this.fail<Appointment>('The selected time slot is no longer available.', 409);

    const barber = this.db.barbers.find((b) => b.id === barberId)!;
    appt.barberId = barberId;
    appt.barberName = barber.name;
    appt.appointmentDate = request.appointmentDate;
    appt.startTime = request.startTime;
    appt.endTime = this.toHHmm(endMin);
    this.persist();
    return this.ok(appt);
  }

  cancelAppointment(id: number, reason?: string): Observable<Appointment> {
    const user = this.currentUser();
    const appt = this.db.appointments.find((a) => a.id === id);
    if (!appt) return this.fail<Appointment>('Appointment not found.', 404);
    if (!user) return this.fail<Appointment>('Not authenticated.', 401);
    if (user.role === 'CUSTOMER' && appt.customerId !== user.id)
      return this.fail<Appointment>('You can only cancel your own bookings.', 403);
    if (user.role === 'SALON_OWNER') {
      const owns = this.db.salons.some((s) => s.id === appt.salonId && s.ownerId === user.id);
      if (!owns) return this.fail<Appointment>('You can only cancel appointments at your salon.', 403);
    }
    if (appt.status === 'CANCELLED') return this.fail<Appointment>('This appointment is already cancelled.', 400);
    if (['COMPLETED', 'NO_SHOW'].includes(appt.status))
      return this.fail<Appointment>('This appointment can no longer be cancelled.', 400);

    appt.status = 'CANCELLED';
    appt.cancellationReason = reason ?? null;
    this.persist();
    return this.ok(appt);
  }

  updateAppointmentStatus(id: number, status: string): Observable<Appointment> {
    const user = this.currentUser();
    const appt = this.db.appointments.find((a) => a.id === id);
    if (!appt) return this.fail<Appointment>('Appointment not found.', 404);
    if (!user) return this.fail<Appointment>('Not authenticated.', 401);
    const owns = this.db.salons.some((s) => s.id === appt.salonId && s.ownerId === user.id);
    if (!owns) return this.fail<Appointment>('You can only manage appointments at your salon.', 403);
    appt.status = status as Appointment['status'];
    this.persist();
    return this.ok(appt);
  }

  private pickBarber(
    salonId: number,
    serviceId: number,
    preferred: number | null,
    dateIso: string,
    dow: number,
    startMin: number,
    endMin: number,
    excludeAppointmentId: number | null
  ): number | null {
    let capable = this.db.barbers.filter(
      (b) => b.salonId === salonId && b.isActive && b.serviceIds.includes(serviceId)
    );
    if (preferred !== null) {
      const p = capable.filter((b) => b.id === preferred);
      if (p.length) capable = p;
    }
    for (const barber of capable) {
      if (barber.leaves.some((l) => l.leaveDate === dateIso)) continue;
      const sched = barber.schedules.find((s) => s.dayOfWeek === dow);
      if (!sched || sched.isOff || !sched.startTime || !sched.endTime) continue;
      if (startMin < this.toMinutes(sched.startTime) || endMin > this.toMinutes(sched.endTime)) continue;
      const overlaps = this.db.appointments.some(
        (a) =>
          a.barberId === barber.id &&
          a.appointmentDate === dateIso &&
          a.status !== 'CANCELLED' &&
          a.id !== excludeAppointmentId &&
          startMin < this.toMinutes(a.endTime) &&
          this.toMinutes(a.startTime) < endMin
      );
      if (!overlaps) return barber.id;
    }
    return null;
  }

  // ----- Owner dashboard -----
  getOwnerDashboard(): Observable<OwnerDashboard> {
    const user = this.currentUser();
    if (!user) return this.fail<OwnerDashboard>('Not authenticated.', 401);
    const salonIds = this.db.salons.filter((s) => s.ownerId === user.id).map((s) => s.id);
    const appts = this.db.appointments.filter((a) => salonIds.includes(a.salonId));
    const today = this.todayIso();

    return this.ok({
      todayAppointments: appts.filter((a) => a.appointmentDate === today && a.status !== 'CANCELLED').length,
      upcomingAppointments: appts.filter((a) => a.appointmentDate >= today && (a.status === 'CONFIRMED' || a.status === 'PENDING')).length,
      completedAppointments: appts.filter((a) => a.status === 'COMPLETED').length,
      cancelledAppointments: appts.filter((a) => a.status === 'CANCELLED').length,
      activeBarbers: this.db.barbers.filter((b) => salonIds.includes(b.salonId) && b.isActive).length,
      totalServices: this.db.services.filter((s) => salonIds.includes(s.salonId) && s.isActive).length,
      totalAppointments: appts.length
    });
  }

  private applyStatusFilter(list: Appointment[], status?: string): Appointment[] {
    if (!status) return list;
    const today = this.todayIso();
    if (status.toLowerCase() === 'upcoming')
      return list.filter((a) => a.appointmentDate >= today && (a.status === 'CONFIRMED' || a.status === 'PENDING'));
    if (status.toLowerCase() === 'history')
      return list.filter((a) => a.appointmentDate < today || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status));
    return list.filter((a) => a.status.toLowerCase() === status.toLowerCase());
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  private toHHmm(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
