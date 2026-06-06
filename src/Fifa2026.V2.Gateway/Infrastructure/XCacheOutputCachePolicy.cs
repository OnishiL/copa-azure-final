using Microsoft.AspNetCore.OutputCaching;

namespace Fifa2026.V2.Gateway.Infrastructure;

/// <summary>
/// AC-6 — Marca <c>X-Cache: HIT</c> quando a resposta é servida do Output Cache.
///
/// O Output Cache do ASP.NET Core não expõe nativamente um header de hit/miss.
/// Esta policy seta <c>X-Cache: HIT</c> em <see cref="ServeFromCacheAsync"/>
/// (estágio em que os headers ainda são graváveis, antes do flush). O valor
/// default <c>MISS</c> é aplicado por <see cref="XCacheMiddleware"/> via
/// <c>Response.OnStarting</c>, evitando escrever em headers já commitados pelo
/// YARP no caminho de MISS. Paridade com <c>cache-lookup</c>/<c>cache-store</c>
/// do APIM (ADE-004 Invariante 3).
/// </summary>
public sealed class XCacheOutputCachePolicy : IOutputCachePolicy
{
    internal const string CacheHitHeader = "X-Cache";

    public ValueTask CacheRequestAsync(OutputCacheContext context, CancellationToken cancellationToken)
        => ValueTask.CompletedTask;

    public ValueTask ServeFromCacheAsync(OutputCacheContext context, CancellationToken cancellationToken)
    {
        // Servido do store: HIT (headers ainda graváveis neste estágio).
        context.HttpContext.Response.Headers[CacheHitHeader] = "HIT";
        return ValueTask.CompletedTask;
    }

    public ValueTask ServeResponseAsync(OutputCacheContext context, CancellationToken cancellationToken)
        => ValueTask.CompletedTask;
}
