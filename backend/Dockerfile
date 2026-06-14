FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Retry on transient mirror failures (e.g. 502 Bad Gateway) instead of failing the whole build
ENV MAVEN_OPTS="-Dmaven.wagon.http.retryHandler.count=5 -Dmaven.wagon.httpconnectionManager.ttlSeconds=120 -Dmaven.wagon.http.pool=false"
COPY settings.xml .
COPY pom.xml .
COPY src ./src
# Skip test compilation so test-scope deps (mockito/byte-buddy) are never resolved
RUN mvn -s settings.xml -B package -Dmaven.test.skip=true

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV LANG C.UTF-8
EXPOSE 8526
ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-Dsun.jnu.encoding=UTF-8", "-jar", "app.jar"]
