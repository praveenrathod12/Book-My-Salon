namespace SalonBooking.Api.Entities;

// Join entity: a barber can provide many services; a service can be done by many barbers.
public class BarberService
{
    public int Id { get; set; }

    public int BarberId { get; set; }
    public Barber? Barber { get; set; }

    public int ServiceId { get; set; }
    public Service? Service { get; set; }
}
