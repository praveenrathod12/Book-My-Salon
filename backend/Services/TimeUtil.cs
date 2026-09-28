using System.Globalization;
using SalonBooking.Api.Exceptions;

namespace SalonBooking.Api.Services;

public static class TimeUtil
{
    public static TimeSpan ParseTime(string value, string fieldName = "time")
    {
        if (TimeSpan.TryParseExact(value, @"hh\:mm", CultureInfo.InvariantCulture, out var ts) ||
            TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out ts))
            return ts;
        throw new BadRequestException($"Invalid {fieldName} format. Expected HH:mm.");
    }

    public static TimeSpan? ParseTimeOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return ParseTime(value);
    }

    public static DateOnly ParseDate(string value, string fieldName = "date")
    {
        if (DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ||
            DateOnly.TryParse(value, CultureInfo.InvariantCulture, out d))
            return d;
        throw new BadRequestException($"Invalid {fieldName} format. Expected yyyy-MM-dd.");
    }

    public static string FormatTime(TimeSpan ts) => $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}";

    public static string FormatDate(DateOnly d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
