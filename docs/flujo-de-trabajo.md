# Flujo de trabajo: SDD + TDD

## Cómo encajan las dos

**SDD decide el qué y el porqué, antes de tocar código.** La spec enumera los casos que
importan, incluidos los límite. Eso sale de conocer el reglamento y pensar los casos raros a
propósito, no de escribir código y ver qué aparece.

**TDD decide el cómo, un escenario cada vez.** Cada escenario de la spec se convierte en un
test que primero falla y luego se hace pasar con el mínimo código.

TDD sin spec previa tiende a probar solo lo que se te ocurre mientras escribes, que casi
siempre es el camino feliz. El caso "legal por solo tres centímetros" no se te ocurre con la
función ya delante; se te ocurre pensando en voleibol.

## El principio que evita duplicar documentación

**La especificación dice qué y por qué. Los tests dicen cómo se verifica.**

Si un escenario de la spec y un test dicen literalmente lo mismo, uno de los dos sobra, y el
que sobra es el de la spec. El vínculo entre ambos se mantiene con un identificador de
escenario, no copiando frases.

La spec, además, no describe implementación. Nombrar un fichero, una clase o una signal en
una spec es señal de que se está diseñando en el sitio equivocado.

## El ciclo

```
   1. Escribir la spec          docs/especificaciones/NNN-nombre.md
              ↓
   2. Escenarios verificables   Dado / Cuando / Entonces, con id E1, E2...
              ↓
   3. Congelar la spec          antes de ver una línea de implementación
              ↓
   4. Test en rojo              uno por escenario, referenciando su id
              ↓
   5. Código mínimo             hasta que pase. Nada más.
              ↓
   6. Refactor                  con los tests en verde
              ↓
   7. Cerrar la spec            marcar Completada y anotar desviaciones
```

Los pasos 4, 5 y 6 se repiten escenario a escenario, no de golpe para todos.

### 1. Spec

Se copia `docs/especificaciones/_plantilla.md`. Una spec por porción de trabajo entregable,
no por fichero ni por clase. Debe caber en una pantalla.

Si al escribirla aparece una pregunta que no se puede responder solo, **se para**. Esa
pregunta es el entregable de ese momento, no el código.

### 2. Escenarios

Formato `Dado / Cuando / Entonces`, en lenguaje de voleibol, con identificadores `E1`, `E2`.
Deben incluir explícitamente los casos límite y los casos de error, no solo el camino feliz.

### 4. Test en rojo

Un test por escenario, con el id en el nombre:

```ts
it('E4: falta si el zaguero P1 está por delante de su delantero P2', () => { ... });
```

**Se ejecuta y se comprueba que falla por el motivo correcto.** Un test que falla porque la
función no existe todavía no ha demostrado nada. Se escribe la firma vacía primero, y se
verifica que el fallo es una aserción, no un `ReferenceError`.

### 5. Código mínimo

Solo lo necesario para pasar. Prohibido añadir parámetros, opciones o casos que ningún test
pida. Si hace falta un caso nuevo, se añade primero el escenario y su test.

### 6. Refactor

Con la suite en verde. Los tests no se tocan en este paso: si hay que cambiar un test para
que pase, no es refactor, es un cambio de comportamiento y necesita volver al paso 2.

### 7. Cerrar

Estado a `Completada`. Si durante el desarrollo se aprendió algo que contradice la spec, se
corrige la spec antes de cerrarla, y si la lección afecta a las reglas del voleibol, se
actualiza `docs/dominio.md`. Si fue una decisión estructural, se añade a `docs/decisiones.md`.

## La trampa a vigilar

El fallo típico de combinar SDD y TDD es escribir la spec **después**, mirando el código, para
que cuadre. Ahí SDD deja de aportar nada: es documentación de lo que ya existe, no algo que
haya guiado una decisión.

El síntoma es que la sección "Al cerrar" esté siempre vacía. Cero desviaciones y cero
sorpresas en quince escenarios significa una de dos cosas: o el reglamento estaba dominado de
antemano, o la spec se escribió con la implementación delante.

## Reglas duras

1. **Ningún código de producción sin un test que falle antes.** Sin excepciones en `domain/`.
2. Los tests de `domain/` no importan Angular ni tocan el DOM. Si uno lo necesita, es que la
   lógica está en la capa equivocada.
3. Los tests se nombran en lenguaje de voleibol, no de programación. `'permite al líbero
   ocupar P5'`, no `'should return true when index is 4'`.
4. Un test comprueba una cosa. Varias aserciones sobre el mismo resultado están bien; varios
   escenarios en un test, no.
5. Cobertura de `domain/` al 100%. En el resto no se mide: perseguir cobertura en la UI
   produce tests que no fallan nunca.
6. La suite entera de `domain/` tarda menos de un segundo. Si deja de cumplirse, algo se ha
   colado en la capa que no debía.

## Qué NO se testea

Que un `<circle>` tenga el color correcto, que el panel esté a la derecha, que el arrastre
"se sienta bien". Eso se comprueba mirándolo. Los tests protegen las reglas del voleibol y
las transformaciones de datos, que es donde un fallo es silencioso y caro.
