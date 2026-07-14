FROM node:20-alpine

RUN npm install -g pnpm --registry=https://registry.npmmirror.com

RUN pnpm config set registry https://registry.npmmirror.com

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/
RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 8081

CMD ["pnpm", "web"]
