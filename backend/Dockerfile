# Single-instance evaluation build service. Requires sufficient CPU/memory and
# Cloud Run max-instances=1. Artifacts are ephemeral, never persisted to Firestore.
FROM node:22-bookworm-slim AS nodebin
FROM eclipse-temurin:17-jdk-jammy
ENV DEBIAN_FRONTEND=noninteractive ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk
RUN apt-get update && apt-get install -y --no-install-recommends python3 curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=nodebin /usr/local/bin/node /usr/local/bin/node
RUN mkdir -p "$ANDROID_HOME/cmdline-tools" /opt/gradle && \
    curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip -o /tmp/sdk.zip && \
    unzip -q /tmp/sdk.zip -d /tmp/sdk-tools && \
    mv /tmp/sdk-tools/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest" && \
    rm -rf /tmp/sdk.zip /tmp/sdk-tools && \
    yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null && \
    "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
RUN curl -fsSL https://services.gradle.org/distributions/gradle-8.13-bin.zip -o /tmp/gradle.zip && \
    unzip -q /tmp/gradle.zip -d /opt/gradle && rm /tmp/gradle.zip
ENV PATH="/opt/gradle/gradle-8.13/bin:/opt/android-sdk/platform-tools:${PATH}"
WORKDIR /app
COPY backend/ /app/backend/
COPY android-worker/build.py /app/android-worker/build.py
ENV PORT=8080 APPWELD_BUILDS_ENABLED=false
EXPOSE 8080
CMD ["node","/app/backend/server.mjs"]
