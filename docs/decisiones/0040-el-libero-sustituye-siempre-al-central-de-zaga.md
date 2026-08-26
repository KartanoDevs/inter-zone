# 0040 — El líbero sustituye siempre al central de zaga

**Estado:** Aceptada

**Contexto.** Desde la spec 017, `PanelAjustes` (Edición) ofrece un `&lt;select&gt;` por rotación
para elegir a qué titular zaguero sustituye el líbero. Esa flexibilidad es fiel al reglamento
(FIVB 19.3.1.1: el líbero puede sustituir a cualquier zaguero, no solo al central), pero en la
práctica añade una pantalla y una decisión por rotación que casi nadie usa distinta del caso
típico: que sustituya al central que cae en zaga. El dominio ya calculaba exactamente ese valor
como conveniencia (`sustitutosLiberoPorDefecto`, spec 017), pero lo dejaba editable.

**Alternativas consideradas.**

1. **Ampliar el selector a los seis titulares**, corrigiendo la limitación que la spec 043 dejó
   anotada como fuera de alcance (hoy solo ofrece los tres zagueros de la rotación activa).
   Descartada: iría en la dirección contraria a simplificar, y nadie ha pedido esa flexibilidad
   en la práctica.
2. **Quitar el líbero del modelo de datos.** Descartada: rompería specs completadas (011, 017,
   043) y el invariante de que quién está en pista se deriva, nunca se asigna a mano.

**Decisión.** Se retira de `ui/ajustes/panel-ajustes` la opción "Líbero sustituye a". El
sustituto de cada rotación se deriva siempre con `sustitutosLiberoPorDefecto` — el central que
cae en zaga en ella — al crear o clonar un sistema, sin que el entrenador pueda cambiarlo desde
la interfaz. La función y el tipo `SustitucionLibero.sustitutosPorRotacion` del dominio no se
tocan: `cambiarSustitutoLibero` (`domain/catalogo-sistemas.ts`) y el relevo de colocaciones que
implementa (decisión 0034) se quedan sin llamador desde `ui/`, pero siguen existiendo y
probados, documentando cómo funcionaría si algún día se reabre la opción.

**Consecuencias.** Esto es una simplificación de interfaz, no un cambio de reglamento: la regla
FIVB 19.3.1.1 documentada en `docs/dominio.md` §2 sigue siendo la que rige el reglamento real: el
líbero puede sustituir a cualquier zaguero. Lo que cambia es que esta herramienta ya no permite
declarar ningún caso distinto del típico. Los sistemas que existan hoy con un sustituto distinto
del central no se migran — decisión explícita del usuario: los datos guardados no son relevantes,
se crearán sistemas nuevos. Un sistema antiguo que conservara un sustituto no-central en su JSON
seguiría respetándolo (`jugadoresEnPista` no cambia), simplemente ya no habría forma de volver a
cambiarlo desde la interfaz.
