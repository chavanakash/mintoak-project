FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_MERCHANT_API=/api/merchants
ARG VITE_TRANSACTION_API=/api/transactions
ENV VITE_MERCHANT_API=$VITE_MERCHANT_API
ENV VITE_TRANSACTION_API=$VITE_TRANSACTION_API
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
