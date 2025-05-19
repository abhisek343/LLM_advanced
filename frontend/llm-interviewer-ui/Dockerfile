# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package.json package-lock.json* ./
# If you use yarn, replace the above with:
# COPY package.json yarn.lock ./

# Install dependencies
RUN npm install
# If you use yarn, replace with:
# RUN yarn install

# Copy the rest of the application code
COPY . .

# Set build-time environment variables if needed (e.g., for API URLs)
# These are placeholders; actual values should be set during docker-compose build or here if static
ARG VITE_AUTH_SERVICE_URL=/api/v1/auth
ARG VITE_ADMIN_SERVICE_URL=/api/v1/admin
ARG VITE_HR_SERVICE_URL=/api/v1/hr
ARG VITE_CANDIDATE_SERVICE_URL=/api/v1/candidate
ARG VITE_INTERVIEW_SERVICE_URL=/api/v1/interview

ENV VITE_AUTH_SERVICE_URL=${VITE_AUTH_SERVICE_URL}
ENV VITE_ADMIN_SERVICE_URL=${VITE_ADMIN_SERVICE_URL}
ENV VITE_HR_SERVICE_URL=${VITE_HR_SERVICE_URL}
ENV VITE_CANDIDATE_SERVICE_URL=${VITE_CANDIDATE_SERVICE_URL}
ENV VITE_INTERVIEW_SERVICE_URL=${VITE_INTERVIEW_SERVICE_URL}

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration if needed (optional, but good for SPAs)
# Create a default.conf for Nginx to handle SPA routing
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
