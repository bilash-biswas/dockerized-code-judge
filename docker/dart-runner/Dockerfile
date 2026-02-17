FROM dart:stable

# Create a non-root user for security
RUN useradd -m sandbox
USER sandbox

# Set working directory
WORKDIR /home/sandbox

CMD ["dart"]
