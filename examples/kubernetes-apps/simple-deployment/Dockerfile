# Multi-stage Dockerfile for Node.js application
# This demonstrates security best practices:
# - Multi-stage build to reduce image size
# - Non-root user
# - Minimal base image (Alpine Linux)
# - No unnecessary packages
# - Health checks

# Build stage (not needed for this simple app, but demonstrates pattern)
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files (if you had dependencies)
# COPY package*.json ./
# RUN npm ci --only=production

# Copy application code
COPY app.js ./

# Production stage
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
# The node image already has a 'node' user, but we'll create our own for clarity
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

# Copy application from builder
COPY --from=builder --chown=appuser:appuser /app/app.js ./

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Environment variables with defaults
ENV NODE_ENV=production \
    PORT=8080 \
    APP_ENV=production \
    APP_VERSION=1.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "app.js"]

# Labels following OCI image spec
LABEL org.opencontainers.image.title="Simple Kubernetes Demo App" \
      org.opencontainers.image.description="A simple Node.js app for Kubernetes deployment demonstration" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="DevSecOps Team" \
      org.opencontainers.image.vendor="Example Corp" \
      org.opencontainers.image.licenses="MIT"
