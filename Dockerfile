# Args for FROM directives
ARG NODE_VER=14-alpine

#
# ---- Base Node image ----
FROM node:${NODE_VER} AS base
# The node:8 npm (v 5.6) has some issues, update it to latest
RUN npm install -g npm
WORKDIR /app
# copy the app project file
COPY package.json .

#
# ---- Dependencies ----
FROM base AS dependencies
# install node packages
RUN npm install --only=production
# copy production node_modules aside
RUN cp -R node_modules prod_node_modules
# install ALL node_modules, including 'devDependencies'
#RUN npm install

#
# ---- Release ----
FROM base AS release
LABEL Description="This image runs a signalmaster for SimpleWebRTC"
# This is the production image, set NODE_ENV to reflect that
ENV NODE_ENV=production
# copy production node_modules
COPY --from=dependencies /app/prod_node_modules ./node_modules
# copy app sources and config
COPY ./config ./config/
COPY ./server.js ./sockets.js ./
# define command to start the signalmaster
CMD ["node", "server.js"]
