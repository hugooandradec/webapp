// Cria um campo de texto com label
function criarCampoTexto(id, label, placeholder = '', valor = '') {
  const grupo = document.createElement("div");
  grupo.className = "form-group";
  grupo.innerHTML = `
    <label for="${id}">${label}</label>
    <input type="text" id="${id}" placeholder="${placeholder}" value="${valor}" />
  `;
  return grupo;
}

// Cria um campo de senha
function criarCampoSenha(id, label, placeholder = '') {
  const grupo = document.createElement("div");
  grupo.className = "form-group";
  grupo.innerHTML = `
    <label for="${id}">${label}</label>
    <input type="password" id="${id}" placeholder="${placeholder}" />
  `;
  return grupo;
}

// Cria um campo select com opções
function criarCampoSelect(id, label, opcoes = [], valorSelecionado = '') {
  const grupo = document.createElement("div");
  grupo.className = "form-group";

  const optionsHTML = opcoes.map(op => 
    `<option value="${op}" ${op === valorSelecionado ? 'selected' : ''}>${op}</option>`
  ).join('');

  grupo.innerHTML = `
    <label for="${id}">${label}</label>
    <select id="${id}">${optionsHTML}</select>
  `;

  return grupo;
}

// Cria um botão padronizado
function criarBotao(texto, classe = "salvar", icone = "", onClick = "") {
  const botao = document.createElement("button");
  botao.className = `btn ${classe}`;
  botao.innerHTML = `${icone ? `<i class="${icone}"></i>` : ""} ${texto}`;
  if (onClick) botao.setAttribute("onclick", onClick);
  return botao;
}

function atualizarStatusConexao() {
  const statusDiv = document.getElementById("status-conexao");
  if (!statusDiv) return;

  const online = navigator.onLine;
  statusDiv.innerHTML = online
    ? "🟢 Conectado"
    : "🔴 Offline";
}

// Executa ao carregar
window.addEventListener("load", atualizarStatusConexao);
// Atualiza quando a conexão muda
window.addEventListener("online", atualizarStatusConexao);
window.addEventListener("offline", atualizarStatusConexao);