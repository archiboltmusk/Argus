FROM node:24-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY server.mjs ./server.mjs
EXPOSE 8787
CMD ["node", "server.mjs"]
