# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first — cached layer as long as package*.json doesn't change
COPY package*.json ./
RUN npm install --silent

# Copy source and build
COPY public ./public
COPY src ./src
# CI=false prevents CRA from treating ESLint warnings as errors during build
RUN CI=false npm run build

# ── Runtime stage (nginx) ─────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy the production build from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Replace the default nginx site config with ours
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
