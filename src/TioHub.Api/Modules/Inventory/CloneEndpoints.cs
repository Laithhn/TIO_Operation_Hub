using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Catalogue;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Inventory;

/// <summary>
/// A28/A30: copy servers (assets) and installations from one environment to another environment of the same client — typically the same
/// set-up in another region (R1 Production → R2 Production). Copies are new records: names follow a find/replace rule, provenance and
/// verification are not copied (nothing was transcribed or verified for the copy), endpoints and addresses are never copied, and recorded
/// versions are copied only when asked (evidence optional). Everything is saved in one transaction, or nothing is.
/// </summary>
public static class CloneEndpoints
{
    public sealed record EnvironmentCloneInput(long? RegionId, string? Name, List<long>? AssetIds, List<long>? InstallationIds, string? Find, string? Replace,
        AssetLifecycle? Lifecycle, bool IncludeVolumes = true, bool IncludeDeployment = true, bool CopyVersions = false, string? VersionEvidence = null);
    /// <summary>A45: one target of a multi-copy, with its own rename rule.</summary>
    public sealed record CloneTarget(long? EnvironmentId, string? Find, string? Replace);
    public sealed record CloneManyInput(List<CloneTarget>? Targets, List<long>? AssetIds, List<long>? InstallationIds, AssetLifecycle? Lifecycle,
        bool IncludeVolumes = true, bool IncludeDeployment = true, bool CopyVersions = false, string? VersionEvidence = null);
    public sealed record CloneInput(long? TargetEnvironmentId, List<long>? AssetIds, List<long>? InstallationIds, string? Find, string? Replace,
        AssetLifecycle? Lifecycle, bool IncludeVolumes = true, bool IncludeDeployment = true, bool CopyVersions = false, string? VersionEvidence = null);

    /// <summary>Case-insensitive replace that follows the case of each match (r1→r2, R1→R2).</summary>
    public static string Rename(string name, string? find, string? replace)
    {
        if (string.IsNullOrEmpty(find)) return name;
        var rep = replace ?? "";
        return Regex.Replace(name, Regex.Escape(find), m =>
            m.Value == m.Value.ToUpperInvariant() && m.Value != m.Value.ToLowerInvariant() ? rep.ToUpperInvariant()
            : m.Value == m.Value.ToLowerInvariant() && m.Value != m.Value.ToUpperInvariant() ? rep.ToLowerInvariant() : rep,
            RegexOptions.IgnoreCase);
    }

