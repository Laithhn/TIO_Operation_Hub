using System.Text.Json;
using TioHub.Api.Security;

// Source generation only: no host, database connection, seeding or migrations are executed.
var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));
var manifest = ResourcePermissions.Registry.Select(d => new
{
    key = d.Key, displayName = d.DisplayName, description = d.Description, module = d.Module,
    resource = d.ResourceType, resourceLabel = ResourcePermissions.Catalog.FirstOrDefault(p => p.Key == d.Key)?.ResourceLabel ?? d.DisplayName, parentKey = d.ParentKey,
    action = d.Action, actionLabel = d.DisplayName, nodeType = d.NodeType, displayOrder = d.DisplayOrder,
    riskLevel = d.RiskLevel, supportsScope = d.SupportsScope, isActive = true,
    requires = CapabilityPermissions.Dependencies(d.Key)
}).ToArray();
File.WriteAllText(Path.Combine(root, "src/web/src/permissionManifest.json"), "[\n" + string.Join(",\n", manifest.Select(d => "  " + JsonSerializer.Serialize(d))) + "\n]\n");
// The browser checks prerequisites recursively. Store only direct requirements and refer to
// keys by index so the initial JavaScript does not repeat long permission keys thousands of times.
var keyIndices = manifest.Select((d, i) => (d.key, i)).ToDictionary(x => x.key, x => x.i);
var directRequirements = manifest.Select(d => d.requires
    .Where(required => !d.requires.Any(other => other != required && CapabilityPermissions.Dependencies(other).Contains(required)))
    .Select(required => keyIndices[required]).ToArray()).ToArray();
File.WriteAllText(Path.Combine(root, "src/web/src/permissionRequirements.json"), JsonSerializer.Serialize(new
{
    keys = manifest.Select(d => d.key).ToArray(), requires = directRequirements
}) + "\n");
if (args.Length > 0)
    File.WriteAllText(args[0], JsonSerializer.Serialize(PermissionHierarchy.UpgradeMappings().Select(m => new { source = m.Source, target = m.Target }).Distinct(), new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine($"Generated {manifest.Length} permission definitions.");
