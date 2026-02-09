# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project file, restore first for layer caching
COPY Timesheets.sln ./
COPY src/Server/Timesheets.Api/Timesheets.Api.csproj src/Server/Timesheets.Api/
RUN dotnet restore src/Server/Timesheets.Api/Timesheets.Api.csproj

# Copy everything and publish
COPY src/Server/Timesheets.Api/ src/Server/Timesheets.Api/
RUN dotnet publish src/Server/Timesheets.Api/Timesheets.Api.csproj \
    -c Release -o /app/publish --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Timesheets.Api.dll"]
