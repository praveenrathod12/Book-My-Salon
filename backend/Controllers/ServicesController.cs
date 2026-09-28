using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Controllers;

[Route("api/services")]
[Authorize(Roles = "SALON_OWNER")]
public class ServicesController : ApiControllerBase
{
    private readonly IServiceService _services;

    public ServicesController(IServiceService services) => _services = services;

    [HttpPost]
    public async Task<ActionResult<ServiceDto>> Create(ServiceUpsertRequest request)
        => StatusCode(201, await _services.CreateAsync(CurrentUserId, request));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ServiceDto>> Update(int id, ServiceUpsertRequest request)
        => Ok(await _services.UpdateAsync(CurrentUserId, id, request));

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ServiceDto>> SetStatus(int id, ServiceStatusRequest request)
        => Ok(await _services.SetStatusAsync(CurrentUserId, id, request.IsActive));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _services.DeleteAsync(CurrentUserId, id);
        return NoContent();
    }
}
