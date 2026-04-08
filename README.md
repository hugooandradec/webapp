# WebApp

Migracao do sistema antigo para React em andamento.

## Estado atual

- App principal em `app-operacao-react`
- Modulos migrados:
  - Login
  - Menu
  - Lancamento
  - Fechamento
  - Pre-Fecho
  - Retencao
  - Calculo Salas
- Base visual compartilhada criada em `src/styles`
- Build e lint do app React passando

## Estrutura

- `app-operacao-react/`: aplicacao React atual
- `login.html`, `manifest.json`, `sw.js`: casca de entrada da raiz apontando para o app novo
- `app-operacao/` e `common/`: legado antigo removido do fluxo principal e mantido apenas no historico do Git

## Proximos passos

- revisar polimento visual geral
- padronizar mais alguns textos e labels
- organizar o commit da migracao
- decidir a estrategia final de deploy/publicacao
