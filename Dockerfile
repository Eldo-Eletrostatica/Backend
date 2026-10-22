FROM node:22-alpine

# The statistics PDF report (US12) is printed by Puppeteer. The Chrome that
# Puppeteer downloads needs glibc and does not run on Alpine, so the image
# uses Alpine's own Chromium, plus a font with Portuguese accents.
RUN apk add --no-cache chromium font-noto
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
