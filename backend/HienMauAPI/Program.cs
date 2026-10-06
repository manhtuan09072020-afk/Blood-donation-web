using System.Security.Claims;
using System.Text;
using HienMauAPI.Data;
using HienMauAPI.Helpers;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ===== Cấu hình DbContext (SQL Server) =====
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ===== JWT Settings =====
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()!;

// HS256 yêu cầu khóa tối thiểu 256 bit (32 byte) - kiểm tra sớm để lỗi rõ ràng ngay khi khởi động
if (string.IsNullOrWhiteSpace(jwtSettings.SecretKey) || Encoding.UTF8.GetByteCount(jwtSettings.SecretKey) < 32)
    throw new InvalidOperationException("Jwt:SecretKey phải có ít nhất 32 ký tự. Hãy cấu hình trong appsettings.json.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        RoleClaimType = ClaimTypes.Role,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ===== CORS: web React (Vite) và ứng dụng Flutter (web/emulator) gọi API =====
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // API xác thực bằng Bearer token (không dùng cookie) nên cho phép mọi origin là an toàn;
        // Flutter web / Vite chạy trên các cổng khác nhau. Đặt Cors:AllowAnyOrigin = false để giới hạn theo danh sách.
        if (builder.Environment.IsDevelopment() || builder.Configuration.GetValue("Cors:AllowAnyOrigin", true))
        {
            policy.SetIsOriginAllowed(_ => true);
        }
        else
        {
            policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                               ?? new[] { "http://localhost:5173" });
        }
        policy.AllowAnyHeader().AllowAnyMethod();
    });
});

// ===== Đăng ký Services (Dependency Injection) =====
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDonorService, DonorService>();
builder.Services.AddScoped<ICampaignService, CampaignService>();
builder.Services.AddScoped<IRegistrationService, RegistrationService>();
builder.Services.AddScoped<IScreeningService, ScreeningService>();
builder.Services.AddScoped<ICollectionService, CollectionService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddHostedService<AutomationBackgroundService>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Tránh lỗi vòng lặp tham chiếu khi serialize entity có navigation property qua lại
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Hệ thống Quản lý Hiến máu Nhân đạo API", Version = "v1" });

    // Cho phép nhập Bearer token trực tiếp trên giao diện Swagger để test API
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Nhập theo dạng: Bearer {token}"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ===== Seed: mật khẩu mặc định, hồ sơ nhân viên, dữ liệu demo =====
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await DbSeeder.SeedAsync(db, logger);
        if (app.Configuration.GetValue("SeedDemoData", true))
            await DemoDataSeeder.SeedAsync(db, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Seed dữ liệu thất bại. Kiểm tra lại CSDL đã được tạo bằng database/HienMauNhanDao_CreateDB.sql chưa.");
    }
}

// ===== Middleware pipeline =====

// Lỗi không lường trước: trả JSON thống nhất { message } để giao diện hiển thị, không lộ stack trace
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var feature = context.Features.Get<IExceptionHandlerFeature>();
    app.Logger.LogError(feature?.Error, "Lỗi chưa xử lý tại {Path}", context.Request.Path);
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(new { message = "Máy chủ gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau." });
}));

app.UseSwagger();
app.UseSwaggerUI(c => c.DocumentTitle = "Hiến máu Nhân đạo API");

// Khi dev, frontend (Vite proxy) và app mobile gọi thẳng http://localhost:5000 nên không ép chuyển sang HTTPS
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
// Bản triển khai: giao diện React đã build được đặt trong wwwroot -> API phục vụ luôn website (một tiến trình duy nhất)
var spaIndex = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "index.html");
var hasSpa = File.Exists(spaIndex);
if (hasSpa)
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

if (hasSpa)
{
    // Mọi đường dẫn không phải /api, /swagger trả về index.html để React Router xử lý (vd: /admin/inventory)
    app.MapFallback(async context =>
    {
        var path = context.Request.Path.Value ?? string.Empty;
        if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase) || path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.SendFileAsync(spaIndex);
    });
}
else
{
    app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();
}

app.Run();
