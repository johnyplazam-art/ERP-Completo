# Plan: Agregar OpenRouter + cambiar todos los sdd-* a `openrouter/free`

## Archivo

`~/.config/opencode/opencode.json`

## Cambio 1 — Agregar provider OpenRouter

Insertar dentro de `"provider": { ... }`, al mismo nivel que `"openwebui"`:

```json
"openrouter": {
  "npm": "@ai-sdk/openai-compatible",
  "name": "OpenRouter",
  "options": {
    "baseURL": "https://openrouter.ai/api/v1",
    "apiKey": "sk-or-v1-REPLACE_WITH_YOUR_KEY"
  },
  "models": {
    "free": {
      "name": "OpenRouter Free"
    }
  }
}
```

## Cambio 2 — Cambiar modelo de todos los sdd-* a `openrouter/free`

### Agentes principales (10)

| Agente | Modelo actual | Nuevo modelo |
|---|---|---|
| `sdd-apply` | `openrouter/qwen/qwen3-next-80b-a3b-instruct:free` | `openrouter/free` |
| `sdd-archive` | `opencode/nemotron-3-super-free` | `openrouter/free` |
| `sdd-design` | `openwebui/phi4:latest` | `openrouter/free` |
| `sdd-explore` | `opencode/nemotron-3-super-free` | `openrouter/free` |
| `sdd-init` | `opencode/nemotron-3-super-free` | `openrouter/free` |
| `sdd-onboard` | `opencode/nemotron-3-super-free` | `openrouter/free` |
| `sdd-propose` | `openwebui/phi4:latest` | `openrouter/free` |
| `sdd-spec` | `openwebui/qwen2.5-coder:14b` | `openrouter/free` |
| `sdd-tasks` | `openwebui/qwen2.5-coder:14b` | `openrouter/free` |
| `sdd-verify` | `openwebui/phi4:latest` | `openrouter/free` |

### Agentes fallback (11)

| Agente | Modelo actual | Nuevo modelo |
|---|---|---|
| `sdd-apply-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-archive-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-design-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-explore-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-init-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-onboard-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-propose-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-spec-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-tasks-fallback` | `opencode/big-pickle` | `openrouter/free` |
| `sdd-verify-fallback` | `opencode/big-pickle` | `openrouter/free` |

### NO se toca

- `gentle-orchestrator` — modelo actual: `openrouter/openai/gpt-oss-20b:free` (no es sdd-*)

## Pasos para aplicar

1. Abrir `~/.config/opencode/opencode.json`
2. Insertar el bloque `openrouter` dentro de `"provider": { ... }`
3. Cambiar el `"model"` de cada uno de los 21 agentes listados arriba
4. Guardar y reiniciar la sesión de opencode
