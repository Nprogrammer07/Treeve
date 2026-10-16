# Imagen de Treeve.Api para Railway (ADR-002, punto 7).
# El contexto de construcción es la raíz del repositorio: RAILWAY_DOCKERFILE_PATH=deploy/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props .editorconfig ./
COPY src/Core ./src/Core
COPY src/Infrastructure ./src/Infrastructure
COPY src/Presentation/Treeve.Api ./src/Presentation/Treeve.Api
RUN dotnet publish src/Presentation/Treeve.Api/Treeve.Api.csproj -c Release -o /app --nologo

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Instalar dependencias requeridas por Npgsql para autenticación Kerberos/GSSAPI
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /app ./
USER $APP_UID
ENTRYPOINT ["dotnet", "Treeve.Api.dll"]
