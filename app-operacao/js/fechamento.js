const STORAGE_KEY = "fechamento_dados_v1";

function num(v) {
  if (v == null) return 0;

  const texto = String(v).trim();

  if (!texto) return 0;

  return Number(
    texto
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  ) || 0;
}

function moeda(v) {
  const valor = Number(v) || 0;
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarMoedaDigitada(valor) {
  const somenteDigitos = String(valor || "").replace(/\D/g, "");

  if (!somenteDigitos) return "0,00";

  const numero = Number(somenteDigitos) / 100;

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function aplicarMascaraMoeda(input) {
  if (!input) return;

  if (input.dataset.maskApplied === "true") return;
  input.dataset.maskApplied = "true";

  input.addEventListener("focus", () => {
    if (!input.value.trim()) {
      input.value = "0,00";
    }
  });

  input.addEventListener("input", () => {
    input.value = formatarMoedaDigitada(input.value);
    atualizarResumo();
    salvarDados();
  });

  input.addEventListener("blur", () => {
    if (!input.value.trim()) {
      input.value = "0,00";
    } else {
      input.value = formatarMoedaDigitada(input.value);
    }

    atualizarResumo();
    salvarDados();
  });
}

function configurarCampoTexto(input) {
  if (!input) return;

  if (input.dataset.textConfigured === "true") return;
  input.dataset.textConfigured = "true";

  input.addEventListener("input", () => {
    salvarDados();
    atualizarResumo();
  });

  input.addEventListener("blur", salvarDados);
}

function valorCampo(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return num(el.value);
}

function textoCampo(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return el.value.trim();
}

function atualizarCampo(id, valor) {
  const campo = document.getElementById(id);
  if (!campo) return;
  campo.value = formatarMoedaDigitada(Math.round((Number(valor) || 0) * 100));
}

function atualizarTexto(id, valor, classe = "") {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = moeda(valor);

  el.classList.remove("valor-negativo", "valor-positivo", "valor-neutro");

  if (classe) {
    el.classList.add(classe);
    return;
  }

  if (valor < 0) {
    el.classList.add("valor-negativo");
  } else if (valor > 0) {
    el.classList.add("valor-positivo");
  } else {
    el.classList.add("valor-neutro");
  }
}

function atualizarCard(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = moeda(valor);
  el.classList.remove("negativo", "positivo");

  if (valor < 0) {
    el.classList.add("negativo");
  } else if (valor > 0) {
    el.classList.add("positivo");
  }
}

function somarDebitos() {
  let total = 0;

  document.querySelectorAll(".debitoValor").forEach((input) => {
    total += num(input.value);
  });

  return total;
}

function somarDevedores() {
  let total = 0;

  document.querySelectorAll(".devedorLinha").forEach((linha) => {
    const anterior = num(linha.querySelector(".valorAnterior")?.value);
    const atual = num(linha.querySelector(".valorAtual")?.value);

    total += anterior - atual;
  });

  return total;
}

function obterDebitos() {
  return Array.from(document.querySelectorAll(".debitoLinha")).map((linha) => ({
    nome: linha.querySelector(".debitoNome")?.value?.trim() || "",
    valor: linha.querySelector(".debitoValor")?.value?.trim() || "0,00"
  }));
}

function obterDevedores() {
  return Array.from(document.querySelectorAll(".devedorLinha")).map((linha) => ({
    nome: linha.querySelector(".devedorNome")?.value?.trim() || "",
    anterior: linha.querySelector(".valorAnterior")?.value?.trim() || "0,00",
    atual: linha.querySelector(".valorAtual")?.value?.trim() || "0,00"
  }));
}

function atualizarResumo() {
  const turano = valorCampo("turano");
  const rc = valorCampo("rc");
  const centro = valorCampo("centro");

  const totalRota = turano + rc + centro;

  const comissao = totalRota > 0 ? (totalRota / 0.915) - totalRota : 0;

  const cartaoPassado = valorCampo("cartaoPassado");
  const cartaoPassadoLiquido = cartaoPassado * 0.95;

  const cartaoAtual = valorCampo("cartaoAtual");
  const devAntReceb = valorCampo("recebimentosAnteriores");

  const debitos = somarDebitos();
  const devedores = somarDevedores();

  const firma =
    totalRota +
    cartaoPassadoLiquido -
    cartaoAtual -
    debitos +
    devedores +
    devAntReceb;

  atualizarCampo("total", totalRota);
  atualizarCampo("comissao", comissao);
  atualizarCampo("debitosResumo", debitos);
  atualizarCampo("devedoresResumo", devedores);
  atualizarCampo("firma", firma);

  atualizarCard("cardTotal", totalRota);
  atualizarCard("cardComissao", comissao);
  atualizarCard("cardSaidas", debitos + devedores);
  atualizarCard("cardFirma", firma);

  atualizarTexto("resTurano", turano, turano > 0 ? "valor-positivo" : "valor-neutro");
  atualizarTexto("resRc", rc, rc > 0 ? "valor-positivo" : "valor-neutro");
  atualizarTexto("resCentro", centro, centro > 0 ? "valor-positivo" : "valor-neutro");

  atualizarTexto("resCartaoPassado", cartaoPassadoLiquido, cartaoPassadoLiquido > 0 ? "valor-positivo" : "valor-neutro");
  atualizarTexto("resCartaoAtual", cartaoAtual, cartaoAtual > 0 ? "valor-negativo" : "valor-neutro");
  atualizarTexto("resRecebimentos", devAntReceb, devAntReceb > 0 ? "valor-positivo" : "valor-neutro");

  atualizarTexto("finalTotal", totalRota);
  atualizarTexto("finalComissao", comissao, comissao > 0 ? "valor-negativo" : "valor-neutro");
  atualizarTexto("finalCartaoPassado", cartaoPassadoLiquido, cartaoPassadoLiquido > 0 ? "valor-positivo" : "valor-neutro");
  atualizarTexto("finalCartaoAtual", cartaoAtual, cartaoAtual > 0 ? "valor-negativo" : "valor-neutro");
  atualizarTexto("finalDebitos", debitos, debitos > 0 ? "valor-negativo" : "valor-neutro");
  atualizarTexto("finalDevedores", devedores, devedores !== 0 ? (devedores < 0 ? "valor-positivo" : "valor-negativo") : "valor-neutro");
  atualizarTexto("finalRecebimentos", devAntReceb, devAntReceb > 0 ? "valor-positivo" : "valor-neutro");
  atualizarTexto("finalFirma", firma);

  atualizarEstadosVazios();
}

function atualizarEstadosVazios() {
  const listaDebitos = document.getElementById("listaDebitos");
  const listaDevedores = document.getElementById("listaDevedores");

  if (listaDebitos && !listaDebitos.querySelector(".debitoLinha")) {
    listaDebitos.innerHTML = `<div class="estado-vazio" id="vazioDebitos">Nenhum débito adicionado.</div>`;
  } else {
    document.getElementById("vazioDebitos")?.remove();
  }

  if (listaDevedores && !listaDevedores.querySelector(".devedorLinha")) {
    listaDevedores.innerHTML = `<div class="estado-vazio" id="vazioDevedores">Nenhum devedor adicionado.</div>`;
  } else {
    document.getElementById("vazioDevedores")?.remove();
  }
}

function criarLinhaDebito(dados = {}) {
  document.getElementById("vazioDebitos")?.remove();

  const linha = document.createElement("div");
  linha.className = "linha-item debitoLinha";

  linha.innerHTML = `
    <div class="subtitulo-lista">
      <span><i class="fas fa-minus-circle"></i> Débito</span>
      <button class="btn btn-vermelho btnRemoverDebito" type="button">
        <i class="fas fa-trash"></i>
        Remover
      </button>
    </div>

    <div class="grid-2">
      <div class="campo">
        <label>Nome / Descrição</label>
        <input type="text" class="debitoNome" placeholder="Ex.: Adiantamento" value="${escapeHtml(dados.nome || "")}">
      </div>

      <div class="campo">
        <label>Valor</label>
        <input type="text" class="debitoValor" inputmode="numeric" placeholder="0,00" value="${escapeHtml(dados.valor || "0,00")}">
      </div>
    </div>
  `;

  const btnRemover = linha.querySelector(".btnRemoverDebito");
  const nome = linha.querySelector(".debitoNome");
  const valor = linha.querySelector(".debitoValor");

  btnRemover.addEventListener("click", () => {
    linha.remove();
    atualizarEstadosVazios();
    atualizarResumo();
    salvarDados();
  });

  configurarCampoTexto(nome);
  aplicarMascaraMoeda(valor);

  document.getElementById("listaDebitos").appendChild(linha);

  valor.value = formatarMoedaDigitada(valor.value);
  atualizarResumo();
  salvarDados();
}

function criarLinhaDevedor(dados = {}) {
  document.getElementById("vazioDevedores")?.remove();

  const linha = document.createElement("div");
  linha.className = "linha-item devedorLinha";

  linha.innerHTML = `
    <div class="subtitulo-lista">
      <span><i class="fas fa-user-minus"></i> Devedor</span>
      <button class="btn btn-vermelho btnRemoverDevedor" type="button">
        <i class="fas fa-trash"></i>
        Remover
      </button>
    </div>

    <div class="grid-3">
      <div class="campo">
        <label>Nome</label>
        <input type="text" class="devedorNome" placeholder="Ex.: Gaspar" value="${escapeHtml(dados.nome || "")}">
      </div>

      <div class="campo">
        <label>Valor Anterior</label>
        <input type="text" class="valorAnterior" inputmode="numeric" placeholder="0,00" value="${escapeHtml(dados.anterior || "0,00")}">
      </div>

      <div class="campo">
        <label>Valor Atual</label>
        <input type="text" class="valorAtual" inputmode="numeric" placeholder="0,00" value="${escapeHtml(dados.atual || "0,00")}">
      </div>
    </div>
  `;

  const btnRemover = linha.querySelector(".btnRemoverDevedor");
  const nome = linha.querySelector(".devedorNome");
  const anterior = linha.querySelector(".valorAnterior");
  const atual = linha.querySelector(".valorAtual");

  btnRemover.addEventListener("click", () => {
    linha.remove();
    atualizarEstadosVazios();
    atualizarResumo();
    salvarDados();
  });

  configurarCampoTexto(nome);
  aplicarMascaraMoeda(anterior);
  aplicarMascaraMoeda(atual);

  document.getElementById("listaDevedores").appendChild(linha);

  anterior.value = formatarMoedaDigitada(anterior.value);
  atual.value = formatarMoedaDigitada(atual.value);

  atualizarResumo();
  salvarDados();
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function coletarDados() {
  return {
    periodo: textoCampo("periodo"),
    turano: document.getElementById("turano")?.value || "0,00",
    rc: document.getElementById("rc")?.value || "0,00",
    centro: document.getElementById("centro")?.value || "0,00",
    cartaoPassado: document.getElementById("cartaoPassado")?.value || "0,00",
    cartaoAtual: document.getElementById("cartaoAtual")?.value || "0,00",
    recebimentosAnteriores: document.getElementById("recebimentosAnteriores")?.value || "0,00",
    debitos: obterDebitos(),
    devedores: obterDevedores()
  };
}

function salvarDados() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coletarDados()));
  } catch (erro) {
    console.warn("Não foi possível salvar o fechamento no localStorage.", erro);
  }
}

