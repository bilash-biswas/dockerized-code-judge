FROM golang:1.21-alpine

# Create a non-root user for security
RUN adduser -D sandbox
USER sandbox

# Set working directory
WORKDIR /home/sandbox

CMD ["go"]
