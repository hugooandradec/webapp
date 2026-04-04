const STORAGE_KEY = "fechamento_dados_v1";

const camposPrincipaisIds = [
  "periodo",
  "turano",
  "rc",
  "centro",
  "total",
  "comissao",
  "cartaoPassado",
  "cartaoAtual",
  "debitosResumo",
  "devedoresResumo",
  "recebimentosAnteriores",
  "firma"
];

const listaDebitos = document.getElementById("listaDebitos");
const listaDevedores = document.getElementById("listaDevedores");

const btnAdicionarDebito = document.getElementById("btnAdicionarDebito");
const btnAdicionarDevedor = document.getElementById("btnAdicionarDevedor");
const btnVisualizarResumo = document.getElementById("btnVisualizarResumo");
const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
const btnFecharModal = document.getElementById("btnFecharModal");
const btnImprimir = document.getElementById("btnImprimir");
const btnLimparTudo = document.getElementById("btnLimparTudo");

const modalRelatorio = document.getElementById("modalRelatorio");
const conteudoRelatorio = document.getElementById("conteudoRelatorio");

const estado = {
  debitos: [],
  devedores: []
};

function obterCampo(id) {
  return document.getElementById(id);
}

function obterCamposPrincipais() {
  const dados = {};
  camposPrincipaisIds.forEach(id => {
    dados[id] = obterCampo(id).value || "";
  });
  return dados;
}

