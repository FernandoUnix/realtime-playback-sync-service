# ── Build stage ───────────────────────────────────────────────────────────────
FROM eclipse-temurin:24-jdk-noble AS build
WORKDIR /build

# Install Maven 3.9.9 (apt version on Noble is too old for Java 24)
ARG MAVEN_VERSION=3.9.9
RUN apt-get update && apt-get install -y wget && \
    wget -qO /tmp/maven.tar.gz \
        https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz && \
    tar -xzf /tmp/maven.tar.gz -C /opt && \
    ln -s /opt/apache-maven-${MAVEN_VERSION}/bin/mvn /usr/local/bin/mvn && \
    rm /tmp/maven.tar.gz && \
    apt-get remove -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Resolve dependencies first — this layer is cached as long as pom.xml doesn't change
COPY pom.xml .
RUN mvn dependency:go-offline -B -q

# Compile and package
COPY src ./src
RUN mvn clean package -DskipTests -B -q

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:24-jre-noble

# Install FFmpeg (Linux build — the bundled ffmpeg/bin/ffmpeg.exe is Windows-only)
# Also install curl for the Docker health check
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pre-create the runtime directories that will be mounted as volumes
RUN mkdir -p storage data logs

COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080

# -Dffmpeg.path=ffmpeg  — overrides the Windows path in application.properties
# -XX:+UseContainerSupport — lets the JVM respect cgroup memory limits
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-Dffmpeg.path=ffmpeg", \
    "-jar", "app.jar"]
