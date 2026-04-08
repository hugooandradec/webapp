# App Operacao React

Aplicacao React que substitui o sistema legado de operacao.

## Estado atual

Todos os modulos principais ja foram migrados:

- Login
- Menu
- Lancamento
- Fechamento
- Pre-Fecho
- Retencao
- Calculo Salas

Hoje o foco mais importante ja nao e migracao de modulo, e sim consolidacao da base:

- limpeza da casca legada da raiz
- definicao final de deploy
- padronizacao fina de estilos e componentes
- revisao mobile
- revisao de textos e encoding

## Stack

- React 19
- Vite
- React Router
- React Icons
- ESLint

## Scripts

- `npm run dev`: ambiente local
- `npm run build`: build de producao
- `npm run lint`: validacao de codigo
- `npm run preview`: preview do build

## Estrutura

- `src/pages`
  Paginas principais da aplicacao.

- `src/components`
  Blocos reutilizaveis de interface e modais.

- `src/utils`
  Regras de negocio, sessao, formatacao e parser de modulos.

- `src/hooks`
  Hooks compartilhados de comportamento de interface.

- `src/styles`
  Base visual, layout, header, botoes e estilos por modulo.

## Padroes atuais

- `app.config.js`
  Centraliza o caminho base usado por Vite, router e navegacao interna.

- `module-base.css`
  Base visual compartilhada entre os modulos migrados.

- `buttons.css`
  Padrao de botoes principais, botoes compactos e acoes de remover.

- `header.css` e `layout.css`
  Estrutura comum de cabecalho e shell da aplicacao.

- `session.js`
  Centraliza leitura de usuario logado, limpeza de sessao e navegacao interna.

- `useBodyScrollLock.js`
  Evita scroll da tela de fundo enquanto modais estao abertos.

## Pendencias principais

- revisar e limpar arquivos legados da raiz do repositorio
- decidir a estrategia final de `dist` e deploy
- reduzir o tamanho de `module-base.css`
- trocar `alert/confirm/prompt` por dialogs ou toasts padronizados
- revisar textos com possivel encoding inconsistente
