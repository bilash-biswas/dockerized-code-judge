FROM eclipse-temurin:17-jdk-alpine

# Install dependencies
RUN apk add --no-cache bash wget unzip

# Install Kotlin
RUN wget -q https://github.com/JetBrains/kotlin/releases/download/v1.9.22/kotlin-compiler-1.9.22.zip && \
  unzip kotlin-compiler-1.9.22.zip -d /opt && \
  rm kotlin-compiler-1.9.22.zip

ENV PATH=$PATH:/opt/kotlinc/bin

# Set working directory
WORKDIR /home/sandbox

CMD ["kotlin"]
