# Plano de Commit

Sugestao de divisao para subir a migracao sem virar um commit monstro:

## 1. Base React e arquitetura

- rotas em `app-operacao-react/src/App.jsx`
- bootstrap em `app-operacao-react/src/main.jsx`
- configuracao de base path em `app-operacao-react/app.config.js`
- layout compartilhado, header, toast e dialog
- estilos base compartilhados

## 2. Modulos migrados

- `Lancamento`
- `Fechamento`
- `PreFecho`
- `Retencao`
- `CalculoSalas`
- `Login`
- `Menu`

## 3. Casca da raiz

- `login.html`
- `manifest.json`
- `sw.js`
- `README.md`
- `.gitignore`

## 4. Limpeza do legado

- remocao de `app-operacao/`
- remocao de `common/`
- remocao de assets e CSS antigos nao usados

## 5. Build gerado

Nao versionar `app-operacao-react/dist/`.
O ideal e deixar essa pasta so como artefato local de build.
