FROM python:3.9-slim

# Create a non-root user for security
RUN useradd -m sandbox
USER sandbox

# Set working directory
WORKDIR /home/sandbox

# This container will just stay alive or be used via docker run
CMD ["python3"]
