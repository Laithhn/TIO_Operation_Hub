using System.Text.RegularExpressions;
using TioHub.Api.Common;

namespace TioHub.Api.Modules.Shared;

/// <summary>A36: a person's contact details, entered separately (owner request, 20 Oct 2026): name, job title, organization, phone, mobile, e-mail.</summary>
public sealed record ContactDetailsInput(string? Name, string? Title, string? Organization, string? Phone, string? Mobile, string? Email);

public static partial class ContactDetails
{
    [GeneratedRegex(@"^[0-9+()\-./ ]{5,30}$")]
    private static partial Regex PhonePattern();
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailPattern();

    /// <summary>Validates the fields under <paramref name="prefix"/> (for example "owner" gives ownerPhone). Name is required when any detail is given.</summary>
    public static void Check(Check check, string prefix, ContactDetailsInput? c, string who)
    {
        if (c is null) return;
        string F(string f) => prefix + f;
        check.Text(F("Name"), c.Name, 150, $"{who} name").Text(F("Title"), c.Title, 100, "Job title").Text(F("Organization"), c.Organization, 150, "Organization")
             .Text(F("Email"), c.Email, 254, "E-mail");
        if (!string.IsNullOrWhiteSpace(c.Phone) && !PhonePattern().IsMatch(c.Phone.Trim())) check.Add(F("Phone"), "Enter a phone number with digits, spaces and + ( ) - only.");
        if (!string.IsNullOrWhiteSpace(c.Mobile) && !PhonePattern().IsMatch(c.Mobile.Trim())) check.Add(F("Mobile"), "Enter a mobile number with digits, spaces and + ( ) - only.");
        if (!string.IsNullOrWhiteSpace(c.Email) && !EmailPattern().IsMatch(c.Email.Trim())) check.Add(F("Email"), "Enter a valid e-mail address.");
        var any = new[] { c.Title, c.Organization, c.Phone, c.Mobile, c.Email }.Any(x => !string.IsNullOrWhiteSpace(x));
        if (any && string.IsNullOrWhiteSpace(c.Name)) check.Add(F("Name"), $"Type the {who.ToLowerInvariant()}'s name for these contact details.");
    }

    public static bool HasName(ContactDetailsInput? c) => !string.IsNullOrWhiteSpace(c?.Name);
}
