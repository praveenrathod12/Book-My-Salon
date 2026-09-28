namespace SalonBooking.Api.Exceptions;

// Base for expected, HTTP-mapped exceptions used across the service layer.
public abstract class AppException : Exception
{
    public int StatusCode { get; }
    protected AppException(string message, int statusCode) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class BadRequestException(string message) : AppException(message, 400);

public class UnauthorizedException(string message = "Unauthorized") : AppException(message, 401);

public class ForbiddenException(string message = "You do not have access to this resource.") : AppException(message, 403);

public class NotFoundException(string message = "Resource not found.") : AppException(message, 404);

public class ConflictException(string message) : AppException(message, 409);
