`docker network create artmux-network`

# Database

```
version: "3.1"

services:
  database:
    container_name: artmux-database
    image: postgres:14-alpine
    restart: unless-stopped
    tty: true
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
      TZ: 'GMT-3'
      PGTZ: 'GMT-3'
    volumes:
      - ./database:/var/lib/postgresql/data
    expose:
      - "5432"
    networks:
      - artmux-network

  pgadmin:
    container_name: artmux-pgadmin
    image: dpage/pgadmin4
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@artmux.dev
      PGADMIN_DEFAULT_PASSWORD: root
    ports:
      - "5050:80"
    depends_on:
      - database
    networks:
      - artmux-network

networks:
  artmux-network:
    external: true
```