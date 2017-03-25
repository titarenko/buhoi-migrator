FROM node:boron

RUN echo 'deb http://apt.postgresql.org/pub/repos/apt/ jessie-pgdg main' > /etc/apt/sources.list.d/pgdg.list && \
	wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
	apt-get update && \
	apt-get install -y postgresql-client

WORKDIR /srv

COPY package.json .
RUN npm i

COPY . .
RUN npm run lint

ENTRYPOINT ["node"]
CMD ["./"]