    public static void MapCloneEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/environments/{id:long}/clone", async (long id, CloneInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var source = await db.Environments.AsNoTracking().Include(e => e.Region).FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("The environment");
            access.RequireBusiness();
            if (input.TargetEnvironmentId is null) throw new ValidationException("targetEnvironmentId", "Select the environment to copy to.");
            var target = await db.Environments.AsNoTracking().Include(e => e.Region).FirstOrDefaultAsync(e => e.Id == input.TargetEnvironmentId, ct)
                ?? throw new ValidationException("targetEnvironmentId", "Select an environment you can access.");
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var result = await CopyIntoAsync(db, access, clock, source, target, input, ct);
            await tx.CommitAsync(ct);
            return Results.Ok(result);
        }).WithTags("Environments");

        // A45 (owner request, 21 Oct 2026): copy the selected servers and installations into several environments at once — any environment of the
        // client, in any region, including the same environment (a duplicate under a new name). Each target has its own rename rule. All or nothing.
        api.MapPost("/environments/{id:long}/clone-to-many", async (long id, CloneManyInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var source = await db.Environments.AsNoTracking().Include(e => e.Region).FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("The environment");
            access.RequireBusiness();
            var targets = (input.Targets ?? []).Where(t => t.EnvironmentId is not null).ToList();
            if (targets.Count == 0) throw new ValidationException("targets", "Select at least one environment to copy to.");
            if (targets.GroupBy(t => t.EnvironmentId).Any(g => g.Count() > 1)) throw new ValidationException("targets", "Each environment can be chosen once.");
            var ids = targets.Select(t => t.EnvironmentId!.Value).ToList();
            var envs = await db.Environments.AsNoTracking().Include(e => e.Region).Where(e => ids.Contains(e.Id)).ToListAsync(ct);
            if (envs.Count != ids.Count) throw new ValidationException("targets", "Select environments you can access.");
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var results = new List<object>();
            foreach (var t in targets)
            {
                var target = envs.First(e => e.Id == t.EnvironmentId);
                var label = target.Region is null ? target.Name : $"{target.Region.Code} / {target.Name}";
                if (target.Id == source.Id && string.IsNullOrWhiteSpace(t.Find))
                    throw new ValidationException($"targets[{targets.IndexOf(t)}].find", $"{label}: a copy in the same environment needs a new name; enter what to find and replace.");
                try
                {
                    results.Add(await CopyIntoAsync(db, access, clock, source, target, new CloneInput(target.Id, input.AssetIds, input.InstallationIds, t.Find, t.Replace,
                        input.Lifecycle, input.IncludeVolumes, input.IncludeDeployment, input.CopyVersions, input.VersionEvidence), ct));
                }
                catch (ConflictException ex)
                {
                    throw new ConflictException($"{label}: {ex.Message}", ex.Errors?.ToDictionary(k => k.Key, k => k.Value.Select(m => $"{label}: {m}").ToArray()) ?? []);
                }
                catch (ValidationException ex)
                {
                    throw new ValidationException($"{label}: {ex.Message}", ex.Errors.ToDictionary(k => k.Key, k => k.Value.Select(m => $"{label}: {m}").ToArray()));
                }
            }
            await tx.CommitAsync(ct);
            return Results.Ok(new { results });
        }).WithTags("Environments");

        // A30: copy a whole environment into another region (or directly under the client): a new environment with the same set-up,
        // then its servers and installations (all, unless a selection is sent) with the same rules as above. One transaction.
        api.MapPost("/environments/{id:long}/clone-environment", async (long id, EnvironmentCloneInput input, HubDbContext db, HubAccess access, LookupService lookups,
            TimeProvider clock, CancellationToken ct) =>
        {
            var source = await db.Environments.AsNoTracking().Include(e => e.Region).FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("The environment");
            access.RequireCreateFor(ResourcePermissions.Environments, source.ClientId);
            if (input.RegionId == source.RegionId && string.Equals((input.Name ?? source.Name).Trim(), source.Name, StringComparison.OrdinalIgnoreCase))
                throw new ValidationException("regionId", "Choose another region, or give the copy another name.");
            var env = new ClientEnvironment { ClientId = source.ClientId };
            await EnvironmentEndpoints.ApplyAsync(env, new EnvironmentEndpoints.EnvironmentInput(source.ClientId, input.RegionId, source.ProjectId,
                string.IsNullOrWhiteSpace(input.Name) ? source.Name : input.Name, source.Type, source.TypeDescription, source.Hosting, source.Location, source.Criticality,
                source.OwnerUserId, source.BackupOwnerUserId, source.BackupGapReason, source.ResponsibleParty, null, source.ResponsibleTeamId, source.CoordinatorUserId,
                source.Description, null, null), db, access, lookups, isNew: true, ct);
            var src = source.Region is null ? source.Name : $"{source.Region.Code} / {source.Name}";
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            db.Environments.Add(env);
            db.AuditReason = $"Copied from {src}";
            await db.SaveChangesAsync(ct);
            // Everything in the source environment unless a selection is sent.
            var assetIds = input.AssetIds ?? await db.Assets.Where(a => a.EnvironmentId == source.Id).Select(a => a.Id).ToListAsync(ct);
            var instIds = input.InstallationIds ?? await db.Installations.Where(i => i.EnvironmentId == source.Id).Select(i => i.Id).ToListAsync(ct);
            object? copied = null;
            if (assetIds.Count + instIds.Count > 0)
                copied = await CopyIntoAsync(db, access, clock, source, env, new CloneInput(env.Id, assetIds, instIds, input.Find, input.Replace, input.Lifecycle,
                    input.IncludeVolumes, input.IncludeDeployment, input.CopyVersions, input.VersionEvidence), ct);
            await tx.CommitAsync(ct);
            return Results.Ok(new { environmentId = env.Id, name = env.Name, copied });
        }).WithTags("Environments");
    }

    /// <summary>The copy itself; the caller loads the environments, checks access and owns the transaction.</summary>
    private static async Task<object> CopyIntoAsync(HubDbContext db, HubAccess access, TimeProvider clock, ClientEnvironment source, ClientEnvironment target,
        CloneInput input, CancellationToken ct)
    {
            var assetIds = (input.AssetIds ?? []).Distinct().ToList();
            if (assetIds.Count > 0) access.RequireCreateFor(ResourcePermissions.Servers, target.ClientId);
            if (input.InstallationIds?.Count > 0) access.RequireCreateFor(ResourcePermissions.Installations, target.ClientId);
            var instIds = (input.InstallationIds ?? []).Distinct().ToList();
            var check = new Check()
                .When(target.ClientId != source.ClientId, "targetEnvironmentId", "Copies stay within the same client; choose an environment of this client.")
                .When(assetIds.Count == 0 && instIds.Count == 0, "assetIds", "Select at least one server or installation to copy.")
                .Text("find", input.Find, 100, "Find text").Text("replace", input.Replace, 100, "Replace text");
            // Version evidence is optional (owner decision, 20 Oct 2026).
            check.Text("versionEvidence", input.VersionEvidence, 1000, "Evidence for the copied versions");
            var evidence = Text.Clean(input.VersionEvidence) ?? "";
            check.ThrowIfAny();

            var assets = await db.Assets.AsNoTracking().Include(a => a.Volumes).Where(a => assetIds.Contains(a.Id) && a.EnvironmentId == source.Id).ToListAsync(ct);
            var insts = await db.Installations.AsNoTracking().Where(i => instIds.Contains(i.Id) && i.EnvironmentId == source.Id).ToListAsync(ct);
            if (assets.Count != assetIds.Count || insts.Count != instIds.Count)
                throw new ValidationException("assetIds", "Select servers and installations of the source environment.");
            var lifecycle = input.Lifecycle ?? AssetLifecycle.Planned;
            var skipped = new List<string>();

            // ---- names in the target must be free ----
            var assetNames = assets.ToDictionary(a => a.Id, a => Rename(a.Name, input.Find, input.Replace).Trim());
            var instNames = insts.ToDictionary(i => i.Id, i => Rename(i.InstanceName, input.Find, input.Replace).Trim());
            var clashes = new List<string>();
            foreach (var g in assetNames.Values.GroupBy(Text.Norm).Where(g => g.Count() > 1)) clashes.Add($"Two copies would both be named {g.First()}.");
            var takenAssets = await db.Assets.IgnoreQueryFilters().Where(a => a.EnvironmentId == target.Id && a.ArchivedAt == null).Select(a => a.NormalizedName).ToListAsync(ct);
            clashes.AddRange(assetNames.Values.Where(n => takenAssets.Contains(Text.Norm(n))).Select(n => $"{target.Name} already has a server named {n}."));
            var takenInsts = await db.Installations.IgnoreQueryFilters().Where(i => i.EnvironmentId == target.Id && i.ArchivedAt == null)
                .Select(i => new { i.ProductId, i.NormalizedInstanceName }).ToListAsync(ct);
            clashes.AddRange(insts.Where(i => takenInsts.Any(t => t.ProductId == i.ProductId && t.NormalizedInstanceName == Text.Norm(instNames[i.Id])))
                .Select(i => $"{target.Name} already has an installation named {instNames[i.Id]} of this product."));
            if (assetNames.Values.Any(string.IsNullOrWhiteSpace) || instNames.Values.Any(string.IsNullOrWhiteSpace)) clashes.Add("The find/replace rule leaves a name empty.");
            if (clashes.Count > 0)
                throw new ConflictException("Some copies would clash with existing names. Adjust the find/replace rule.", new() { ["names"] = clashes.Distinct().ToArray() });

            // ---- servers ----
            var sharedIds = assets.SelectMany(a => a.Volumes).Where(v => v.SharedStorageId != null).Select(v => v.SharedStorageId!.Value).Distinct().ToList();
            var sharedEnv = await db.SharedStorages.AsNoTracking().Where(s => sharedIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.EnvironmentId, ct);
            var assetMap = new Dictionary<long, Asset>();
            foreach (var a in assets)
            {
                var copy = new Asset
                {
                    EnvironmentId = target.Id, ClientId = target.ClientId, Name = assetNames[a.Id], NormalizedName = Text.Norm(assetNames[a.Id]), Type = a.Type, TypeCategory = a.TypeCategory, Role = a.Role,
                    NetworkZone = access.Me.SeesTechnical ? a.NetworkZone : null, ProjectPhase = a.ProjectPhase, Lifecycle = lifecycle,
                    OwnerUserId = a.OwnerUserId, TechnicalOwnerName = a.TechnicalOwnerName, TechnicalOwnerContact = a.TechnicalOwnerContact, TechnicalOwnerTitle = a.TechnicalOwnerTitle,
                    TechnicalOwnerOrganization = a.TechnicalOwnerOrganization, TechnicalOwnerPhone = a.TechnicalOwnerPhone, TechnicalOwnerMobile = a.TechnicalOwnerMobile, TechnicalOwnerEmail = a.TechnicalOwnerEmail, ResponsibleParty = a.ResponsibleParty, ResponsibleOrganization = a.ResponsibleOrganization, ResponsibleTeamId = a.ResponsibleTeamId,
                    CoordinatorUserId = a.CoordinatorUserId, CpuQuantity = a.CpuQuantity, CpuUnit = a.CpuUnit, RamQuantity = a.RamQuantity, RamUnit = a.RamUnit,
                    OsFamily = a.OsFamily, OsVersion = a.OsVersion
                };
                if (input.IncludeVolumes)
                    foreach (var v in a.Volumes.Where(v => v.ArchivedAt == null))
                    {
                        // Storage shared at client level stays shared; storage shared inside the source environment is not the target's.
                        var keepShared = v.SharedStorageId is { } s && sharedEnv.TryGetValue(s, out var se) && se is null;
                        if (v.SharedStorageId is not null && !keepShared) skipped.Add($"{copy.Name} / {v.Label}: recorded as dedicated (shared storage {v.SharedStorageId} belongs to {source.Name}).");
                        copy.Volumes.Add(new Volume
                        {
                            EnvironmentId = target.Id, ClientId = target.ClientId, Label = v.Label, Capacity = v.Capacity, Unit = v.Unit, Purpose = v.Purpose,
                            SharedStorageId = keepShared ? v.SharedStorageId : null
                        });
                    }
                db.Assets.Add(copy);
                assetMap[a.Id] = copy;
            }

            // ---- installations ----
            var instMap = new Dictionary<long, Installation>();
            foreach (var i in insts)
            {
                var copy = new Installation
                {
                    EnvironmentId = target.Id, ClientId = target.ClientId, ProductId = i.ProductId, ModuleId = i.ModuleId, InstanceName = instNames[i.Id],
                    NormalizedInstanceName = Text.Norm(instNames[i.Id]), ProductVersionId = input.CopyVersions ? i.ProductVersionId : null,
                    SupportNotes = i.SupportNotes, OwnerUserId = i.OwnerUserId
                };
                db.Installations.Add(copy);
                instMap[i.Id] = copy;
            }

            // ---- components and which server runs them ----
            if (input.IncludeDeployment)
            {
                // Components of copied installations, plus components hosted on copied servers.
                var comps = await db.Components.AsNoTracking().Include(c => c.Hosts).Include(c => c.Installation)
                    .Where(c => c.EnvironmentId == source.Id && (instIds.Contains(c.InstallationId) || c.Hosts.Any(h => assetIds.Contains(h.AssetId)))).ToListAsync(ct);
                var targetInsts = await db.Installations.Where(x => x.EnvironmentId == target.Id).ToListAsync(ct);
                var targetComps = await db.Components.Include(c => c.Hosts).Where(c => c.EnvironmentId == target.Id).ToListAsync(ct);
                foreach (var c in comps)
                {
                    // Where the copy goes: the copied installation, or the matching installation already in the target.
                    Installation? inst = instMap.GetValueOrDefault(c.InstallationId);
                    if (inst is null)
                    {
                        var wanted = Text.Norm(Rename(c.Installation!.InstanceName, input.Find, input.Replace));
                        var sameProduct = targetInsts.Where(x => x.ProductId == c.Installation.ProductId).ToList();
                        inst = sameProduct.FirstOrDefault(x => x.NormalizedInstanceName == wanted) ?? (sameProduct.Count == 1 ? sameProduct[0] : null);
                        if (inst is null)
                        {
                            skipped.Add($"{c.Name}: {target.Name} has no installation of the same product to attach it to; copy the installation too.");
                            continue;
                        }
                    }
                    var hosts = c.Hosts.Where(h => assetMap.ContainsKey(h.AssetId)).ToList();
                    if (hosts.Count == 0 && !instMap.ContainsKey(c.InstallationId)) continue;
                    var comp = inst.Id == 0 ? null : targetComps.FirstOrDefault(x => x.InstallationId == inst.Id && (c.MicroserviceId != null ? x.MicroserviceId == c.MicroserviceId : x.NormalizedName == c.NormalizedName));
                    comp ??= db.Components.Local.FirstOrDefault(x => x.Id == 0 && ReferenceEquals(x.Installation, inst) && (c.MicroserviceId != null ? x.MicroserviceId == c.MicroserviceId : x.NormalizedName == c.NormalizedName));
                    if (comp is null)
                    {
                        access.RequireCreateFor(ResourcePermissions.Servers, target.ClientId);
                        comp = new Component
                        {
                            Installation = inst, EnvironmentId = target.Id, ClientId = target.ClientId, MicroserviceId = c.MicroserviceId, Name = c.Name, NormalizedName = c.NormalizedName,
                            Role = c.Role, ComponentVersion = input.CopyVersions ? c.ComponentVersion : null, OwnerUserId = c.OwnerUserId, ResponsibleParty = c.ResponsibleParty,
                            ResponsibleOrganization = c.ResponsibleOrganization, ResponsibleTeamId = c.ResponsibleTeamId, CoordinatorUserId = c.CoordinatorUserId
                        };
                        db.Components.Add(comp);
                    }
                    else if (hosts.Count > 0)
                        access.RequireMaintain(ResourcePermissions.Servers, target.ClientId, null);
                    foreach (var h in hosts)
                        comp.Hosts.Add(new ComponentHost { Asset = assetMap[h.AssetId], ClientId = target.ClientId, MicroserviceVersionId = input.CopyVersions ? h.MicroserviceVersionId : null });
                    var notCopied = c.Hosts.Where(h => !assetMap.ContainsKey(h.AssetId)).Select(h => h.AssetId).ToList();
                    if (instMap.ContainsKey(c.InstallationId) && notCopied.Count > 0)
                        skipped.Add($"{c.Name}: runs on {notCopied.Count} server(s) that were not copied; choose its servers in {target.Name}.");
                }
            }

            var src = source.Region is null ? source.Name : $"{source.Region.Code} / {source.Name}";
            db.AuditReason = $"Copied from {src}";
            await db.SaveChangesAsync(ct);
            if (input.CopyVersions)
            {
                foreach (var copy in instMap.Values.Where(x => x.ProductVersionId is not null))
                    db.InstallationVersionChanges.Add(new InstallationVersionChange
                    {
                        InstallationId = copy.Id, ClientId = copy.ClientId, ToVersionId = copy.ProductVersionId, Reason = $"Copied from {src}", Evidence = evidence,
                        ChangedById = access.Me.UserId, ChangedAt = clock.GetUtcNow()
                    });
                await db.SaveChangesAsync(ct);
            }
            return new
            {
                targetEnvironmentId = target.Id,
                assets = assets.Select(a => new { sourceId = a.Id, id = assetMap[a.Id].Id, name = assetMap[a.Id].Name }).ToList(),
                installations = insts.Select(i => new { sourceId = i.Id, id = instMap[i.Id].Id, name = instMap[i.Id].InstanceName }).ToList(),
                notes = skipped
            };
    }
}
