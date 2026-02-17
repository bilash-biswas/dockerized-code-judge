FROM php:8.2-cli-alpine

# Create a non-root user for security
RUN adduser -D sandbox
USER sandbox

# Set working directory
WORKDIR /home/sandbox

CMD ["php"]
