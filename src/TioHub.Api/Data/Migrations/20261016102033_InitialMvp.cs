using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialMvp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "inventory");

            migrationBuilder.EnsureSchema(
                name: "audit");

            migrationBuilder.EnsureSchema(
                name: "work");

            migrationBuilder.EnsureSchema(
                name: "clients");

            migrationBuilder.EnsureSchema(
                name: "env");

            migrationBuilder.EnsureSchema(
                name: "quality");

            migrationBuilder.EnsureSchema(
                name: "network");

            migrationBuilder.EnsureSchema(
                name: "iam");

            migrationBuilder.EnsureSchema(
                name: "teams");

            migrationBuilder.EnsureSchema(
                name: "catalogue");

            migrationBuilder.EnsureSchema(
                name: "admin");

            migrationBuilder.CreateSequence<int>(
                name: "CaseNumbers",
                schema: "work",
                startValue: 1001L);

            migrationBuilder.CreateSequence<int>(
                name: "CommitmentNumbers",
                schema: "work",
                startValue: 1001L);

            migrationBuilder.CreateSequence<int>(
                name: "HandoverNumbers",
                schema: "teams",
                startValue: 101L);

            migrationBuilder.CreateTable(
                name: "AuditEntry",
                schema: "audit",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset(3)", precision: 3, nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Action = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    EntityId = table.Column<long>(type: "bigint", nullable: true),
                    EntityLabel = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Changes = table.Column<string>(type: "nvarchar(max)", maxLength: -1, nullable: true),
                    CorrelationId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEntry", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "User",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AccountName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    WorkingTimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    DeactivatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeactivationReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LastSignInAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    MappedGroups = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    AllClients = table.Column<bool>(type: "bit", nullable: false),
                    AllInternal = table.Column<bool>(type: "bit", nullable: false),
                    Grants = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.Id);
                    table.ForeignKey(
                        name: "FK_User_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_User_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DataQualityItem",
                schema: "quality",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Rule = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    RecordType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RecordId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true),
                    RecordLabel = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Detail = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    NextAction = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    NextReviewAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OpenedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResolutionEvidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataQualityItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DataQualityItem_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DataQualityItem_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DataQualityItem_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DocumentReference",
                schema: "quality",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecordType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RecordId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    ReviewDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentReference", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentReference_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DocumentReference_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DocumentReference_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DocumentReference_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExportLog",
                schema: "audit",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Report = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Filters = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RowCount = table.Column<int>(type: "int", nullable: false),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExportLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExportLog_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GroupMapping",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GroupName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    AllClients = table.Column<bool>(type: "bit", nullable: false),
                    AllInternal = table.Column<bool>(type: "bit", nullable: false),
                    Grants = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupMapping", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupMapping_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupMapping_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraInstance",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ApprovedHost = table.Column<string>(type: "nvarchar(253)", maxLength: 253, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraInstance", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraInstance_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraInstance_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LookupValue",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ListName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsRetired = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LookupValue", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LookupValue_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LookupValue_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Product",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Aliases = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Product", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Product_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Product_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Review",
                schema: "quality",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecordType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RecordId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true),
                    Scope = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Evidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    NextReviewAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Review", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Review_User_ReviewerId",
                        column: x => x.ReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ReviewPolicy",
                schema: "quality",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecordType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    MaxAgeDays = table.Column<int>(type: "int", nullable: true),
                    UsesNextReviewDate = table.Column<bool>(type: "bit", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    PolicyOwnerId = table.Column<long>(type: "bigint", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewPolicy", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewPolicy_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReviewPolicy_User_PolicyOwnerId",
                        column: x => x.PolicyOwnerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReviewPolicy_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Setting",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Setting", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Setting_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Setting_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Team",
                schema: "teams",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    LeadUserId = table.Column<long>(type: "bigint", nullable: true),
                    ManagerUserId = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Team", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Team_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Team_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Team_User_LeadUserId",
                        column: x => x.LeadUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Team_User_ManagerUserId",
                        column: x => x.ManagerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Team_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserRole",
                schema: "iam",
                columns: table => new
                {
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRole", x => new { x.UserId, x.Role });
                    table.ForeignKey(
                        name: "FK_UserRole_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProductModule",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductModule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductModule_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductModule_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductModule_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProductVersion",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    Version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SortKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReleasedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVersion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVersion_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductVersion_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductVersion_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Client",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CountryUnknown = table.Column<bool>(type: "bit", nullable: false),
                    CountryFollowUpOwnerId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ParentOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Partner = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    ResponsibleParty = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResponsibleOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ResponsibleTeamId = table.Column<long>(type: "bigint", nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    NextReviewAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Client", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Client_Team_ResponsibleTeamId",
                        column: x => x.ResponsibleTeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Client_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Client_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Client_User_CountryFollowUpOwnerId",
                        column: x => x.CountryFollowUpOwnerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Client_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Client_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Client_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TeamMember",
                schema: "teams",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeamId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    TeamRole = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Skills = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ProductFamiliarity = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamMember", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamMember_Team_TeamId",
                        column: x => x.TeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TeamMember_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TeamMember_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TeamMember_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Case",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ref = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValueSql: "CONCAT('CS-', NEXT VALUE FOR [work].[CaseNumbers])"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ResponsibleTeamId = table.Column<long>(type: "bigint", nullable: true),
                    ImpactSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    BackupOwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    ResponsibleParty = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResponsibleOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ProgressSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    WaitingReason = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    WaitingSince = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    NextAction = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    NextReviewAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DueAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DueTimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    UnknownEnvironmentReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ValidationRequest = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Outcome = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ValidationEvidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    EvidenceExceptionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    EvidenceExceptionApprovedById = table.Column<long>(type: "bigint", nullable: true),
                    EvidenceExceptionFollowUpOwnerId = table.Column<long>(type: "bigint", nullable: true),
                    EvidenceExceptionFollowUpDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CancelReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ClosedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CancelledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReopenCount = table.Column<int>(type: "int", nullable: false),
                    CycleStartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Case", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Case_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_Team_ResponsibleTeamId",
                        column: x => x.ResponsibleTeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_User_BackupOwnerUserId",
                        column: x => x.BackupOwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_User_EvidenceExceptionApprovedById",
                        column: x => x.EvidenceExceptionApprovedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_User_EvidenceExceptionFollowUpOwnerId",
                        column: x => x.EvidenceExceptionFollowUpOwnerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Case_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Handover",
                schema: "teams",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ref = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValueSql: "CONCAT('HO-', NEXT VALUE FOR [teams].[HandoverNumbers])"),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    OutgoingOwnerId = table.Column<long>(type: "bigint", nullable: false),
                    ReceivingOwnerId = table.Column<long>(type: "bigint", nullable: false),
                    EffectiveAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    OutstandingActions = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DocumentationNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    AcknowledgedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AcknowledgmentNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ExceptionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ExceptionApprovedById = table.Column<long>(type: "bigint", nullable: true),
                    ExceptionFollowUpOwnerId = table.Column<long>(type: "bigint", nullable: true),
                    ExceptionFollowUpDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CancelReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Handover", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Handover_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Handover_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Handover_User_ExceptionApprovedById",
                        column: x => x.ExceptionApprovedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Handover_User_ExceptionFollowUpOwnerId",
                        column: x => x.ExceptionFollowUpOwnerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Handover_User_OutgoingOwnerId",
                        column: x => x.OutgoingOwnerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Handover_User_ReceivingOwnerId",
                        column: x => x.ReceivingOwnerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Handover_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "NetworkContext",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NetworkContext", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NetworkContext_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NetworkContext_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NetworkContext_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NetworkContext_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Project",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ScopeSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ServiceStart = table.Column<DateOnly>(type: "date", nullable: true),
                    ServiceEnd = table.Column<DateOnly>(type: "date", nullable: true),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Project", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Project_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Project_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Project_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Project_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Project_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Region",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Region", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Region_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Region_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Region_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Region_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Region_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CaseEvent",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FromValue = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    ToValue = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ById = table.Column<long>(type: "bigint", nullable: true),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseEvent", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaseEvent_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CaseEvent_User_ById",
                        column: x => x.ById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CaseWaitingInterval",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    StartedById = table.Column<long>(type: "bigint", nullable: true),
                    EndedById = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseWaitingInterval", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaseWaitingInterval_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraReference",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    JiraInstanceId = table.Column<long>(type: "bigint", nullable: false),
                    IssueKey = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ReuseReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RemovedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RemovedById = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraReference", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraReference_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraReference_JiraInstance_JiraInstanceId",
                        column: x => x.JiraInstanceId,
                        principalSchema: "work",
                        principalTable: "JiraInstance",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraReference_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraReference_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "HandoverItem",
                schema: "teams",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HandoverId = table.Column<long>(type: "bigint", nullable: false),
                    RecordType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RecordId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    Label = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    PreviousOwnerId = table.Column<long>(type: "bigint", nullable: true),
                    Applied = table.Column<bool>(type: "bit", nullable: false),
                    NotAppliedReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HandoverItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HandoverItem_Handover_HandoverId",
                        column: x => x.HandoverId,
                        principalSchema: "teams",
                        principalTable: "Handover",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Commitment",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ref = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValueSql: "CONCAT('CM-', NEXT VALUE FOR [work].[CommitmentNumbers])"),
                    Scope = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ResponsibleTeamId = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    ResponsibleParty = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResponsibleOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    OriginalDueAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CurrentDueAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    TimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    NextReviewAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletionEvidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DueAtCompletion = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedLate = table.Column<bool>(type: "bit", nullable: true),
                    CancelReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CaseId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    RevisionCount = table.Column<int>(type: "int", nullable: false),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Commitment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Commitment_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Commitment_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Commitment_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Commitment_Team_ResponsibleTeamId",
                        column: x => x.ResponsibleTeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Commitment_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Commitment_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Commitment_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Commitment_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Contact",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Organization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    AuthorizedSupport = table.Column<bool>(type: "bit", nullable: false),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    Responsibility = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contact", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contact_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contact_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contact_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contact_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contact_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GroupMappingScope",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GroupMappingId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupMappingScope", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupMappingScope_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupMappingScope_GroupMapping_GroupMappingId",
                        column: x => x.GroupMappingId,
                        principalSchema: "iam",
                        principalTable: "GroupMapping",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupMappingScope_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupMappingScope_Team_TeamId",
                        column: x => x.TeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProjectProduct",
                schema: "clients",
                columns: table => new
                {
                    ProjectId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectProduct", x => new { x.ProjectId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_ProjectProduct_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectProduct_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserScope",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserScope", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserScope_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserScope_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserScope_Team_TeamId",
                        column: x => x.TeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserScope_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Environment",
                schema: "env",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    RegionId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RegionScope = table.Column<long>(type: "bigint", nullable: false, computedColumnSql: "ISNULL([RegionId], 0)", stored: true),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    TypeDescription = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Hosting = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Location = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Criticality = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    BackupOwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    BackupGapReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ResponsibleParty = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResponsibleOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ResponsibleTeamId = table.Column<long>(type: "bigint", nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Condition = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ConditionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ConditionObservedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ConditionReportId = table.Column<long>(type: "bigint", nullable: true),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    InventoryReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DependenciesReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    NextReviewAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Environment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Environment_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_Region_RegionId",
                        column: x => x.RegionId,
                        principalSchema: "clients",
                        principalTable: "Region",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_Team_ResponsibleTeamId",
                        column: x => x.ResponsibleTeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_User_BackupOwnerUserId",
                        column: x => x.BackupOwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Environment_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CommitmentEvent",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommitmentId = table.Column<long>(type: "bigint", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    PreviousDueAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    NewDueAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Evidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ById = table.Column<long>(type: "bigint", nullable: true),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommitmentEvent", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommitmentEvent_Commitment_CommitmentId",
                        column: x => x.CommitmentId,
                        principalSchema: "work",
                        principalTable: "Commitment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CommitmentEvent_User_ById",
                        column: x => x.ById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Asset",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    NetworkZone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ProjectPhase = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Lifecycle = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    ResponsibleParty = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResponsibleOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ResponsibleTeamId = table.Column<long>(type: "bigint", nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    CpuQuantity = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    CpuUnit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    RamQuantity = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    RamUnit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    OsFamily = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OsVersion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    VerifiedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SourceDocument = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceSheet = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SourceRange = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SourceNotation = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    TranscribedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SourceReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Asset", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Asset_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_Team_ResponsibleTeamId",
                        column: x => x.ResponsibleTeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_User_SourceReviewerId",
                        column: x => x.SourceReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Asset_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CaseEnvironment",
                schema: "work",
                columns: table => new
                {
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseEnvironment", x => new { x.CaseId, x.EnvironmentId });
                    table.ForeignKey(
                        name: "FK_CaseEnvironment_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CaseEnvironment_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ConditionReport",
                schema: "env",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Condition = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Evidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ObservedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RecordedById = table.Column<long>(type: "bigint", nullable: true),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConditionReport", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConditionReport_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ConditionReport_User_RecordedById",
                        column: x => x.RecordedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Installation",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: true),
                    InstanceName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NormalizedInstanceName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProductVersionId = table.Column<long>(type: "bigint", nullable: true),
                    DeployedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    SupportNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SourceDocument = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceSheet = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SourceRange = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SourceNotation = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    TranscribedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SourceReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Installation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Installation_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_ProductModule_ModuleId",
                        column: x => x.ModuleId,
                        principalSchema: "catalogue",
                        principalTable: "ProductModule",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_ProductVersion_ProductVersionId",
                        column: x => x.ProductVersionId,
                        principalSchema: "catalogue",
                        principalTable: "ProductVersion",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_User_SourceReviewerId",
                        column: x => x.SourceReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Installation_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ResponsibilityBoundary",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    Area = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Party = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Organization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ContactId = table.Column<long>(type: "bigint", nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Evidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsibilityBoundary", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponsibilityBoundary_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ResponsibilityBoundary_Contact_ContactId",
                        column: x => x.ContactId,
                        principalSchema: "clients",
                        principalTable: "Contact",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ResponsibilityBoundary_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ResponsibilityBoundary_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ResponsibilityBoundary_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ResponsibilityBoundary_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ResponsibilityBoundary_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SharedStorage",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Capacity = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SharedStorage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SharedStorage_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SharedStorage_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SharedStorage_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SharedStorage_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SharedStorage_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CaseAsset",
                schema: "work",
                columns: table => new
                {
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    AssetId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseAsset", x => new { x.CaseId, x.AssetId });
                    table.ForeignKey(
                        name: "FK_CaseAsset_Asset_AssetId",
                        column: x => x.AssetId,
                        principalSchema: "inventory",
                        principalTable: "Asset",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CaseAsset_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Component",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstallationId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ComponentVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    ResponsibleParty = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResponsibleOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ResponsibleTeamId = table.Column<long>(type: "bigint", nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Component", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Component_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Component_Installation_InstallationId",
                        column: x => x.InstallationId,
                        principalSchema: "catalogue",
                        principalTable: "Installation",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Component_Team_ResponsibleTeamId",
                        column: x => x.ResponsibleTeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Component_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Component_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Component_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Component_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Component_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InstallationVersionChange",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstallationId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    FromVersionId = table.Column<long>(type: "bigint", nullable: true),
                    ToVersionId = table.Column<long>(type: "bigint", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Evidence = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DeployedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    ChangedById = table.Column<long>(type: "bigint", nullable: true),
                    ChangedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstallationVersionChange", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InstallationVersionChange_Installation_InstallationId",
                        column: x => x.InstallationId,
                        principalSchema: "catalogue",
                        principalTable: "Installation",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstallationVersionChange_ProductVersion_FromVersionId",
                        column: x => x.FromVersionId,
                        principalSchema: "catalogue",
                        principalTable: "ProductVersion",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstallationVersionChange_ProductVersion_ToVersionId",
                        column: x => x.ToVersionId,
                        principalSchema: "catalogue",
                        principalTable: "ProductVersion",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstallationVersionChange_User_ChangedById",
                        column: x => x.ChangedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Volume",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssetId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Capacity = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SharedStorageId = table.Column<long>(type: "bigint", nullable: true),
                    SourceDocument = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceSheet = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SourceRange = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SourceNotation = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    TranscribedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SourceReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Volume", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Volume_Asset_AssetId",
                        column: x => x.AssetId,
                        principalSchema: "inventory",
                        principalTable: "Asset",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Volume_SharedStorage_SharedStorageId",
                        column: x => x.SharedStorageId,
                        principalSchema: "inventory",
                        principalTable: "SharedStorage",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Volume_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Volume_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Volume_User_SourceReviewerId",
                        column: x => x.SourceReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Volume_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CaseComponent",
                schema: "work",
                columns: table => new
                {
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    ComponentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseComponent", x => new { x.CaseId, x.ComponentId });
                    table.ForeignKey(
                        name: "FK_CaseComponent_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CaseComponent_Component_ComponentId",
                        column: x => x.ComponentId,
                        principalSchema: "inventory",
                        principalTable: "Component",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ComponentHost",
                schema: "inventory",
                columns: table => new
                {
                    ComponentId = table.Column<long>(type: "bigint", nullable: false),
                    AssetId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComponentHost", x => new { x.ComponentId, x.AssetId });
                    table.ForeignKey(
                        name: "FK_ComponentHost_Asset_AssetId",
                        column: x => x.AssetId,
                        principalSchema: "inventory",
                        principalTable: "Asset",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ComponentHost_Component_ComponentId",
                        column: x => x.ComponentId,
                        principalSchema: "inventory",
                        principalTable: "Component",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Endpoint",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    NetworkContextId = table.Column<long>(type: "bigint", nullable: false),
                    Zone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Hostname = table.Column<string>(type: "nvarchar(253)", maxLength: 253, nullable: true),
                    AssetId = table.Column<long>(type: "bigint", nullable: true),
                    ComponentId = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SourceDocument = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceSheet = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SourceRange = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SourceNotation = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    TranscribedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SourceReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Endpoint", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Endpoint_Asset_AssetId",
                        column: x => x.AssetId,
                        principalSchema: "inventory",
                        principalTable: "Asset",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_Component_ComponentId",
                        column: x => x.ComponentId,
                        principalSchema: "inventory",
                        principalTable: "Component",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_NetworkContext_NetworkContextId",
                        column: x => x.NetworkContextId,
                        principalSchema: "network",
                        principalTable: "NetworkContext",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_SourceReviewerId",
                        column: x => x.SourceReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Dependency",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    SourceEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    DestinationEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    Protocol = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Ports = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ProtocolExplanation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Direction = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    PairExpansionConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PairExpansionConfirmedById = table.Column<long>(type: "bigint", nullable: true),
                    SamePairReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SourceDocument = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceSheet = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SourceRange = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SourceNotation = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    TranscribedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SourceReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dependency", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Dependency_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_Endpoint_DestinationEndpointId",
                        column: x => x.DestinationEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_Endpoint_SourceEndpointId",
                        column: x => x.SourceEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_SourceReviewerId",
                        column: x => x.SourceReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EndpointAddress",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EndpointId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    NetworkContextId = table.Column<long>(type: "bigint", nullable: false),
                    Address = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    NatTarget = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EndpointAddress", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EndpointAddress_Endpoint_EndpointId",
                        column: x => x.EndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EndpointAddress_NetworkContext_NetworkContextId",
                        column: x => x.NetworkContextId,
                        principalSchema: "network",
                        principalTable: "NetworkContext",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EndpointGroupMember",
                schema: "network",
                columns: table => new
                {
                    GroupEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    MemberEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EndpointGroupMember", x => new { x.GroupEndpointId, x.MemberEndpointId });
                    table.ForeignKey(
                        name: "FK_EndpointGroupMember_Endpoint_GroupEndpointId",
                        column: x => x.GroupEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EndpointGroupMember_Endpoint_MemberEndpointId",
                        column: x => x.MemberEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CaseDependency",
                schema: "work",
                columns: table => new
                {
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    DependencyId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseDependency", x => new { x.CaseId, x.DependencyId });
                    table.ForeignKey(
                        name: "FK_CaseDependency_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CaseDependency_Dependency_DependencyId",
                        column: x => x.DependencyId,
                        principalSchema: "network",
                        principalTable: "Dependency",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DependencyComponent",
                schema: "network",
                columns: table => new
                {
                    DependencyId = table.Column<long>(type: "bigint", nullable: false),
                    ComponentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DependencyComponent", x => new { x.DependencyId, x.ComponentId });
                    table.ForeignKey(
                        name: "FK_DependencyComponent_Component_ComponentId",
                        column: x => x.ComponentId,
                        principalSchema: "inventory",
                        principalTable: "Component",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DependencyComponent_Dependency_DependencyId",
                        column: x => x.DependencyId,
                        principalSchema: "network",
                        principalTable: "Dependency",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Asset_ArchivedById",
                schema: "inventory",
                table: "Asset",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_ClientId",
                schema: "inventory",
                table: "Asset",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_CoordinatorUserId",
                schema: "inventory",
                table: "Asset",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_CreatedById",
                schema: "inventory",
                table: "Asset",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_EnvironmentId_NormalizedName",
                schema: "inventory",
                table: "Asset",
                columns: new[] { "EnvironmentId", "NormalizedName" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_OwnerUserId",
                schema: "inventory",
                table: "Asset",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_ResponsibleTeamId",
                schema: "inventory",
                table: "Asset",
                column: "ResponsibleTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_SourceReviewerId",
                schema: "inventory",
                table: "Asset",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_UpdatedById",
                schema: "inventory",
                table: "Asset",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntry_At",
                schema: "audit",
                table: "AuditEntry",
                column: "At");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntry_ClientId",
                schema: "audit",
                table: "AuditEntry",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntry_EntityType_EntityId",
                schema: "audit",
                table: "AuditEntry",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_Case_BackupOwnerUserId",
                schema: "work",
                table: "Case",
                column: "BackupOwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Case_ClientId",
                schema: "work",
                table: "Case",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Case_CoordinatorUserId",
                schema: "work",
                table: "Case",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Case_CreatedById",
                schema: "work",
                table: "Case",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Case_EvidenceExceptionApprovedById",
                schema: "work",
                table: "Case",
                column: "EvidenceExceptionApprovedById");

            migrationBuilder.CreateIndex(
                name: "IX_Case_EvidenceExceptionFollowUpOwnerId",
                schema: "work",
                table: "Case",
                column: "EvidenceExceptionFollowUpOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Case_OwnerUserId",
                schema: "work",
                table: "Case",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Case_Ref",
                schema: "work",
                table: "Case",
                column: "Ref",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Case_ResponsibleTeamId",
                schema: "work",
                table: "Case",
                column: "ResponsibleTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Case_Status_DueAt",
                schema: "work",
                table: "Case",
                columns: new[] { "Status", "DueAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Case_UpdatedById",
                schema: "work",
                table: "Case",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_CaseAsset_AssetId",
                schema: "work",
                table: "CaseAsset",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_CaseComponent_ComponentId",
                schema: "work",
                table: "CaseComponent",
                column: "ComponentId");

            migrationBuilder.CreateIndex(
                name: "IX_CaseDependency_DependencyId",
                schema: "work",
                table: "CaseDependency",
                column: "DependencyId");

            migrationBuilder.CreateIndex(
                name: "IX_CaseEnvironment_EnvironmentId",
                schema: "work",
                table: "CaseEnvironment",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_CaseEvent_ById",
                schema: "work",
                table: "CaseEvent",
                column: "ById");

            migrationBuilder.CreateIndex(
                name: "IX_CaseEvent_CaseId_At",
                schema: "work",
                table: "CaseEvent",
                columns: new[] { "CaseId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_CaseWaitingInterval_CaseId",
                schema: "work",
                table: "CaseWaitingInterval",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Client_ArchivedById",
                schema: "clients",
                table: "Client",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Client_Code",
                schema: "clients",
                table: "Client",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Client_CoordinatorUserId",
                schema: "clients",
                table: "Client",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Client_CountryFollowUpOwnerId",
                schema: "clients",
                table: "Client",
                column: "CountryFollowUpOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Client_CreatedById",
                schema: "clients",
                table: "Client",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Client_OwnerUserId",
                schema: "clients",
                table: "Client",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Client_ResponsibleTeamId",
                schema: "clients",
                table: "Client",
                column: "ResponsibleTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Client_UpdatedById",
                schema: "clients",
                table: "Client",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_CaseId",
                schema: "work",
                table: "Commitment",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_ClientId",
                schema: "work",
                table: "Commitment",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_CoordinatorUserId",
                schema: "work",
                table: "Commitment",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_CreatedById",
                schema: "work",
                table: "Commitment",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_OwnerUserId",
                schema: "work",
                table: "Commitment",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_ProjectId",
                schema: "work",
                table: "Commitment",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_Ref",
                schema: "work",
                table: "Commitment",
                column: "Ref",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_ResponsibleTeamId",
                schema: "work",
                table: "Commitment",
                column: "ResponsibleTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_Status_CurrentDueAt",
                schema: "work",
                table: "Commitment",
                columns: new[] { "Status", "CurrentDueAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_UpdatedById",
                schema: "work",
                table: "Commitment",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_CommitmentEvent_ById",
                schema: "work",
                table: "CommitmentEvent",
                column: "ById");

            migrationBuilder.CreateIndex(
                name: "IX_CommitmentEvent_CommitmentId",
                schema: "work",
                table: "CommitmentEvent",
                column: "CommitmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Component_ArchivedById",
                schema: "inventory",
                table: "Component",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Component_CoordinatorUserId",
                schema: "inventory",
                table: "Component",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Component_CreatedById",
                schema: "inventory",
                table: "Component",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Component_EnvironmentId",
                schema: "inventory",
                table: "Component",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Component_InstallationId_NormalizedName",
                schema: "inventory",
                table: "Component",
                columns: new[] { "InstallationId", "NormalizedName" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Component_OwnerUserId",
                schema: "inventory",
                table: "Component",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Component_ResponsibleTeamId",
                schema: "inventory",
                table: "Component",
                column: "ResponsibleTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Component_UpdatedById",
                schema: "inventory",
                table: "Component",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ComponentHost_AssetId",
                schema: "inventory",
                table: "ComponentHost",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_ConditionReport_EnvironmentId_ObservedAt",
                schema: "env",
                table: "ConditionReport",
                columns: new[] { "EnvironmentId", "ObservedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ConditionReport_RecordedById",
                schema: "env",
                table: "ConditionReport",
                column: "RecordedById");

            migrationBuilder.CreateIndex(
                name: "IX_Contact_ArchivedById",
                schema: "clients",
                table: "Contact",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Contact_ClientId",
                schema: "clients",
                table: "Contact",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Contact_CreatedById",
                schema: "clients",
                table: "Contact",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Contact_ProjectId",
                schema: "clients",
                table: "Contact",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Contact_UpdatedById",
                schema: "clients",
                table: "Contact",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_DataQualityItem_CoordinatorUserId",
                schema: "quality",
                table: "DataQualityItem",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DataQualityItem_CreatedById",
                schema: "quality",
                table: "DataQualityItem",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_DataQualityItem_Rule_RecordType_RecordId",
                schema: "quality",
                table: "DataQualityItem",
                columns: new[] { "Rule", "RecordType", "RecordId" },
                unique: true,
                filter: "[Status] = 'Open'");

            migrationBuilder.CreateIndex(
                name: "IX_DataQualityItem_Status_ClientId",
                schema: "quality",
                table: "DataQualityItem",
                columns: new[] { "Status", "ClientId" });

            migrationBuilder.CreateIndex(
                name: "IX_DataQualityItem_UpdatedById",
                schema: "quality",
                table: "DataQualityItem",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_ArchivedById",
                schema: "network",
                table: "Dependency",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_ClientId",
                schema: "network",
                table: "Dependency",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_CoordinatorUserId",
                schema: "network",
                table: "Dependency",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_CreatedById",
                schema: "network",
                table: "Dependency",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_DestinationEndpointId",
                schema: "network",
                table: "Dependency",
                column: "DestinationEndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_EnvironmentId",
                schema: "network",
                table: "Dependency",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_OwnerUserId",
                schema: "network",
                table: "Dependency",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_SourceEndpointId",
                schema: "network",
                table: "Dependency",
                column: "SourceEndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_SourceReviewerId",
                schema: "network",
                table: "Dependency",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_UpdatedById",
                schema: "network",
                table: "Dependency",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_DependencyComponent_ComponentId",
                schema: "network",
                table: "DependencyComponent",
                column: "ComponentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentReference_ArchivedById",
                schema: "quality",
                table: "DocumentReference",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentReference_CreatedById",
                schema: "quality",
                table: "DocumentReference",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentReference_OwnerUserId",
                schema: "quality",
                table: "DocumentReference",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentReference_RecordType_RecordId",
                schema: "quality",
                table: "DocumentReference",
                columns: new[] { "RecordType", "RecordId" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentReference_UpdatedById",
                schema: "quality",
                table: "DocumentReference",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_ArchivedById",
                schema: "network",
                table: "Endpoint",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_AssetId",
                schema: "network",
                table: "Endpoint",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_ClientId_NetworkContextId_Name",
                schema: "network",
                table: "Endpoint",
                columns: new[] { "ClientId", "NetworkContextId", "Name" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_ComponentId",
                schema: "network",
                table: "Endpoint",
                column: "ComponentId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_CreatedById",
                schema: "network",
                table: "Endpoint",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_EnvironmentId",
                schema: "network",
                table: "Endpoint",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_NetworkContextId",
                schema: "network",
                table: "Endpoint",
                column: "NetworkContextId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_SourceReviewerId",
                schema: "network",
                table: "Endpoint",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_UpdatedById",
                schema: "network",
                table: "Endpoint",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_EndpointAddress_EndpointId",
                schema: "network",
                table: "EndpointAddress",
                column: "EndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_EndpointAddress_NetworkContextId_Address",
                schema: "network",
                table: "EndpointAddress",
                columns: new[] { "NetworkContextId", "Address" });

            migrationBuilder.CreateIndex(
                name: "IX_EndpointGroupMember_MemberEndpointId",
                schema: "network",
                table: "EndpointGroupMember",
                column: "MemberEndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_ArchivedById",
                schema: "env",
                table: "Environment",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_BackupOwnerUserId",
                schema: "env",
                table: "Environment",
                column: "BackupOwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_ClientId_RegionScope_NormalizedName",
                schema: "env",
                table: "Environment",
                columns: new[] { "ClientId", "RegionScope", "NormalizedName" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_CoordinatorUserId",
                schema: "env",
                table: "Environment",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_CreatedById",
                schema: "env",
                table: "Environment",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_OwnerUserId",
                schema: "env",
                table: "Environment",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_ProjectId",
                schema: "env",
                table: "Environment",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_RegionId",
                schema: "env",
                table: "Environment",
                column: "RegionId");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_ResponsibleTeamId",
                schema: "env",
                table: "Environment",
                column: "ResponsibleTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Environment_UpdatedById",
                schema: "env",
                table: "Environment",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ExportLog_UserId",
                schema: "audit",
                table: "ExportLog",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMapping_CreatedById",
                schema: "iam",
                table: "GroupMapping",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMapping_GroupName",
                schema: "iam",
                table: "GroupMapping",
                column: "GroupName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GroupMapping_UpdatedById",
                schema: "iam",
                table: "GroupMapping",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMappingScope_ClientId",
                schema: "iam",
                table: "GroupMappingScope",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMappingScope_GroupMappingId",
                schema: "iam",
                table: "GroupMappingScope",
                column: "GroupMappingId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMappingScope_ProjectId",
                schema: "iam",
                table: "GroupMappingScope",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMappingScope_TeamId",
                schema: "iam",
                table: "GroupMappingScope",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Handover_ClientId",
                schema: "teams",
                table: "Handover",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Handover_CreatedById",
                schema: "teams",
                table: "Handover",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Handover_ExceptionApprovedById",
                schema: "teams",
                table: "Handover",
                column: "ExceptionApprovedById");

            migrationBuilder.CreateIndex(
                name: "IX_Handover_ExceptionFollowUpOwnerId",
                schema: "teams",
                table: "Handover",
                column: "ExceptionFollowUpOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Handover_OutgoingOwnerId",
                schema: "teams",
                table: "Handover",
                column: "OutgoingOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Handover_ReceivingOwnerId",
                schema: "teams",
                table: "Handover",
                column: "ReceivingOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Handover_Ref",
                schema: "teams",
                table: "Handover",
                column: "Ref",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Handover_UpdatedById",
                schema: "teams",
                table: "Handover",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_HandoverItem_HandoverId",
                schema: "teams",
                table: "HandoverItem",
                column: "HandoverId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_ArchivedById",
                schema: "catalogue",
                table: "Installation",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_ClientId",
                schema: "catalogue",
                table: "Installation",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_CreatedById",
                schema: "catalogue",
                table: "Installation",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_EnvironmentId_ProductId_NormalizedInstanceName",
                schema: "catalogue",
                table: "Installation",
                columns: new[] { "EnvironmentId", "ProductId", "NormalizedInstanceName" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_ModuleId",
                schema: "catalogue",
                table: "Installation",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_OwnerUserId",
                schema: "catalogue",
                table: "Installation",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_ProductId",
                schema: "catalogue",
                table: "Installation",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_ProductVersionId",
                schema: "catalogue",
                table: "Installation",
                column: "ProductVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_SourceReviewerId",
                schema: "catalogue",
                table: "Installation",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_UpdatedById",
                schema: "catalogue",
                table: "Installation",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_InstallationVersionChange_ChangedById",
                schema: "catalogue",
                table: "InstallationVersionChange",
                column: "ChangedById");

            migrationBuilder.CreateIndex(
                name: "IX_InstallationVersionChange_FromVersionId",
                schema: "catalogue",
                table: "InstallationVersionChange",
                column: "FromVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_InstallationVersionChange_InstallationId",
                schema: "catalogue",
                table: "InstallationVersionChange",
                column: "InstallationId");

            migrationBuilder.CreateIndex(
                name: "IX_InstallationVersionChange_ToVersionId",
                schema: "catalogue",
                table: "InstallationVersionChange",
                column: "ToVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_JiraInstance_CreatedById",
                schema: "work",
                table: "JiraInstance",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraInstance_Name",
                schema: "work",
                table: "JiraInstance",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraInstance_UpdatedById",
                schema: "work",
                table: "JiraInstance",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraReference_CaseId_JiraInstanceId_IssueKey",
                schema: "work",
                table: "JiraReference",
                columns: new[] { "CaseId", "JiraInstanceId", "IssueKey" },
                unique: true,
                filter: "[RemovedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_JiraReference_CreatedById",
                schema: "work",
                table: "JiraReference",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraReference_JiraInstanceId_IssueKey",
                schema: "work",
                table: "JiraReference",
                columns: new[] { "JiraInstanceId", "IssueKey" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraReference_UpdatedById",
                schema: "work",
                table: "JiraReference",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_LookupValue_CreatedById",
                schema: "admin",
                table: "LookupValue",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_LookupValue_ListName_Code",
                schema: "admin",
                table: "LookupValue",
                columns: new[] { "ListName", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LookupValue_UpdatedById",
                schema: "admin",
                table: "LookupValue",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_ArchivedById",
                schema: "network",
                table: "NetworkContext",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_ClientId_Name",
                schema: "network",
                table: "NetworkContext",
                columns: new[] { "ClientId", "Name" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_CreatedById",
                schema: "network",
                table: "NetworkContext",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_UpdatedById",
                schema: "network",
                table: "NetworkContext",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Product_Code",
                schema: "catalogue",
                table: "Product",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Product_CreatedById",
                schema: "catalogue",
                table: "Product",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Product_UpdatedById",
                schema: "catalogue",
                table: "Product",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProductModule_CreatedById",
                schema: "catalogue",
                table: "ProductModule",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProductModule_ProductId_Code",
                schema: "catalogue",
                table: "ProductModule",
                columns: new[] { "ProductId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductModule_UpdatedById",
                schema: "catalogue",
                table: "ProductModule",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVersion_CreatedById",
                schema: "catalogue",
                table: "ProductVersion",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVersion_ProductId_Version",
                schema: "catalogue",
                table: "ProductVersion",
                columns: new[] { "ProductId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductVersion_UpdatedById",
                schema: "catalogue",
                table: "ProductVersion",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Project_ArchivedById",
                schema: "clients",
                table: "Project",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Project_ClientId",
                schema: "clients",
                table: "Project",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Project_Code",
                schema: "clients",
                table: "Project",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Project_CreatedById",
                schema: "clients",
                table: "Project",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Project_OwnerUserId",
                schema: "clients",
                table: "Project",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Project_UpdatedById",
                schema: "clients",
                table: "Project",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectProduct_ProductId",
                schema: "clients",
                table: "ProjectProduct",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Region_ArchivedById",
                schema: "clients",
                table: "Region",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Region_ClientId_Code",
                schema: "clients",
                table: "Region",
                columns: new[] { "ClientId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Region_CreatedById",
                schema: "clients",
                table: "Region",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Region_OwnerUserId",
                schema: "clients",
                table: "Region",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Region_UpdatedById",
                schema: "clients",
                table: "Region",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_ArchivedById",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_ClientId",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_ContactId",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "ContactId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_CoordinatorUserId",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_CreatedById",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_EnvironmentId",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_UpdatedById",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Review_RecordType_RecordId_Scope_ReviewedAt",
                schema: "quality",
                table: "Review",
                columns: new[] { "RecordType", "RecordId", "Scope", "ReviewedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Review_ReviewerId",
                schema: "quality",
                table: "Review",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewPolicy_CreatedById",
                schema: "quality",
                table: "ReviewPolicy",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewPolicy_PolicyOwnerId",
                schema: "quality",
                table: "ReviewPolicy",
                column: "PolicyOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewPolicy_RecordType_Scope",
                schema: "quality",
                table: "ReviewPolicy",
                columns: new[] { "RecordType", "Scope" },
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewPolicy_UpdatedById",
                schema: "quality",
                table: "ReviewPolicy",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Setting_CreatedById",
                schema: "admin",
                table: "Setting",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Setting_Key",
                schema: "admin",
                table: "Setting",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Setting_UpdatedById",
                schema: "admin",
                table: "Setting",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_SharedStorage_ArchivedById",
                schema: "inventory",
                table: "SharedStorage",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_SharedStorage_ClientId_Name",
                schema: "inventory",
                table: "SharedStorage",
                columns: new[] { "ClientId", "Name" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SharedStorage_CreatedById",
                schema: "inventory",
                table: "SharedStorage",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_SharedStorage_EnvironmentId",
                schema: "inventory",
                table: "SharedStorage",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedStorage_UpdatedById",
                schema: "inventory",
                table: "SharedStorage",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Team_ArchivedById",
                schema: "teams",
                table: "Team",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Team_Code",
                schema: "teams",
                table: "Team",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Team_CreatedById",
                schema: "teams",
                table: "Team",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Team_LeadUserId",
                schema: "teams",
                table: "Team",
                column: "LeadUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Team_ManagerUserId",
                schema: "teams",
                table: "Team",
                column: "ManagerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Team_UpdatedById",
                schema: "teams",
                table: "Team",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMember_CreatedById",
                schema: "teams",
                table: "TeamMember",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMember_TeamId_UserId",
                schema: "teams",
                table: "TeamMember",
                columns: new[] { "TeamId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamMember_UpdatedById",
                schema: "teams",
                table: "TeamMember",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMember_UserId",
                schema: "teams",
                table: "TeamMember",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_User_AccountName",
                schema: "iam",
                table: "User",
                column: "AccountName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_User_CreatedById",
                schema: "iam",
                table: "User",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_User_UpdatedById",
                schema: "iam",
                table: "User",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_UserScope_ClientId",
                schema: "iam",
                table: "UserScope",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_UserScope_ProjectId",
                schema: "iam",
                table: "UserScope",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_UserScope_TeamId",
                schema: "iam",
                table: "UserScope",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_UserScope_UserId",
                schema: "iam",
                table: "UserScope",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Volume_ArchivedById",
                schema: "inventory",
                table: "Volume",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Volume_AssetId_Label",
                schema: "inventory",
                table: "Volume",
                columns: new[] { "AssetId", "Label" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Volume_CreatedById",
                schema: "inventory",
                table: "Volume",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Volume_SharedStorageId",
                schema: "inventory",
                table: "Volume",
                column: "SharedStorageId");

            migrationBuilder.CreateIndex(
                name: "IX_Volume_SourceReviewerId",
                schema: "inventory",
                table: "Volume",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Volume_UpdatedById",
                schema: "inventory",
                table: "Volume",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditEntry",
                schema: "audit");

            migrationBuilder.DropTable(
                name: "CaseAsset",
                schema: "work");

            migrationBuilder.DropTable(
                name: "CaseComponent",
                schema: "work");

            migrationBuilder.DropTable(
                name: "CaseDependency",
                schema: "work");

            migrationBuilder.DropTable(
                name: "CaseEnvironment",
                schema: "work");

            migrationBuilder.DropTable(
                name: "CaseEvent",
                schema: "work");

            migrationBuilder.DropTable(
                name: "CaseWaitingInterval",
                schema: "work");

            migrationBuilder.DropTable(
                name: "CommitmentEvent",
                schema: "work");

            migrationBuilder.DropTable(
                name: "ComponentHost",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "ConditionReport",
                schema: "env");

            migrationBuilder.DropTable(
                name: "DataQualityItem",
                schema: "quality");

            migrationBuilder.DropTable(
                name: "DependencyComponent",
                schema: "network");

            migrationBuilder.DropTable(
                name: "DocumentReference",
                schema: "quality");

            migrationBuilder.DropTable(
                name: "EndpointAddress",
                schema: "network");

            migrationBuilder.DropTable(
                name: "EndpointGroupMember",
                schema: "network");

            migrationBuilder.DropTable(
                name: "ExportLog",
                schema: "audit");

            migrationBuilder.DropTable(
                name: "GroupMappingScope",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "HandoverItem",
                schema: "teams");

            migrationBuilder.DropTable(
                name: "InstallationVersionChange",
                schema: "catalogue");

            migrationBuilder.DropTable(
                name: "JiraReference",
                schema: "work");

            migrationBuilder.DropTable(
                name: "LookupValue",
                schema: "admin");

            migrationBuilder.DropTable(
                name: "ProjectProduct",
                schema: "clients");

            migrationBuilder.DropTable(
                name: "ResponsibilityBoundary",
                schema: "clients");

            migrationBuilder.DropTable(
                name: "Review",
                schema: "quality");

            migrationBuilder.DropTable(
                name: "ReviewPolicy",
                schema: "quality");

            migrationBuilder.DropTable(
                name: "Setting",
                schema: "admin");

            migrationBuilder.DropTable(
                name: "TeamMember",
                schema: "teams");

            migrationBuilder.DropTable(
                name: "UserRole",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "UserScope",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "Volume",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Commitment",
                schema: "work");

            migrationBuilder.DropTable(
                name: "Dependency",
                schema: "network");

            migrationBuilder.DropTable(
                name: "GroupMapping",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "Handover",
                schema: "teams");

            migrationBuilder.DropTable(
                name: "JiraInstance",
                schema: "work");

            migrationBuilder.DropTable(
                name: "Contact",
                schema: "clients");

            migrationBuilder.DropTable(
                name: "SharedStorage",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Case",
                schema: "work");

            migrationBuilder.DropTable(
                name: "Endpoint",
                schema: "network");

            migrationBuilder.DropTable(
                name: "Asset",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Component",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "NetworkContext",
                schema: "network");

            migrationBuilder.DropTable(
                name: "Installation",
                schema: "catalogue");

            migrationBuilder.DropTable(
                name: "Environment",
                schema: "env");

            migrationBuilder.DropTable(
                name: "ProductModule",
                schema: "catalogue");

            migrationBuilder.DropTable(
                name: "ProductVersion",
                schema: "catalogue");

            migrationBuilder.DropTable(
                name: "Project",
                schema: "clients");

            migrationBuilder.DropTable(
                name: "Region",
                schema: "clients");

            migrationBuilder.DropTable(
                name: "Product",
                schema: "catalogue");

            migrationBuilder.DropTable(
                name: "Client",
                schema: "clients");

            migrationBuilder.DropTable(
                name: "Team",
                schema: "teams");

            migrationBuilder.DropTable(
                name: "User",
                schema: "iam");

            migrationBuilder.DropSequence(
                name: "CaseNumbers",
                schema: "work");

            migrationBuilder.DropSequence(
                name: "CommitmentNumbers",
                schema: "work");

            migrationBuilder.DropSequence(
                name: "HandoverNumbers",
                schema: "teams");
        }
    }
}
