# 0005 — El orden de saque se define una vez; las rotaciones se derivan

**Estado:** Precisada por 0010

**Contexto.** El planteamiento inicial trataba R1..R6 como seis dibujos independientes.

**Decisión.** El equipo define un único orden de saque. La posición rotacional de cada
jugador en cada rotación se calcula rotando ese orden; nunca se almacena.

**Consecuencias.** Es imposible guardar un estado incoherente en el que un jugador ocupe dos
posiciones distintas. Y sobre todo, hace posible la validación de falta posicional, que es la
funcionalidad más didáctica del proyecto: sin conocer el orden, no hay nada que validar.
