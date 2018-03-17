FROM jitesoft/node-base:latest
ADD . /
RUN npm install
ENTRYPOINT ["node", "index.js"]
