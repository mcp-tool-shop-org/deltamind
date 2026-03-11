<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>State-as-memory for AI agents</strong><br>
  Typed deltas &bull; Reconciliation &bull; Provenance &bull; Context export
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@deltamind/core"><img src="https://img.shields.io/npm/v/@deltamind/core" alt="npm" /></a>
  <a href="https://github.com/mcp-tool-shop-org/deltamind/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/deltamind" alt="license" /></a>
</p>

---

## ¿Qué es esto?

`@deltamind/core` es el motor de ejecución para DeltaMind, un sistema que reemplaza la transcripción como memoria con la **representación del estado como memoria** para agentes de inteligencia artificial.

En lugar de volver a leer mensajes antiguos, los agentes emiten "deltas" tipados (conjunto de objetivos, decisión, restricción, tarea, revisión, etc.) que se integran en un estado canónico. Ese estado se puede exportar como un bloque de contexto con un límite de tokens para cualquier consumidor posterior.

## Instalación

```bash
npm install @deltamind/core
```

## Inicio rápido

```typescript
import { createSession } from '@deltamind/core';

const session = createSession();

session.ingest({
  role: 'user',
  content: 'Build a REST API for the inventory service'
});

const result = session.process();
// result.accepted → deltas that passed reconciliation
// result.rejected → deltas that violated invariants

const context = session.exportContext({ maxChars: 4000 });
// Token-budgeted state block ready for any LLM
```

## Conceptos clave

- **Deltas** — cambios de estado tipados (11 tipos: conjunto de objetivos, decisión, restricción, tarea, revisión, preferencia, anclaje de contexto, pregunta abierta, idea, suposición, dependencia).
- **Conciliación** — impone 7 invariantes (sin duplicados, sin contradicciones, mutación solo mediante revisiones, etc.).
- **Origen** — registro completo de eventos de lo que fue aceptado, rechazado y por qué.
- **Identificadores semánticos** — identidad basada en el contenido para la eliminación de duplicados a lo largo de las interacciones.
- **Exportación de contexto** — representación del estado ordenada por prioridad y con conocimiento del presupuesto.

## Enlaces

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Manual](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Paquete de línea de comandos](https://www.npmjs.com/package/@deltamind/cli)

## Licencia

MIT
