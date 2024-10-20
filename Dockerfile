FROM node:20-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./wait-for.sh ./

USER node

RUN yarn

COPY --chown=node:node . .

RUN yarn build

EXPOSE 80 9292

CMD [ "yarn", "start" ]
