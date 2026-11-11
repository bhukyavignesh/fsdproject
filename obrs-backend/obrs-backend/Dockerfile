# ---- build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

# ---- run (small JRE image, non-root user) ----
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S obrs && adduser -S obrs -G obrs
WORKDIR /app
COPY --from=build /app/target/obrs-backend-*.jar app.jar
USER obrs
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