function carregarDados() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return null;
    return JSON.parse(bruto);
  } catch (erro) {
    console.warn("Não foi possível carregar os dados salvos.", erro);
    return null;
  }
}

function preencherCampo(id, valor, mascara = false) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = valor || (mascara ? "0,00" : "");
  if (mascara) {
    el.value = formatarMoedaDigitada(el.value);
  }
}

function restaurarDados() {
  const dados = carregarDados();
  if (!dados) {
    atualizarEstadosVazios();
    atualizarResumo();
    return;
  }

  preencherCampo("periodo", dados.periodo || "");
  preencherCampo("turano", dados.turano || "0,00", true);
  preencherCampo("rc", dados.rc || "0,00", true);
  preencherCampo("centro", dados.centro || "0,00", true);
  preencherCampo("cartaoPassado", dados.cartaoPassado || "0,00", true);
  preencherCampo("cartaoAtual", dados.cartaoAtual || "0,00", true);
  preencherCampo("recebimentosAnteriores", dados.recebimentosAnteriores || "0,00", true);

  document.getElementById("listaDebitos").innerHTML = "";
  document.getElementById("listaDevedores").innerHTML = "";

  (dados.debitos || []).forEach((item) => criarLinhaDebito(item));
  (dados.devedores || []).forEach((item) => criarLinhaDevedor(item));

  atualizarEstadosVazios();
  atualizarResumo();
}

