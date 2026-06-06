using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using WireMock.Server;

namespace Fifa2026.V2.Gateway.Tests;

/// <summary>
/// Sobe o gateway YARP via <see cref="WebApplicationFactory{TEntryPoint}"/> com um
/// backend Function F1 mockado por <see cref="WireMockServer"/>. A env
/// <c>FunctionAppF1Url</c> aponta o cluster YARP para o WireMock (ADE-003 Inv 3 —
/// destination externalizada). Isola os testes de integração do Azure real.
/// </summary>
public sealed class GatewayTestFixture : WebApplicationFactory<Program>
{
    public WireMockServer Backend { get; }

    public GatewayTestFixture()
    {
        Backend = WireMockServer.Start();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Aponta o cluster functions-f1 para o WireMock (backend mockado).
                ["FunctionAppF1Url"] = Backend.Url,
                // CORS/JWT determinísticos nos testes.
                ["Gateway:FrontendOrigin"] = "https://fifa2026-web.azurewebsites.net",
                ["Jwt:TenantId"] = "common",
                ["Jwt:Audience"] = "api://fifa2026-v2-gateway"
            });
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            Backend.Stop();
            Backend.Dispose();
        }
        base.Dispose(disposing);
    }
}
