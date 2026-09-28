import {
  Appointment,
  AuthUser,
  Barber,
  BusinessHour,
  Salon,
  Service
} from '../models/models';

// Demo login credentials shown on the login page.
export const DEMO_ACCOUNTS = {
  customer: { email: 'customer@demo.com', password: 'Demo@123' },
  owner: { email: 'owner@demo.com', password: 'Demo@123' }
};

export interface DemoDatabase {
  users: (AuthUser & { password: string })[];
  salons: Salon[];
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
}

function defaultHours(): BusinessHour[] {
  return Array.from({ length: 7 }, (_, day) => ({
    dayOfWeek: day,
    isClosed: false,
    openTime: day === 0 ? '10:00' : '09:00',
    closeTime: day === 6 ? '22:00' : day === 0 ? '18:00' : '21:00'
  }));
}

function defaultSchedule(sundayOff: boolean) {
  return Array.from({ length: 7 }, (_, day) => {
    const off = sundayOff && day === 0;
    return {
      dayOfWeek: day,
      isOff: off,
      startTime: off ? null : '09:00',
      endTime: off ? null : '18:00'
    };
  });
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Builds a fresh, deterministic demo database each time the demo session resets.
export function buildDemoDatabase(): DemoDatabase {
  const users: DemoDatabase['users'] = [
    { id: 1, name: 'Demo Customer', firstName: 'Demo', lastName: 'Customer', email: 'customer@demo.com', phoneNumber: '9000000001', role: 'CUSTOMER', password: 'Demo@123' },
    { id: 2, name: 'Demo Owner', firstName: 'Demo', lastName: 'Owner', email: 'owner@demo.com', phoneNumber: '9000000002', role: 'SALON_OWNER', password: 'Demo@123' }
  ];

  const salonSeeds = [
    { name: 'Style Studio', city: 'Bengaluru', state: 'Karnataka', rating: 4.6, desc: 'Modern unisex salon offering premium grooming and styling.', addr: '12 MG Road', pin: '560001' },
    { name: 'Urban Cuts', city: 'Bengaluru', state: 'Karnataka', rating: 4.3, desc: 'Trendy cuts and beard styling for the urban gentleman.', addr: '45 Indiranagar', pin: '560038' },
    { name: 'The Grooming Lounge', city: 'Mumbai', state: 'Maharashtra', rating: 4.8, desc: 'Luxury grooming lounge with experienced stylists.', addr: '8 Bandra West', pin: '400050' },
    { name: 'Classic Hair Studio', city: 'Pune', state: 'Maharashtra', rating: 4.1, desc: 'Classic barbershop experience with a friendly touch.', addr: '23 FC Road', pin: '411004' },
    { name: "Gentleman's Hub", city: 'Hyderabad', state: 'Telangana', rating: 4.5, desc: 'Full-service grooming hub for the modern man.', addr: '77 Jubilee Hills', pin: '500033' }
  ];

  const serviceTemplates = [
    { name: 'Haircut', desc: 'Professional haircut and styling.', price: 250, duration: 30 },
    { name: 'Beard Trim', desc: 'Beard shaping and trimming.', price: 150, duration: 30 },
    { name: 'Haircut + Beard', desc: 'Complete haircut with beard styling.', price: 350, duration: 60 },
    { name: 'Hair Spa', desc: 'Relaxing hair spa treatment.', price: 600, duration: 60 },
    { name: 'Facial', desc: 'Refreshing facial treatment.', price: 500, duration: 60 },
    { name: 'Shaving', desc: 'Clean classic shave.', price: 120, duration: 30 },
    { name: 'Hair Coloring', desc: 'Full hair coloring service.', price: 900, duration: 90 }
  ];

  const barberNames = ['Rahul', 'Arjun', 'Vikram', 'Karan', 'Sameer', 'Deepak'];

  const salons: Salon[] = [];
  const services: Service[] = [];
  const barbers: Barber[] = [];

  let salonId = 1;
  let serviceId = 1;
  let barberId = 1;

  // All salons owned by the demo owner (id 2) so the owner demo has data.
  for (const seed of salonSeeds) {
    const sId = salonId++;
    // Deterministic subset of services (first 5) for realistic variety.
    const chosenServices = serviceTemplates.slice(0, sId === 1 ? 6 : sId === 2 ? 4 : 5);
    const salonServiceIds: number[] = [];
    for (const st of chosenServices) {
      const svcId = serviceId++;
      salonServiceIds.push(svcId);
      services.push({
        id: svcId,
        salonId: sId,
        name: st.name,
        description: st.desc,
        price: st.price,
        durationInMinutes: st.duration,
        isActive: true
      });
    }

    const barberCount = 3 + (sId % 2); // 3 or 4
    for (let i = 0; i < barberCount; i++) {
      const bId = barberId++;
      // Each barber can do a subset of the salon's services (at least Haircut).
      const canDo = salonServiceIds.filter((_, idx) => (idx + i) % 2 === 0);
      if (!canDo.includes(salonServiceIds[0])) canDo.unshift(salonServiceIds[0]);
      const isActive = !(sId === 2 && i === barberCount - 1); // one inactive in Urban Cuts

      barbers.push({
        id: bId,
        salonId: sId,
        name: barberNames[(i + sId) % barberNames.length],
        phoneNumber: '98' + (10000000 + bId * 137).toString().slice(0, 8),
        experienceYears: 1 + ((bId * 3) % 12),
        isActive,
        offToday: false,
        serviceIds: canDo,
        serviceNames: canDo.map((id) => services.find((s) => s.id === id)!.name),
        schedules: defaultSchedule(i % 2 === 0),
        leaves: []
      });
    }

    salons.push({
      id: sId,
      ownerId: 2,
      name: seed.name,
      description: seed.desc,
      address: seed.addr,
      city: seed.city,
      state: seed.state,
      postalCode: seed.pin,
      phoneNumber: '080-4000-' + (1000 + sId).toString(),
      latitude: null,
      longitude: null,
      rating: seed.rating,
      isActive: true,
      startingPrice: Math.min(...services.filter((s) => s.salonId === sId).map((s) => s.price)),
      serviceCount: salonServiceIds.length,
      activeBarberCount: barbers.filter((b) => b.salonId === sId && b.isActive).length,
      businessHours: defaultHours()
    });
  }

  // Add a sample leave (2 days out) for the first barber of Style Studio.
  const firstBarber = barbers.find((b) => b.salonId === 1)!;
  const leaveDate = new Date();
  leaveDate.setDate(leaveDate.getDate() + 2);
  firstBarber.leaves.push({ id: 1, leaveDate: iso(leaveDate), reason: 'Personal leave' });

  // Sample appointments for the demo customer.
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  const styleService = services.find((s) => s.salonId === 1 && s.name === 'Haircut')!;
  const activeStyleBarber = barbers.find((b) => b.salonId === 1 && b.isActive)!;

  const appointments: Appointment[] = [
    {
      id: 1,
      customerId: 1,
      customerName: 'Demo Customer',
      salonId: 1,
      salonName: 'Style Studio',
      barberId: activeStyleBarber.id,
      barberName: activeStyleBarber.name,
      serviceId: styleService.id,
      serviceName: styleService.name,
      appointmentDate: iso(tomorrow),
      startTime: '17:00',
      endTime: '17:30',
      status: 'CONFIRMED',
      amount: styleService.price,
      cancellationReason: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      customerId: 1,
      customerName: 'Demo Customer',
      salonId: 1,
      salonName: 'Style Studio',
      barberId: activeStyleBarber.id,
      barberName: activeStyleBarber.name,
      serviceId: styleService.id,
      serviceName: styleService.name,
      appointmentDate: iso(lastWeek),
      startTime: '11:00',
      endTime: '11:30',
      status: 'COMPLETED',
      amount: styleService.price,
      cancellationReason: null,
      createdAt: lastWeek.toISOString()
    }
  ];

  return { users, salons, services, barbers, appointments };
}
