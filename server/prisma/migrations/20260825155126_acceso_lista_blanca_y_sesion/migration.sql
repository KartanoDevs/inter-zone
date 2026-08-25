-- Nota: `prisma migrate dev --create-only` también proponía `CREATE TYPE "via_ataque"` y
-- `DROP INDEX` sobre "jugador_orden_saque_key"/"jugador_rol_indice_key". Es drift falso, no
-- relacionado con esta spec: `via_ataque` ya se había borrado de la base real en la migración
-- de la spec 038 (quedaba, sin uso, solo declarado en schema.prisma — ya se ha limpiado allí
-- también) y los dos índices son invariantes de las specs 017/018 escritos a mano en SQL, que
-- Prisma no ve porque usan `NULLS NOT DISTINCT` (docs/modelo-de-datos.md §6, "Nota sobre
-- Prisma"). Las tres líneas se han quitado a propósito de esta migración: tocarlas no tiene
-- nada que ver con acceso, y borrar esos índices se llevaría por delante los invariantes que
-- protegen.

-- CreateEnum
CREATE TYPE "rol_acceso" AS ENUM ('admin', 'entrenador', 'usuario');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "es_admin" BOOLEAN NOT NULL DEFAULT false,
    "nombre" TEXT,
    "posicion_favorita" "rol_jugador",
    "dorsal" SMALLINT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acceso_en" TIMESTAMPTZ,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_blanca" (
    "email" TEXT NOT NULL,
    "rol" "rol_acceso" NOT NULL DEFAULT 'usuario',
    "equipo_id" UUID,
    "invitado_por" UUID,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usada_en" TIMESTAMPTZ,

    CONSTRAINT "lista_blanca_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "membresia" (
    "usuario_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "rol" "rol_acceso" NOT NULL,

    CONSTRAINT "membresia_pkey" PRIMARY KEY ("usuario_id","equipo_id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "testigo_hash" TEXT NOT NULL,
    "creada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_testigo_hash_key" ON "sesion"("testigo_hash");

-- AddForeignKey
ALTER TABLE "lista_blanca" ADD CONSTRAINT "lista_blanca_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_blanca" ADD CONSTRAINT "lista_blanca_invitado_por_fkey" FOREIGN KEY ("invitado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================================
-- A partir de aquí, a mano (spec 035, mismo patrón que la migración inicial): Prisma no
-- expresa CHECK en su lenguaje de esquema.
-- =====================================================================================

-- usuario / lista_blanca: el correo se compara siempre normalizado (spec 035, E1). El CHECK
-- es el cinturón; la comparación real ya llega normalizada desde `domain/acceso.ts`.
ALTER TABLE "usuario"
  ADD CONSTRAINT "usuario_email_normalizado" CHECK ("email" = lower(btrim("email"))),
  ADD CONSTRAINT "usuario_nombre_no_vacio" CHECK ("nombre" IS NULL OR btrim("nombre") <> ''),
  ADD CONSTRAINT "usuario_dorsal_valido" CHECK ("dorsal" IS NULL OR "dorsal" BETWEEN 1 AND 99);

ALTER TABLE "lista_blanca"
  ADD CONSTRAINT "lista_blanca_email_normalizado" CHECK ("email" = lower(btrim("email")));

-- membresia: admin no está acotado a ningún equipo, así que nunca aparece aquí (spec 035).
ALTER TABLE "membresia"
  ADD CONSTRAINT "membresia_sin_admin" CHECK ("rol" <> 'admin');

-- sesion: sin CHECK contra creada_en. Una sesión vigente se renueva escribiendo un
-- expira_en nuevo sin tocar creada_en (E12), así que "nace después de crearse" solo es cierto
-- en el instante del INSERT — como CHECK se reevalúa en cada UPDATE, "expira_en > creada_en"
-- se rompería con el simple paso del tiempo (E13), que es precisamente el estado que hay que
-- poder representar. La garantía real —que nunca se crea ya caducada— la da `abrirSesion` en
-- infraestructura, no la base de datos.
