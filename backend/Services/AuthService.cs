using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SalonBooking.Api.Configuration;
using SalonBooking.Api.Data;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Exceptions;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly JwtSettings _jwt;

    public AuthService(AppDbContext db, ITokenService tokenService, IOptions<JwtSettings> jwt)
    {
        _db = db;
        _tokenService = tokenService;
        _jwt = jwt.Value;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            throw new ConflictException("An account with this email already exists.");

        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
            throw new BadRequestException("Invalid role. Must be CUSTOMER or SALON_OWNER.");

        var user = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return await BuildAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        if (!user.IsActive)
            throw new ForbiddenException("This account has been deactivated.");

        return await BuildAuthResponse(user);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.RefreshToken == request.RefreshToken);

        if (user is null || user.RefreshTokenExpiresAt is null || user.RefreshTokenExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedException("Invalid or expired refresh token.");

        return await BuildAuthResponse(user);
    }

    public async Task<UserDto> GetProfileAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId)
                   ?? throw new NotFoundException("User not found.");
        return ToDto(user);
    }

    private async Task<AuthResponse> BuildAuthResponse(User user)
    {
        var (accessToken, _) = _tokenService.CreateAccessToken(user);
        var refreshToken = _tokenService.CreateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            User = ToDto(user)
        };
    }

    private static UserDto ToDto(User user) => new()
    {
        Id = user.Id,
        Name = $"{user.FirstName} {user.LastName}".Trim(),
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        PhoneNumber = user.PhoneNumber,
        Role = user.Role.ToString()
    };
}
