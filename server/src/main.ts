import { crearServidor } from './http/servidor';

// DATABASE_URL tiene que existir ANTES de que se importe `infraestructura/prisma.ts` (que
// instancia PrismaClient nada más cargarse), y con imports estáticos de ESM eso ya ha pasado
// para cuando el código de este fichero se ejecuta — cargar .env aquí llegaría tarde. Por eso
// `npm run dev`/`start` pasan `--env-file=.env` a Node (nativo desde 20.6), en vez de cargarlo
// en código. En producción, DATABASE_URL llega por variables de entorno reales.

const puerto = Number(process.env['PORT'] ?? 3000);

crearServidor().listen(puerto, () => {
  console.log(`InterZone API escuchando en el puerto ${puerto}`);
});