function moedaBR(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function converterTextoParaNumero(texto) {
  if (texto === null || texto === undefined) return 0;
  if (typeof texto === "number") return texto;

  let valor = String(texto).trim();

  if (!valor) return 0;

  valor = valor.replace(/\s/g, "");

  if (valor.includes(",")) {
    valor = valor.replace(/\./g, "").replace(",", ".");
  }

  valor = valor.replace(/[^\d.-]/g, "");

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarInputMoeda(input) {
  let valor = input.value || "";

  valor = valor.replace(/\D/g, "");

  if (!valor) {
    input.value = "";
    return;
  }

  const numero = Number(valor) / 100;

  input.value = numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function aplicarMascaraMoedaNosCampos() {
  const idsMoeda = [
    "turano",
    "rc",
    "centro",
    "total",
    "comissao",
    "cartaoPassado",
    "cartaoAtual",
    "debitosResumo",
    "devedoresResumo",
    "recebimentosAnteriores",
    "firma"
  ];

  idsMoeda.forEach(id => {
    const campo = obterCampo(id);

    campo.addEventListener("input", () => {
      formatarInputMoeda(campo);
      atualizarResumo();
      salvarTudo();
    });
  });
}

function classeValor(valor) {
  if (valor > 0) return "positivo";
  if (valor < 0) return "negativo";
  return "";
}

function criarCardResumo(id, valor) {
  const el = document.getElementById(id);
  el.textContent = moedaBR(valor);
  el.classList.remove("positivo", "negativo");

  const classe = classeValor(valor);
  if (classe) el.classList.add(classe);
}

function atualizarMiniResumo(id, valor, tipo = "neutro") {
  const el = document.getElementById(id);
  el.textContent = moedaBR(valor);
  el.className = "";

  if (tipo === "positivo") {
    el.classList.add("valor-positivo");
  } else if (tipo === "negativo") {
    el.classList.add("valor-negativo");
  } else {
    el.classList.add("valor-neutro");
  }
}

function adicionarDebito(dados = {}) {
  estado.debitos.push({
    descricao: dados.descricao || "",
    conta: dados.conta || "",
    valor: dados.valor || ""
  });

  renderizarDebitos();
  salvarTudo();
}

function adicionarDevedor(dados = {}) {
  estado.devedores.push({
    ponto: dados.ponto || "",
    valorAnterior: dados.valorAnterior || "",
    pagamento: dados.pagamento || "",
    novoDebito: dados.novoDebito || "",
    valorAtual: dados.valorAtual || ""
  });

  renderizarDevedores();
  salvarTudo();
}

function removerDebito(index) {
  estado.debitos.splice(index, 1);
  renderizarDebitos();
  atualizarResumo();
  salvarTudo();
}

function removerDevedor(index) {
  estado.devedores.splice(index, 1);
  renderizarDevedores();
  atualizarResumo();
  salvarTudo();
}

function renderizarDebitos() {
  if (!estado.debitos.length) {
    listaDebitos.innerHTML = `
      <div class="estado-vazio">
        Nenhum débito adicionado ainda.
      </div>
    `;
    return;
  }

  listaDebitos.innerHTML = estado.debitos.map((debito, index) => `
    <div class="linha-item">
      <div class="subtitulo-lista">
        <span>Débito ${index + 1}</span>
        <button class="btn btn-vermelho" type="button" onclick="window.removerDebito(${index})">
          <i class="fas fa-trash"></i>
          Remover
        </button>
      </div>

      <div class="grid-3">
        <div class="campo">
          <label>Descrição</label>
          <input
            type="text"
            value="${escapeHtml(debito.descricao)}"
            oninput="window.atualizarCampoDebito(${index}, 'descricao', this.value)"
            placeholder="Ex.: Loja Camerino"
          >
        </div>

        <div class="campo">
          <label>Conta</label>
          <input
            type="text"
            value="${escapeHtml(debito.conta)}"
            oninput="window.atualizarCampoDebito(${index}, 'conta', this.value)"
            placeholder="Ex.: Aluguel"
          >
        </div>

        <div class="campo">
          <label>Valor</label>
          <input
            type="text"
            value="${escapeHtml(debito.valor)}"
            inputmode="numeric"
            oninput="window.atualizarCampoDebito(${index}, 'valor', this.value, true)"
            placeholder="0,00"
          >
        </div>
      </div>
    </div>
  `).join("");
}

function renderizarDevedores() {
  if (!estado.devedores.length) {
    listaDevedores.innerHTML = `
      <div class="estado-vazio">
        Nenhum devedor adicionado ainda.
      </div>
    `;
    return;
  }

  listaDevedores.innerHTML = estado.devedores.map((devedor, index) => `
    <div class="linha-item">
      <div class="subtitulo-lista">
        <span>Devedor ${index + 1}</span>
        <button class="btn btn-vermelho" type="button" onclick="window.removerDevedor(${index})">
          <i class="fas fa-trash"></i>
          Remover
        </button>
      </div>

      <div class="grid-4">
        <div class="campo">
          <label>Ponto</label>
          <input
            type="text"
            value="${escapeHtml(devedor.ponto)}"
            oninput="window.atualizarCampoDevedor(${index}, 'ponto', this.value)"
            placeholder="Ex.: Nosso Ponto"
          >
        </div>

        <div class="campo">
          <label>Valor Ant.</label>
          <input
            type="text"
            value="${escapeHtml(devedor.valorAnterior)}"
            inputmode="numeric"
            oninput="window.atualizarCampoDevedor(${index}, 'valorAnterior', this.value, true)"
            placeholder="0,00"
          >
        </div>

        <div class="campo">
          <label>PG</label>
          <input
            type="text"
            value="${escapeHtml(devedor.pagamento)}"
            inputmode="numeric"
            oninput="window.atualizarCampoDevedor(${index}, 'pagamento', this.value, true)"
            placeholder="0,00"
          >
        </div>

        <div class="campo">
          <label>Novo Déb.</label>
          <input
            type="text"
            value="${escapeHtml(devedor.novoDebito)}"
            inputmode="numeric"
            oninput="window.atualizarCampoDevedor(${index}, 'novoDebito', this.value, true)"
            placeholder="0,00"
          >
        </div>

        <div class="campo" style="grid-column: 1 / -1;">
          <label>Valor Att.</label>
          <input
            type="text"
            value="${escapeHtml(devedor.valorAtual)}"
            inputmode="numeric"
            oninput="window.atualizarCampoDevedor(${index}, 'valorAtual', this.value, true)"
            placeholder="0,00"
          >
        </div>
      </div>
    </div>
  `).join("");
}

function atualizarCampoDebito(index, campo, valor, ehMoeda = false) {
  if (ehMoeda) {
    valor = formatarValorDigitado(valor);
  }

  estado.debitos[index][campo] = valor;
  atualizarResumo();
  salvarTudo();
}

function atualizarCampoDevedor(index, campo, valor, ehMoeda = false) {
  if (ehMoeda) {
    valor = formatarValorDigitado(valor);
  }

  estado.devedores[index][campo] = valor;
  atualizarResumo();
  salvarTudo();
}

function formatarValorDigitado(valor) {
  let limpo = String(valor || "").replace(/\D/g, "");
  if (!limpo) return "";

  const numero = Number(limpo) / 100;
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function somarDebitosLista() {
  return estado.debitos.reduce((soma, item) => {
    return soma + converterTextoParaNumero(item.valor);
  }, 0);
}

function somarDevedoresLista() {
  return estado.devedores.reduce((soma, item) => {
    return soma + converterTextoParaNumero(item.valorAtual);
  }, 0);
}

function atualizarResumo() {
  const turano = converterTextoParaNumero(obterCampo("turano").value);
  const rc = converterTextoParaNumero(obterCampo("rc").value);
  const centro = converterTextoParaNumero(obterCampo("centro").value);

  const total = converterTextoParaNumero(obterCampo("total").value);
  const comissao = converterTextoParaNumero(obterCampo("comissao").value);
  const cartaoPassado = converterTextoParaNumero(obterCampo("cartaoPassado").value);
  const cartaoAtual = converterTextoParaNumero(obterCampo("cartaoAtual").value);
  const debitosCampo = converterTextoParaNumero(obterCampo("debitosResumo").value);
  const devedoresCampo = converterTextoParaNumero(obterCampo("devedoresResumo").value);
  const recebimentos = converterTextoParaNumero(obterCampo("recebimentosAnteriores").value);
  const firma = converterTextoParaNumero(obterCampo("firma").value);

  const debitosLista = somarDebitosLista();
  const devedoresLista = somarDevedoresLista();

  const debitosUsados = debitosCampo || debitosLista;
  const devedoresUsados = devedoresCampo || devedoresLista;

  criarCardResumo("cardTotal", total);
  criarCardResumo("cardComissao", comissao);
  criarCardResumo("cardSaidas", debitosUsados + devedoresUsados);
  criarCardResumo("cardFirma", firma);

  atualizarMiniResumo("resTurano", turano);
  atualizarMiniResumo("resRc", rc);
  atualizarMiniResumo("resCentro", centro);
  atualizarMiniResumo("resCartaoPassado", cartaoPassado);
  atualizarMiniResumo("resCartaoAtual", cartaoAtual, cartaoAtual < 0 ? "negativo" : "neutro");
  atualizarMiniResumo("resRecebimentos", recebimentos, recebimentos > 0 ? "positivo" : "neutro");

  atualizarMiniResumo("finalTotal", total);
  atualizarMiniResumo("finalComissao", comissao);
  atualizarMiniResumo("finalCartaoPassado", cartaoPassado);
  atualizarMiniResumo("finalCartaoAtual", cartaoAtual, cartaoAtual < 0 ? "negativo" : "neutro");
  atualizarMiniResumo("finalDebitos", debitosUsados, debitosUsados ? "negativo" : "neutro");
  atualizarMiniResumo("finalDevedores", devedoresUsados, devedoresUsados ? "negativo" : "neutro");
  atualizarMiniResumo("finalRecebimentos", recebimentos, recebimentos ? "positivo" : "neutro");
  atualizarMiniResumo("finalFirma", firma, firma > 0 ? "positivo" : firma < 0 ? "negativo" : "neutro");
}

function gerarRelatorioHTML() {
  const dados = obterCamposPrincipais();

  const periodo = dados.periodo || "-";
  const turano = converterTextoParaNumero(dados.turano);
  const rc = converterTextoParaNumero(dados.rc);
  const centro = converterTextoParaNumero(dados.centro);
  const total = converterTextoParaNumero(dados.total);
  const comissao = converterTextoParaNumero(dados.comissao);
  const cartaoPassado = converterTextoParaNumero(dados.cartaoPassado);
  const cartaoAtual = converterTextoParaNumero(dados.cartaoAtual);
  const debitosCampo = converterTextoParaNumero(dados.debitosResumo);
  const devedoresCampo = converterTextoParaNumero(dados.devedoresResumo);
  const recebimentos = converterTextoParaNumero(dados.recebimentosAnteriores);
  const firma = converterTextoParaNumero(dados.firma);

  const totalDebitos = debitosCampo || somarDebitosLista();
  const totalDevedores = devedoresCampo || somarDevedoresLista();

  const linhasDebitos = estado.debitos.length
    ? estado.debitos.map(item => `
        <tr>
          <td>${escapeHtml(item.descricao || "-")}</td>
          <td>${escapeHtml(item.conta || "-")}</td>
          <td class="${converterTextoParaNumero(item.valor) < 0 ? "valor-negativo" : "valor-neutro"}">
            ${moedaBR(converterTextoParaNumero(item.valor))}
          </td>
        </tr>
      `).join("")
    : `
      <tr>
        <td colspan="3">Nenhum débito lançado.</td>
      </tr>
    `;

  const linhasDevedores = estado.devedores.length
    ? estado.devedores.map(item => `
        <tr>
          <td>${escapeHtml(item.ponto || "-")}</td>
          <td>${moedaBR(converterTextoParaNumero(item.valorAnterior))}</td>
          <td>${moedaBR(converterTextoParaNumero(item.pagamento))}</td>
          <td>${moedaBR(converterTextoParaNumero(item.novoDebito))}</td>
          <td>${moedaBR(converterTextoParaNumero(item.valorAtual))}</td>
        </tr>
      `).join("")
    : `
      <tr>
        <td colspan="5">Nenhum devedor lançado.</td>
      </tr>
    `;

  return `
    <div class="relatorio">
      <div class="relatorio-topo">
        <h2>Fechamento</h2>
        <p><strong>Período:</strong> ${escapeHtml(periodo)}</p>
        <p><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
      </div>

      <div class="relatorio-cards">
        <div class="rel-card">
          <div class="r1">Total</div>
          <div class="r2">${moedaBR(total)}</div>
        </div>

        <div class="rel-card">
          <div class="r1">Comissão</div>
          <div class="r2">${moedaBR(comissao)}</div>
        </div>

        <div class="rel-card">
          <div class="r1">Firma</div>
          <div class="r2 ${firma < 0 ? "valor-negativo" : "valor-positivo"}">${moedaBR(firma)}</div>
        </div>
      </div>

      <div class="secao-relatorio">
        <h3>Origem dos Valores</h3>
        <table class="tabela-relatorio">
          <thead>
            <tr>
              <th>Turano</th>
              <th>RC</th>
              <th>Centro</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${moedaBR(turano)}</td>
              <td>${moedaBR(rc)}</td>
              <td>${moedaBR(centro)}</td>
              <td>${moedaBR(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="secao-relatorio">
        <h3>Débitos</h3>
        <table class="tabela-relatorio">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Conta</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${linhasDebitos}
          </tbody>
        </table>
      </div>

      <div class="secao-relatorio">
        <h3>Devedores</h3>
        <table class="tabela-relatorio">
          <thead>
            <tr>
              <th>Ponto</th>
              <th>Valor Ant.</th>
              <th>PG</th>
              <th>Novo Déb.</th>
              <th>Valor Att.</th>
            </tr>
          </thead>
          <tbody>
            ${linhasDevedores}
          </tbody>
        </table>
      </div>

      <div class="rodape-relatorio">
        <div class="linha"><span>Cartão Passado</span><strong>${moedaBR(cartaoPassado)}</strong></div>
        <div class="linha"><span>Cartão Atual</span><strong class="${cartaoAtual < 0 ? "valor-negativo" : "valor-neutro"}">${moedaBR(cartaoAtual)}</strong></div>
        <div class="linha"><span>Débitos</span><strong class="valor-negativo">${moedaBR(totalDebitos)}</strong></div>
        <div class="linha"><span>Devedores</span><strong class="valor-negativo">${moedaBR(totalDevedores)}</strong></div>
        <div class="linha"><span>Dev. Ant. Receb.</span><strong class="valor-positivo">${moedaBR(recebimentos)}</strong></div>
        <div class="linha"><span>Firma</span><strong>${moedaBR(firma)}</strong></div>
      </div>
    </div>
  `;
}

function abrirModalRelatorio() {
  conteudoRelatorio.innerHTML = gerarRelatorioHTML();
  modalRelatorio.classList.add("ativo");
}

function fecharModalRelatorio() {
  modalRelatorio.classList.remove("ativo");
}

function salvarTudo() {
  const dados = {
    principais: obterCamposPrincipais(),
    debitos: estado.debitos,
    devedores: estado.devedores
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function carregarTudo() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) {
    renderizarDebitos();
    renderizarDevedores();
    atualizarResumo();
    return;
  }

  try {
    const dados = JSON.parse(salvo);

    if (dados.principais) {
      camposPrincipaisIds.forEach(id => {
        obterCampo(id).value = dados.principais[id] || "";
      });
    }

    estado.debitos = Array.isArray(dados.debitos) ? dados.debitos : [];
    estado.devedores = Array.isArray(dados.devedores) ? dados.devedores : [];

    renderizarDebitos();
    renderizarDevedores();
    atualizarResumo();
  } catch {
    renderizarDebitos();
    renderizarDevedores();
    atualizarResumo();
  }
}

function limparTudo() {
  const confirmou = window.confirm("Deseja limpar todo o fechamento?");
  if (!confirmou) return;

  camposPrincipaisIds.forEach(id => {
    obterCampo(id).value = "";
  });

  estado.debitos = [];
  estado.devedores = [];

  localStorage.removeItem(STORAGE_KEY);

  renderizarDebitos();
  renderizarDevedores();
  atualizarResumo();
  fecharModalRelatorio();
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function registrarEventosCamposPrincipais() {
  camposPrincipaisIds.forEach(id => {
    const campo = obterCampo(id);

    if (id === "periodo") {
      campo.addEventListener("input", () => {
        atualizarResumo();
        salvarTudo();
      });
    } else {
      campo.addEventListener("blur", () => {
        atualizarResumo();
        salvarTudo();
      });
    }
  });
}

window.removerDebito = removerDebito;
window.removerDevedor = removerDevedor;
window.atualizarCampoDebito = atualizarCampoDebito;
window.atualizarCampoDevedor = atualizarCampoDevedor;

btnAdicionarDebito.addEventListener("click", () => adicionarDebito());
btnAdicionarDevedor.addEventListener("click", () => adicionarDevedor());
btnVisualizarResumo.addEventListener("click", abrirModalRelatorio);
btnGerarRelatorio.addEventListener("click", abrirModalRelatorio);
btnFecharModal.addEventListener("click", fecharModalRelatorio);
btnLimparTudo.addEventListener("click", limparTudo);

btnImprimir.addEventListener("click", () => {
  abrirModalRelatorio();
  setTimeout(() => window.print(), 150);
});

modalRelatorio.addEventListener("click", (event) => {
  if (event.target === modalRelatorio) {
    fecharModalRelatorio();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    fecharModalRelatorio();
  }
});

aplicarMascaraMoedaNosCampos();
registrarEventosCamposPrincipais();
carregarTudo();