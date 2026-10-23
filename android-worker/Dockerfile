# Cloud Run Job image for paid, authorized Appweld builds.
# Image contains official Android SDK / build tools and Gradle.
FROM eclipse-temurin:17-jdk-jammy
ENV DEBIAN_FRONTEND=noninteractive ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk
RUN apt-get update && apt-get install -y --no-install-recommends python3 curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*
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
COPY build.py /app/build.py
# Never log or expose keystore passwords. Production entrypoint reads a paid order
# spec from controlled storage, runs build.py, then uploads private outputs.
ENTRYPOINT ["python3","/app/build.py"]
