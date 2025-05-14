# Use Node.js base image for better-sqlite3 compatibility
FROM node:24-slim

WORKDIR /app

# Install Python and build tools for better-sqlite3/node-gyp
RUN apt-get update && \
    apt-get install -y g++ make python3 && \
    rm -rf /var/lib/apt/lists/* && \
    ln -sf /usr/bin/python3 /usr/bin/python

ENV PYTHON=/usr/bin/python3
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npx -y playwright@1.52.0 install --with-deps && npm install

COPY . .

RUN npm run build

CMD ["npm", "run", "scheduler"]