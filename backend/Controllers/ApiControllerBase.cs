using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Exceptions;

namespace SalonBooking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId
    {
        get
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue("sub");
            if (int.TryParse(id, out var parsed)) return parsed;
            throw new UnauthorizedException("Invalid authentication token.");
        }
    }

    protected UserRole CurrentUserRole
    {
        get
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<UserRole>(role, true, out var parsed) ? parsed : UserRole.CUSTOMER;
        }
    }
}
