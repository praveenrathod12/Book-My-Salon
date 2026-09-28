namespace SalonBooking.Api.Entities;

public enum UserRole
{
    CUSTOMER = 0,
    SALON_OWNER = 1
}

public enum AppointmentStatus
{
    PENDING = 0,
    CONFIRMED = 1,
    COMPLETED = 2,
    CANCELLED = 3,
    NO_SHOW = 4
}
