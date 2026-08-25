# 0035 — La zona de finta es un campo paralelo, no un discriminador dentro de `Celda`

**Estado:** Aceptada

**Contexto.** La spec 041 añade una segunda responsabilidad pintable por puesto de defensa —
dónde cubre las fintas y los toques suaves, distinta de su zona de defensa. Había que decidir
cómo representarla sin romper `celdas`, que ya tiene sus tres estados fijados desde la spec 024
(`undefined` nunca tocada, `[]` vaciada a propósito, con valores pintada).

**Alternativas consideradas.**

1. **Un discriminador dentro de `Celda`** (`{ columna, fila, tipo: 'defensa' | 'finta' }`), con
   una única lista `celdas`. Descartada: una celda puede ser de defensa y de finta a la vez para
   el mismo puesto (spec 041, E6), así que el tipo tendría que admitir dos entradas idénticas en
   columna/fila con distinto `tipo` — una `Celda` deja de identificar un lugar y pasa a
   identificar un lugar-más-propósito, y todo el código que ya compara celdas por columna/fila
   (`coincide`, `celdasIguales`, `rejilla.ts` entero) tendría que empezar a filtrar por `tipo`
   antes de comparar. Cambia la forma de un tipo que once specs llevan usando tal cual.
2. **Una `Celda` fuera del array, aparte, con el `tipo` en la propia colocación** (`celdas:
   readonly (Celda & { tipo: TipoZona })[]`). Mismo problema que la 1, solo que movido: sigue
   siendo una única lista que hay que filtrar por tipo en cada consumidor (`pintarCelda`,
   `celdasVistaConjunto`, el agregado del servidor), y encima con un tipo compuesto más incómodo
   de leer que dos campos sueltos.

**Decisión.** Campo paralelo, mismo criterio que ya fijó la ADR 0029 para `ColocacionDefensa`
frente a `Colocacion` — no hay ninguna regla del dominio que combine zona de defensa y zona de
finta, así que no gana nada compartir un discriminador:

```ts
export interface ColocacionDefensa {
  readonly celdas?: readonly Celda[];       // zona de defensa (spec 022/024)
  readonly celdasFinta?: readonly Celda[];  // zona de finta (spec 041), mismos tres estados
}
```

`Celda` no se toca. `rejilla.ts` no se toca: `celdaDe`, `trazoCerrado`, `rellenarContorno` y
`celdasDeTrazo` sirven igual para el trazo de finta, sin saber que existe. El coste se paga en la
aplicación (`SistemaStore.pintarCelda`/`borrarCelda` despachan sobre `celdas` o `celdasFinta`
según la signal `modoPintado`) y en el servidor (`colocacion_defensa.celdas_finta`, columna
nueva, mismo `CHECK celdas_validas()` reutilizado, sin tocar el de `celdas`).

**Por simetría estructural con `Colocacion`** (que ya lleva `celdas?` sin usarlo en recepción
desde la spec 024), `celdasFinta?` se declara también ahí, aunque la UI nunca lo pueble fuera de
defensa — evita que `ColocacionBorrador = Colocacion | ColocacionDefensa` necesite narrowing para
leer el campo en la fontanería de `application/`.

**Consecuencias.** Guardar una variante de defensa sigue escribiendo exactamente los mismos
campos que antes más uno; ningún test de recepción cambia de forma. Cruzar zona de defensa y zona
de finta para calcular huecos o conflictos (specs 014-015, sin escribir) tendrá que leer los dos
campos por separado — consecuencia esperada de que sean conjuntos independientes, no una unión.
