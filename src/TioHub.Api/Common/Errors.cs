using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace TioHub.Api.Common;

/// <summary>404 for missing records and for records outside the caller's scope, so existence is never disclosed.</summary>
public sealed class NotFoundException(string what) : Exception($"{what} was not found, or you do not have access to it.");

public sealed class ForbiddenException(string message) : Exception(message);

/// <summary>409 with a neutral message: used for duplicates, including ones the caller cannot see (Section 3).</summary>
public sealed class ConflictException(string message, Dictionary<string, string[]>? errors = null) : Exception(message)
{
    public Dictionary<string, string[]>? Errors { get; } = errors;
}

public sealed class PreconditionRequiredException() : Exception("Reload the record and try again: the request did not say which version you edited.");

/// <summary>Business-rule or input validation failure: 422 with errors keyed by field.</summary>
public sealed class ValidationException : Exception
{
    public Dictionary<string, string[]> Errors { get; }

    public ValidationException(string title, Dictionary<string, string[]> errors) : base(title) => Errors = errors;

    public ValidationException(string field, string message) : base(message) => Errors = new() { [field] = [message] };
}

/// <summary>Collects field errors and throws one ValidationException (UX-03: errors beside the affected input).</summary>
public sealed class Check
{
    private readonly Dictionary<string, List<string>> _errors = [];

    public Check Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
        list.Add(message);
        return this;
    }

    public Check Required(string field, string? value, string label)
    {
        if (string.IsNullOrWhiteSpace(value)) Add(field, $"Enter {label}.");
        return this;
    }

    public Check Required<T>(string field, T? value, string label) where T : struct
    {
        if (value is null) Add(field, $"Select {label}.");
        return this;
    }

    public Check MaxLength(string field, string? value, int max, string label)
    {
        if (value is not null && value.Trim().Length > max) Add(field, $"{label} can be at most {max} characters.");
        return this;
    }

    /// <summary>Required + max length + no secrets in one call.</summary>
    public Check Text(string field, string? value, int max, string label, bool required = false)
    {
        if (required) Required(field, value, label);
        MaxLength(field, value, max, label);
        if (CredentialGuard.LooksLikeSecret(value)) Add(field, CredentialGuard.Message);
        return this;
    }

    public Check When(bool failed, string field, string message)
    {
        if (failed) Add(field, message);
        return this;
    }

    public bool HasErrors => _errors.Count > 0;

    public bool Has(string field) => _errors.ContainsKey(field);

    public void ThrowIfAny(string title = "Some values need attention.")
    {
        if (_errors.Count > 0)
            throw new ValidationException(title, _errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
    }
}

public static class ProblemWriter
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static Task WriteAsync(HttpContext ctx, int status, string title, string? detail = null, Dictionary<string, string[]>? errors = null)
    {
        if (ctx.Response.HasStarted) return Task.CompletedTask;
        ctx.Response.Clear();
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/problem+json";
        var body = new Dictionary<string, object?>
        {
            ["type"] = $"https://tio-hub/errors/{status}",
            ["title"] = title,
            ["status"] = status,
            ["detail"] = detail,
            ["traceId"] = Activity.Current?.Id ?? ctx.TraceIdentifier
        };
        if (errors is not null) body["errors"] = errors;
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(body, Json));
    }
}

/// <summary>Maps exceptions to Problem Details. Users see a short actionable message and a trace id; details go to the log only (NFR-08).</summary>
public sealed class ErrorMiddleware(RequestDelegate next, ILogger<ErrorMiddleware> log)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (ValidationException ex)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status422UnprocessableEntity, ex.Message, null, ex.Errors);
        }
        catch (NotFoundException ex)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status404NotFound, "Not found", ex.Message);
        }
        catch (ForbiddenException ex)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status403Forbidden, "Not allowed", ex.Message);
        }
        catch (ConflictException ex)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status409Conflict, ex.Message, null, ex.Errors);
        }
        catch (PreconditionRequiredException ex)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status428PreconditionRequired, "Version missing", ex.Message);
        }
        catch (DbUpdateConcurrencyException)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status412PreconditionFailed, "Someone else saved this record while you were editing.",
                "Your changes were not saved and are still in the form. Review the latest version, then apply your changes again.");
        }
        catch (DbUpdateException ex) when (SqlErrors.IsUniqueViolation(ex))
        {
            // A race lost against another insert: report neutrally, never the conflicting row.
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status409Conflict, "A record with the same identifying values already exists.");
        }
        catch (AntiforgeryValidationException)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status400BadRequest, "Security token missing or expired", "Reload the page and try again.");
        }
        catch (BadHttpRequestException ex)
        {
            log.LogInformation("Unreadable request on {Method} {Path}: {Reason}", ctx.Request.Method, ctx.Request.Path, ex.GetType().Name);
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status400BadRequest, "The request could not be read.", "Check the values entered and try again.");
        }
        catch (OperationCanceledException) when (ctx.RequestAborted.IsCancellationRequested)
        {
            // client went away
        }
        catch (Exception ex)
        {
            // Exception messages can contain user input; log type and stack, not request bodies.
            log.LogError(ex, "Unhandled error on {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status500InternalServerError, "Something went wrong on the server.",
                "The error has been logged. Quote the trace id if you contact support.");
        }
    }
}

public static class SqlErrors
{
    public static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is Microsoft.Data.SqlClient.SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
}
