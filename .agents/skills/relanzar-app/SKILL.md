---
name: relanzar-app
description: >
  Relanza (o inicia) la app InterZone en local. Se usa cuando el usuario dice
  "relanza la app", "reinicia la app", "levanta InterZone en local", "arranca el
  stack", "/relanzar-app" o equivalente. Cubre el stack completo en Docker
  (web + servidor + postgres) y el modo desarrollo con recarga en caliente.
---

# Relanzar InterZone en local

Dos formas de correr la app. Por defecto usa el **stack Docker**, que es lo que
`reiniciar.bat` y `deploy.sh` (con `ENTORNO=local`) levantan.

## Stack Docker (por defecto)

Reconstruye imágenes y recrea contenedores:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml up -d --build
```

O, en Windows: `reiniciar.bat` desde la raíz del repo.

- **web**: http://localhost:8080 (Nginx sirviendo el build de Angular; `/api` va al servidor)
- **servidor**: API Express + Prisma, solo dentro de la red Docker
- **postgres**: puerto 5432

Requiere `.env` en la raíz (copia de `.env.produccion.example`) con `ENTORNO=local`.

### Verificar

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml ps
curl -s -o /dev/null -w "web:%{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "api:%{http_code}\n" "http://localhost:8080/api/sistemas?equipoId=masculino"
```

Ambos deben dar `200` y todos los contenedores `healthy`.

### Otros comandos

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml logs -f
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml down
```

## Modo desarrollo (recarga en caliente)

Cuando el usuario pida "modo dev", "con hot reload" o vaya a tocar código de UI:
`start.bat`, o a mano:

```bash
cd server && npm run db:up && npm start   # API en :3000, Postgres en Docker
npm start                                  # Angular dev server en :4200 (proxy a :3000)
```

- cliente: http://localhost:4200
- API: http://localhost:3000

Primera vez o tras cambios en el esquema: `cd server && npx prisma migrate deploy && npm run seed`.

## Notas

- No arrancar el servidor expuesto a una red que no sea de confianza: `GET /api/sistemas`
  aún no exige sesión (spec 037 pendiente).
- Si el puerto 8080 choca, `PUERTO_WEB` en `.env` lo cambia.