function limparTudo() {
  const confirmado = window.confirm("Deseja limpar todo o fechamento?");
  if (!confirmado) return;

  localStorage.removeItem(STORAGE_KEY);

  preencherCampo("periodo", "");
  preencherCampo("turano", "0,00", true);
  preencherCampo("rc", "0,00", true);
  preencherCampo("centro", "0,00", true);
  preencherCampo("cartaoPassado", "0,00", true);
  preencherCampo("cartaoAtual", "0,00", true);
  preencherCampo("recebimentosAnteriores", "0,00", true);

  document.getElementById("listaDebitos").innerHTML = "";
  document.getElementById("listaDevedores").innerHTML = "";

  atualizarEstadosVazios();
  atualizarResumo();
}

function gerarHtmlRelatorio() {
  const periodo = textoCampo("periodo") || "-";

  const turano = valorCampo("turano");
  const rc = valorCampo("rc");
  const centro = valorCampo("centro");
  const total = valorCampo("total");
  const comissao = valorCampo("comissao");
  const cartaoPassado = valorCampo("cartaoPassado");
  const cartaoPassadoLiquido = cartaoPassado * 0.95;
  const cartaoAtual = valorCampo("cartaoAtual");
  const debitos = valorCampo("debitosResumo");
  const devedores = valorCampo("devedoresResumo");
  const recebimentos = valorCampo("recebimentosAnteriores");
  const firma = valorCampo("firma");

  const debitosLista = obterDebitos();
  const devedoresLista = obterDevedores();

  const htmlDebitos = debitosLista.length
    ? debitosLista.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(item.nome || "-")}</td>
          <td>${moeda(num(item.valor))}</td>
        </tr>
      `).join("")
    : `
      <tr>
        <td colspan="3">Nenhum débito informado.</td>
      </tr>
    `;

  const htmlDevedores = devedoresLista.length
    ? devedoresLista.map((item, i) => {
        const anterior = num(item.anterior);
        const atual = num(item.atual);
        const saldo = anterior - atual;

        return `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(item.nome || "-")}</td>
            <td>${moeda(anterior)}</td>
            <td>${moeda(atual)}</td>
            <td class="${saldo < 0 ? "valor-positivo" : saldo > 0 ? "valor-negativo" : "valor-neutro"}">${moeda(saldo)}</td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="5">Nenhum devedor informado.</td>
      </tr>
    `;

  return `
    <div class="relatorio">
      <div class="relatorio-topo">
        <h2>Resumo de Fechamento</h2>
        <p><strong>Período:</strong> ${escapeHtml(periodo)}</p>
      </div>

      <div class="relatorio-cards">
        <div class="rel-card">
          <div class="r1">Total</div>
          <div class="r2">${moeda(total)}</div>
        </div>

        <div class="rel-card">
          <div class="r1">Comissão</div>
          <div class="r2">${moeda(comissao)}</div>
        </div>

        <div class="rel-card">
          <div class="r1">Firma</div>
          <div class="r2">${moeda(firma)}</div>
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
              <td>${moeda(turano)}</td>
              <td>${moeda(rc)}</td>
              <td>${moeda(centro)}</td>
              <td>${moeda(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="secao-relatorio">
        <h3>Débitos</h3>
        <table class="tabela-relatorio">
          <thead>
            <tr>
              <th>#</th>
              <th>Descrição</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${htmlDebitos}
          </tbody>
        </table>
      </div>

      <div class="secao-relatorio">
        <h3>Devedores</h3>
        <table class="tabela-relatorio">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Anterior</th>
              <th>Atual</th>
              <th>Saldo da Semana</th>
            </tr>
          </thead>
          <tbody>
            ${htmlDevedores}
          </tbody>
        </table>
      </div>

      <div class="rodape-relatorio">
        <div class="linha"><span>Cartão Passado (líquido 95%)</span><strong>${moeda(cartaoPassadoLiquido)}</strong></div>
        <div class="linha"><span>Cartão Atual</span><strong>${moeda(cartaoAtual)}</strong></div>
        <div class="linha"><span>Débitos</span><strong>${moeda(debitos)}</strong></div>
        <div class="linha"><span>Devedores</span><strong>${moeda(devedores)}</strong></div>
        <div class="linha"><span>Dev. Ant. Receb.</span><strong>${moeda(recebimentos)}</strong></div>
        <div class="linha"><span>Firma</span><strong>${moeda(firma)}</strong></div>
      </div>
    </div>
  `;
}

function abrirModalRelatorio() {
  const modal = document.getElementById("modalRelatorio");
  const conteudo = document.getElementById("conteudoRelatorio");

  if (!modal || !conteudo) return;

  conteudo.innerHTML = gerarHtmlRelatorio();
  modal.classList.add("ativo");
}

function fecharModalRelatorio() {
  const modal = document.getElementById("modalRelatorio");
  if (!modal) return;
  modal.classList.remove("ativo");
}

function imprimirRelatorio() {
  abrirModalRelatorio();

  setTimeout(() => {
    window.print();
  }, 150);
}

function configurarCamposFixos() {
  const camposTexto = ["periodo"];
  const camposMoeda = [
    "turano",
    "rc",
    "centro",
    "cartaoPassado",
    "cartaoAtual",
    "recebimentosAnteriores"
  ];

  camposTexto.forEach((id) => {
    configurarCampoTexto(document.getElementById(id));
  });

  camposMoeda.forEach((id) => {
    const input = document.getElementById(id);
    aplicarMascaraMoeda(input);

    if (!input.value.trim()) {
      input.value = "0,00";
    } else {
      input.value = formatarMoedaDigitada(input.value);
    }
  });

  ["total", "comissao", "debitosResumo", "devedoresResumo", "firma"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.readOnly = true;
    input.tabIndex = -1;
  });
}

function configurarBotoes() {
  document.getElementById("btnAdicionarDebito")?.addEventListener("click", () => {
    criarLinhaDebito();
  });

  document.getElementById("btnAdicionarDevedor")?.addEventListener("click", () => {
    criarLinhaDevedor();
  });

  document.getElementById("btnVisualizarResumo")?.addEventListener("click", abrirModalRelatorio);
  document.getElementById("btnGerarRelatorio")?.addEventListener("click", abrirModalRelatorio);
  document.getElementById("btnImprimir")?.addEventListener("click", imprimirRelatorio);
  document.getElementById("btnFecharModal")?.addEventListener("click", fecharModalRelatorio);
  document.getElementById("btnLimparTudo")?.addEventListener("click", limparTudo);

  document.getElementById("modalRelatorio")?.addEventListener("click", (e) => {
    if (e.target.id === "modalRelatorio") {
      fecharModalRelatorio();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharModalRelatorio();
    }
  });
}

function init() {
  configurarCamposFixos();
  configurarBotoes();
  atualizarEstadosVazios();
  restaurarDados();
  atualizarResumo();
}

document.addEventListener("DOMContentLoaded", init);