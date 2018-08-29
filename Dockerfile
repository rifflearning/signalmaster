FROM mhart/alpine-node:10

RUN npm install -g npm
WORKDIR /app
# copy the app project file
COPY package.json .
# install node packages
RUN npm install --only=production
# copy app sources and config
COPY . .
# This is the production image, set NODE_ENV to reflect that
ENV NODE_ENV=production
CMD ["node", "server.js"]
