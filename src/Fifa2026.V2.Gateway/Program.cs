using System.Threading.RateLimiting;
using Fifa2026.V2.Gateway.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Yarp.ReverseProxy.Transforms;

// =============================================================================
// Fifa2026.V2.Gateway — Gateway profissional em código C# com YARP (Story 2.2 / F2)
//
// Substitui o APIM Developer (ADE-004): rate-limit, output cache, CORS, header
// transform e JWT placeholder são MECANISMOS DE CÓDIGO, não policies XML opacas.
// Cada capacidade tem paridade 1:1 com uma policy APIM (ADE-004 Invariante 3).
//
// Pipeline (ORDEM IMPORTA — ADE-004 / story Task 2.6):
//   UseCors → UseRateLimiter → UseOutputCache → UseAuthentication
//           → UseAuthorization → MapReverseProxy
// =============================================================================

var builder = WebApplication.CreateBuilder(args);

// Constantes de configuração de pipeline.
const string RateLimiterPolicy = "fixed";              // partição fixed-window por IP (AC-5)
const string OutputCachePolicy = "purchase-status-30s"; // cache 30s no GET (AC-6)
const string CorsPolicy = "frontend";                   // origin restrito ao front (AC-7)
const string CorrelationHeader = "X-Correlation-ID";    // ADE-000 Inv 5 / AC-8

// -----------------------------------------------------------------------------
// YARP reverse proxy (ADE-004 Inv 1 e 2): rotas/clusters do appsettings.json +
// transforms programáticos (X-Correlation-ID, que exige geração de GUID novo).
// O IProxyConfigFilter sobrescreve a destination do cluster com a URL real da
// Function F1 (env FunctionAppF1Url — ADE-003 Inv 3, nunca hardcoded). A
// connection string SQL permanece NAS FUNCTIONS, não aqui.
// -----------------------------------------------------------------------------
builder.Services
    .AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddConfigFilter<FunctionDestinationConfigFilter>()
    .AddTransforms(transformBuilderContext =>
    {
        // AC-8 / ADE-000 Inv 5 — injeta X-Correlation-ID (novo GUID se ausente) em
        // CADA requisição encaminhada ao backend. Aplicado em TODAS as rotas
        // (gateway é o nó zero do Flow Visualizer de F6).
        transformBuilderContext.AddRequestTransform(transformContext =>
        {
            var incoming = transformContext.HttpContext.Request.Headers[CorrelationHeader].ToString();
            var correlationId = string.IsNullOrWhiteSpace(incoming)
                ? Guid.NewGuid().ToString()
                : incoming;

            transformContext.ProxyRequest.Headers.Remove(CorrelationHeader);
            transformContext.ProxyRequest.Headers.TryAddWithoutValidation(CorrelationHeader, correlationId);

            // Devolve o mesmo correlationId ao cliente (observabilidade de borda — AC-11).
            transformContext.HttpContext.Response.Headers[CorrelationHeader] = correlationId;

            return ValueTask.CompletedTask;
        });
    });

// -----------------------------------------------------------------------------
// AC-5 — Rate limiting em código (paridade com APIM rate-limit-by-key).
// Fixed window: 5 requisições/min por IP. 6ª chamada em < 1min → HTTP 429.
// -----------------------------------------------------------------------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimiterPolicy, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// -----------------------------------------------------------------------------
// AC-6 — Output cache em código (paridade com APIM cache-lookup/cache-store).
// Policy de 30s + header X-Cache HIT/MISS (XCacheOutputCachePolicy).
// -----------------------------------------------------------------------------
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy(OutputCachePolicy, builderPolicy =>
        builderPolicy
            .AddPolicy<XCacheOutputCachePolicy>()
            .Expire(TimeSpan.FromSeconds(30)));
});

// -----------------------------------------------------------------------------
// AC-7 — CORS restrito ao domínio do frontend (paridade com APIM cors).
// -----------------------------------------------------------------------------
var frontendOrigin = builder.Configuration["Gateway:FrontendOrigin"]
    ?? "https://fifa2026-web.azurewebsites.net";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
        policy.WithOrigins(frontendOrigin)
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// -----------------------------------------------------------------------------
// AC-9 — JWT placeholder preparatório (ADE-004 Inv 4 / ADE-005 Inv 4).
// AddJwtBearer CONFIGURADO apontando para o issuer Entra workforce, mas as rotas
// permanecem ANÔNIMAS em F2 (sem RequireAuthorization) — exatamente como o
// <choose> desabilitado do APIM. F3 ativa a validação.
// -----------------------------------------------------------------------------
var tenantId = builder.Configuration["Jwt:TenantId"] ?? "common";
var audience = builder.Configuration["Jwt:Audience"] ?? "api://fifa2026-v2-gateway";
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer("Entra", options =>
    {
        // F3: o discovery do issuer Entra valida iss/aud/assinatura/expiração.
        options.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
        options.Audience = audience;
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true
        };
    });
builder.Services.AddAuthorization();

// Observabilidade de borda (AC-11 / ADE-000 Inv 5) — App Insights se a connection
// string estiver presente (APPLICATIONINSIGHTS_CONNECTION_STRING). No-op sem ela.
builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();

// Pipeline na ORDEM correta (Task 2.6 / ADE-004):
app.UseCors(CorsPolicy);          // 1. CORS
app.UseRateLimiter();             // 2. Rate limiter (429)
app.UseMiddleware<XCacheMiddleware>(); // 2.5 default X-Cache: MISS (antes do cache)
app.UseOutputCache();             // 3. Output cache (30s) — seta X-Cache: HIT no store
app.UseAuthentication();          // 4. Authentication (JWT placeholder F2-anônimo)
app.UseAuthorization();           // 5. Authorization

// Endpoint de saúde para smoke test / Container App health probe.
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "gateway-yarp" }));

// 6. MapReverseProxy com rate-limit em todas as rotas e cache na rota GET.
app.MapReverseProxy()
    .RequireRateLimiting(RateLimiterPolicy)
    .CacheOutput(OutputCachePolicy);
// F3: aplicar .RequireAuthorization() aqui para exigir o Bearer token Entra.
// Em F2 as rotas são ANÔNIMAS (paridade com o <choose> desabilitado do APIM — AC-9).

app.Run();

// Necessário para WebApplicationFactory<Program> nos testes de integração (Task de testes).
public partial class Program { }
