using System.Text.Json;
using TioHub.Api.Common;
using TioHub.Api.Modules.Reporting;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class ExportHistoryScopeTests
{
    private static UserContext User(long id, long clientId)
    {
        var user = new UserContext();
        user.Set(new ResolvedUser(id, "test", "Test", "UTC", true, ["Custom"],
            Fixture.Rights(["Cases:View"], Flag.Export),
            false, [clientId], [], [], [], false, []));
        return user;
    }

    private static ExportJob Job(UserContext user) => new()
    {
        UserId = user.UserId!.Value, Report = "cases", ReportName = "Confidential report",
        FilterSummary = "Client = SECRET", RowCount = 123, FileSize = 456,
        FileName = "secret.xlsx", StoredPath = "secret", Error = "SECRET error",
        Status = ExportStatus.Completed, AccessFingerprint = ExportAccessFingerprint.For(user)
    };

    [Fact]
    public void Owner_with_unchanged_access_can_see_current_job_details()
    {
        var user = User(7, 10);
        var job = Job(user);
        var json = JsonSerializer.Serialize(BuilderEndpoints.JobDto(job, "Test", user));
        Assert.Contains("Client = SECRET", json);
        Assert.Contains("\"canDownload\":true", json);
    }

    [Fact]
    public void History_does_not_expose_scoped_metadata_after_access_changes_or_to_other_users()
    {
        var owner = User(7, 10);
        var job = Job(owner);
        foreach (var viewer in new[] { User(7, 11), User(8, 10) })
        {
            var json = JsonSerializer.Serialize(BuilderEndpoints.JobDto(job, "Test", viewer));
            Assert.DoesNotContain("SECRET", json);
            Assert.DoesNotContain("secret.xlsx", json);
            Assert.DoesNotContain("Confidential report", json);
            Assert.Contains("\"RowCount\":null", json);
            Assert.Contains("\"canDownload\":false", json);
            Assert.False(BuilderEndpoints.CanSeeJobDetails(job, viewer));
        }
    }

    [Fact]
    public void Legacy_and_failed_scheduled_jobs_do_not_disclose_filter_labels()
    {
        var user = User(7, 10);
        var job = Job(user);
        job.AccessFingerprint = null;
        Assert.False(BuilderEndpoints.CanSeeJobDetails(job, user));
        job.AccessFingerprint = ExportAccessFingerprint.For(user);
        job.Source = "Schedule";
        job.Status = ExportStatus.Failed;
        Assert.False(BuilderEndpoints.CanSeeJobDetails(job, user));
        var json = JsonSerializer.Serialize(BuilderEndpoints.JobDto(job, "Test", user));
        Assert.DoesNotContain("SECRET", json);
    }
}
