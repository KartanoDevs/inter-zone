# 002 — Roles, etiquetas y composición de la plantilla

**Estado:** Congelada
**Paso de la hoja de ruta:** 1

## Problema

En una pizarra, seis círculos idénticos no dicen nada. El jugador necesita reconocer de un
vistazo quién es cada ficha, y el entrenador necesita llamar a cada rol como lo llama su
equipo, que no siempre coincide con el nombre de manual.

## Objetivo

Que cada jugador tenga una etiqueta corta e inequívoca derivada de su rol, y que los nombres
y abreviaturas de los roles se puedan cambiar sin tocar lógica ni invalidar los datos
guardados.

## Fuera de alcance

- Cómo se pinta la etiqueta. Esto es dominio puro.
- Una interfaz para editar los nombres de rol. En la v1 se cambian en el fichero de
  configuración del dominio; una pantalla de ajustes es trabajo posterior.
- La mecánica de sustitución del líbero (entradas, salidas, límites por set).
- Dorsales y nombres propios de los jugadores, que son datos de plantilla, no de rol.

## Escenarios

### Etiqueta derivada

**E1 — Rol sin índice**
- Dado: un jugador con rol colocador y la configuración por defecto
- Cuando: se pide su etiqueta
- Entonces: se obtiene `C`

**E2 — Rol con índice**
- Dado: un jugador con rol receptor e índice 1, con la configuración por defecto
- Cuando: se pide su etiqueta
- Entonces: se obtiene `R1`

**E3 — El central no colisiona con el colocador**
- Dado: un jugador con rol central e índice 2, con la configuración por defecto
- Cuando: se pide su etiqueta
- Entonces: se obtiene `M2`, distinta de la etiqueta de cualquier colocador

**E4 — Líbero y opuesto**
- Dado: sendos jugadores con rol líbero y opuesto, con la configuración por defecto
- Cuando: se piden sus etiquetas
- Entonces: se obtienen `L` y `O`

### Configuración

**E5 — Renombrar un rol no cambia su identificador**
- Dado: una configuración en la que el receptor se llama "Punta" y se abrevia `P`
- Cuando: se pide la etiqueta de un receptor con índice 2
- Entonces: se obtiene `P2`, y el jugador sigue teniendo el rol `receptor`

**E6 — Abreviaturas repetidas se rechazan**
- Dado: una configuración en la que colocador y central comparten la abreviatura `C`
- Cuando: se valida la configuración
- Entonces: se rechaza indicando qué dos roles colisionan

### Índice

**E7 — Un rol con índice sin índice asignado es inválido**
- Dado: un jugador con rol central y sin índice
- Cuando: se valida la plantilla
- Entonces: se rechaza

**E8 — Un rol sin índice con índice asignado es inválido**
- Dado: un jugador con rol colocador e índice 1
- Cuando: se valida la plantilla
- Entonces: se rechaza

**E9 — Índices duplicados dentro del mismo rol**
- Dado: dos receptores, ambos con índice 1
- Cuando: se valida la plantilla
- Entonces: se rechaza

**E10 — Índices iguales en roles distintos son válidos**
- Dado: un receptor con índice 1 y un central con índice 1
- Cuando: se valida la plantilla
- Entonces: se acepta: las etiquetas `R1` y `M1` no colisionan

**E11 — Asignación del índice según la convención**
- Dado: un orden de saque en el que, recorriendo desde el colocador en sentido de rotación,
  aparece primero un receptor y luego el otro
- Cuando: se calculan los índices según la convención del proyecto
- Entonces: el primero recibe el índice 1 y el segundo el índice 2

### Composición de la plantilla en pista

**E12 — Composición estándar válida**
- Dado: un orden de saque con un colocador, dos receptores, dos centrales y un opuesto
- Cuando: se valida la plantilla
- Entonces: se acepta

**E13 — Composición con líbero**
- Dado: un orden de saque en el que el líbero ocupa el puesto de un central
- Cuando: se valida la plantilla
- Entonces: se acepta

**E14 — Dos colocadores en pista**
- Dado: un orden de saque con dos jugadores de rol colocador
- Cuando: se valida la plantilla
- Entonces: se rechaza

**E15 — Un jugador repetido en dos posiciones**
- Dado: un orden de saque en el que el mismo jugador aparece en P1 y en P4
- Cuando: se valida la plantilla
- Entonces: se rechaza

## Preguntas abiertas

Ninguna. La spec está congelada.

Nota: la convención de índice (cerca y lejos respecto al colocador en el orden de saque) es
una decisión del proyecto, no una regla FIVB. Está registrada en `docs/decisiones.md`, 0006.
Si el equipo la entiende de otra forma, se cambia la decisión y esta spec antes que el código.

## Al cerrar

_(pendiente)_
