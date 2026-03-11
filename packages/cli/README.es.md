<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>Operator CLI for DeltaMind</strong><br>
  Inspect &bull; Export &bull; Replay &bull; Debug
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@deltamind/cli"><img src="https://img.shields.io/npm/v/@deltamind/cli" alt="npm" /></a>
  <a href="https://github.com/mcp-tool-shop-org/deltamind/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/deltamind" alt="license" /></a>
</p>

---

## ¿Qué es esto?

`@deltamind/cli` es la interfaz de línea de comandos para [DeltaMind](https://www.npmjs.com/package/@deltamind/core): 8 comandos que le permiten inspeccionar, depurar y exportar sesiones de memoria de agentes desde la terminal.

## Instalación

```bash
npm install -g @deltamind/cli
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `deltamind inspect` | Muestra el estado activo (todos los elementos o `--kind goal`). |
| `deltamind export` | Exporta un bloque de contexto (`--max-chars 4000`, `--for ai-loadout`). |
| `deltamind changed --since <ref>` | Muestra los cambios realizados desde una marca de tiempo, secuencia o ID de turno. |
| `deltamind explain <id>` | Historial completo de un elemento: campos, cambios, origen. |
| `deltamind replay` | Recorre el registro de origen (`--since`, `--type accepted`). |
| `deltamind suggest-memory` | Sugiere actualizaciones del archivo de memoria (`--min-confidence 0.8`). |
| `deltamind save` | Guarda la sesión en el directorio `.deltamind/` (`--from-stdin` para capturas de pantalla canalizadas). |
| `deltamind resume` | Carga la sesión y muestra las estadísticas. |

Todos los comandos admiten la opción `--json` para obtener una salida legible por máquinas.

## Diseño

- **Compatible con tuberías (pipes)**: la salida estándar (stdout) es datos, el error estándar (stderr) es para diagnósticos, sin códigos ANSI.
- **Códigos de salida**: 0 para éxito, 1 para error de uso, 2 si no existe el directorio `.deltamind/`.
- **Configuración mínima**: encuentra el directorio `.deltamind/` recorriendo los directorios desde el directorio de trabajo actual (como `.git/`).
- **Sin framework**: utiliza `parseArgs` de Node 18+ y no tiene dependencias de tiempo de ejecución más allá de `@deltamind/core`.

## Ejemplo

```bash
# What changed in the last hour?
deltamind changed --since 2025-01-15T10:00:00Z

# Export context for an LLM prompt
deltamind export --max-chars 4000

# Debug a specific item
deltamind explain goal::build-rest-api

# Pipe session state from another tool
cat snapshot.json | deltamind save --from-stdin
```

## Enlaces

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Manual](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Paquete principal](https://www.npmjs.com/package/@deltamind/core)

## Licencia

MIT
