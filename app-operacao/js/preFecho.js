// preFecho.js
// Script do Pré-Fecho com persistência em localStorage

const STORAGE_KEY = "preFecho_dados_v1";
let contadorMaquinas = 0;

document.addEventListener("DOMContentLoaded", () => {
  const inputData = document.getElementById("data");
  const inputCliente = document.getElementById("cliente");
  const btnAdicionar = document.getElementById("btnAdicionar");
  const btnRelatorio = document.getElementById("btnRelatorio");
  const btnLimpar = document.getElementById("btnLimpar");
  const listaMaquinas = document.getElementById("listaMaquinas");
  const totalGeralEl = document.getElementById("totalGeral");
  const modal = document.getElementById("modalRelatorio");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relatorioConteudo = document.getElementById("relatorioConteudo");

  // Data atual (se não tiver nada salvo ainda)
  if (inputData && !inputData.value) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    inputData.value = `${dia}/${mes}/${ano}`;
  }

  // Eventos para salvar quando mudar data / cliente
  if (inputData) {
    inputData.addEventListener("input", salvarNoStorage);
    inputData.addEventListener("change", salvarNoStorage);
  }
  if (inputCliente) {
    inputCliente.addEventListener("input", salvarNoStorage);
    inputCliente.addEventListener("change", salvarNoStorage);
  }

  // Botão adicionar máquina
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", () => {
      adicionarMaquina(listaMaquinas, totalGeralEl);
      salvarNoStorage();
      reposicionarBarraAcoes();
    });
  }

  // Botão relatório
  if (btnRelatorio) {
    btnRelatorio.addEventListener("click", () => {
      abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal);
    });
  }

  // Botão limpar tudo
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      if (!confirm("Tem certeza que deseja limpar tudo?")) return;

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error("Erro ao limpar storage do pré-fecho:", e);
      }

      const inputData = document.getElementById("data");
      const inputCliente = document.getElementById("cliente");
      const lista = document.getElementById("listaMaquinas");
      const totalEl = document.getElementById("totalGeral");

      if (inputCliente) inputCliente.value = "";

      if (inputData) {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, "0");
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = hoje.getFullYear();
        inputData.value = `${dia}/${mes}/${ano}`;
      }

      if (lista) lista.innerHTML = "";
      contadorMaquinas = 0;

      if (totalEl) {
        totalEl.textContent = "TOTAL: R$ 0,00";
        totalEl.classList.remove("positivo", "negativo");
      }

      reposicionarBarraAcoes();
    });
  }

  // Fechar modal
  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", () => {
      modal.classList.remove("aberta");
    });
  }

  // Fechar modal clicando no fundo
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("aberta");
      }
    });
  }

  // Carregar dados salvos (se existirem)
  carregarDoStorage(listaMaquinas, totalGeralEl);

  // Garantir que a barra de ações fique logo após a lista de máquinas
  reposicionarBarraAcoes();
});

/* ===========================
   Barra de ações abaixo da última máquina
=========================== */

function reposicionarBarraAcoes() {
  const lista = document.getElementById("listaMaquinas");
  const acoes = document.querySelector(".acoes");
  if (!lista || !acoes) return;

  const main = lista.parentElement;
  if (!main) return;
  const proximo = lista.nextSibling;
  if (proximo === acoes) return;

  main.insertBefore(acoes, lista.nextSibling);
}

/* ===========================
   Criação de Máquina
=========================== */

function adicionarMaquina(listaMaquinas, totalGeralEl, dadosMaquina = null) {
  contadorMaquinas++;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${contadorMaquinas}</span>
      <div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
        <small>preencha os relógios e veja o resultado</small>
        <button type="button" class="btn-remover" title="Remover máquina"
                style="border:none;background:transparent;color:#999;cursor:pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="linha">
      <label style="min-width:50px;" for="selo-${contadorMaquinas}">Selo:</label>
      <input id="selo-${contadorMaquinas}" type="text" class="inp-selo" placeholder="código da máquina">
    </div>

    <div class="linha">
      <label style="min-width:50px;" for="jogo-${contadorMaquinas}">Jogo:</label>
      <input id="jogo-${contadorMaquinas}" type="text" class="inp-jogo" placeholder="tipo de jogo">
    </div>

    <div class="grid">
      <div class="col">
        <h4>Entrada</h4>
        <div class="linha2">
          <input type="text" class="entrada-anterior" placeholder="Anterior" inputmode="numeric">
          <input type="text" class="entrada-atual" placeholder="Atual" inputmode="numeric">
        </div>
        <div class="dif">
          Diferença: <span class="dif-entrada">R$ 0,00</span>
        </div>
      </div>

      <div class="divv"></div>

      <div class="col">
        <h4>Saída</h4>
        <div class="linha2">
          <input type="text" class="saida-anterior" placeholder="Anterior" inputmode="numeric">
          <input type="text" class="saida-atual" placeholder="Atual" inputmode="numeric">
        </div>
        <div class="dif">
          Diferença: <span class="dif-saida">R$ 0,00</span>
        </div>
      </div>
    </div>

    <div style="margin-top:8px;font-weight:700;">
      Resultado: <span class="resultado-maquina">R$ 0,00</span>
    </div>
  `;

  listaMaquinas.appendChild(card);

  const btnRemover = card.querySelector(".btn-remover");
  if (btnRemover) {
    btnRemover.addEventListener("click", () => {
      card.remove();
      atualizarTotalGeral(totalGeralEl);
      salvarNoStorage();
      reposicionarBarraAcoes();
    });
  }

  const seloInput = card.querySelector(".inp-selo");
  const jogoInput = card.querySelector(".inp-jogo");
  const entradaAnterior = card.querySelector(".entrada-anterior");
  const entradaAtual = card.querySelector(".entrada-atual");
  const saidaAnterior = card.querySelector(".saida-anterior");
  const saidaAtual = card.querySelector(".saida-atual");
  const spanDifEntrada = card.querySelector(".dif-entrada");
  const spanDifSaida = card.querySelector(".dif-saida");
  const spanResultado = card.querySelector(".resultado-maquina");

  const atualizarCalculos = () => {
    const entAnt = parseNumero(entradaAnterior.value);
    const entAt = parseNumero(entradaAtual.value);
    const saiAnt = parseNumero(saidaAnterior.value);
    const saiAt = parseNumero(saidaAtual.value);

    // diferenças brutas de relógio
    const difEntradaBruta = entAt - entAnt;
    const difSaidaBruta   = saiAt - saiAnt;

    // conversão para reais (2 últimos dígitos = centavos)
    // entrada sempre positiva, saída sempre negativa
    const entradaReais = Math.abs(difEntradaBruta) / 100;
    const saidaReais   = -Math.abs(difSaidaBruta) / 100;

    const resultado = entradaReais + saidaReais;

    spanDifEntrada.textContent = formatarMoeda(entradaReais);
    spanDifSaida.textContent   = formatarMoeda(saidaReais);

    spanResultado.textContent = formatarMoeda(resultado);
    aplicarCorValor(spanResultado, resultado);

    atualizarTotalGeral(totalGeralEl);
    salvarNoStorage();
  };

  // Campos de relógio: só números + recalcula
  [entradaAnterior, entradaAtual, saidaAnterior, saidaAtual].forEach((inp) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, ""); // só dígitos
      atualizarCalculos();
    });
    inp.addEventListener("change", () => {
      inp.value = inp.value.replace(/\D/g, "");
      atualizarCalculos();
    });
  });

  [seloInput, jogoInput].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("input", salvarNoStorage);
    inp.addEventListener("change", salvarNoStorage);
  });

  // preenche com dados salvos (caso venha do storage)
  if (dadosMaquina) {
    if (seloInput)        seloInput.value        = dadosMaquina.selo || "";
    if (jogoInput)        jogoInput.value        = dadosMaquina.jogo || "";
    if (entradaAnterior)  entradaAnterior.value  = dadosMaquina.entradaAnterior || "";
    if (entradaAtual)     entradaAtual.value     = dadosMaquina.entradaAtual || "";
    if (saidaAnterior)    saidaAnterior.value    = dadosMaquina.saidaAnterior || "";
    if (saidaAtual)       saidaAtual.value       = dadosMaquina.saidaAtual || "";

    atualizarCalculos();
  }
}

/* ===========================
   TOTAL GERAL
=========================== */

function atualizarTotalGeral(totalGeralEl) {
  let total = 0;

  document.querySelectorAll(".resultado-maquina").forEach((span) => {
    const valor = moedaParaNumero(span.textContent);
    if (!isNaN(valor)) total += valor;
  });

  totalGeralEl.textContent = `TOTAL: ${formatarMoeda(total)}`;
  aplicarCorValor(totalGeralEl, total);
}

/* ===========================
   RELATÓRIO (MODAL) – COMPACTO
=========================== */

function abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal) {
  const data = inputData?.value || "";
  const cliente = (inputCliente?.value || "").trim().toUpperCase();

  let html = "";

  html += `<div style="margin-bottom:4px;"><strong>DATA:</strong> ${escapeHtml(data)}</div>`;
  html += `<div style="margin-bottom:6px;"><strong>CLIENTE:</strong> ${escapeHtml(cliente || "-")}</div>`;
  html += `<hr style="margin:4px 0 6px;">`;

  const cards = document.querySelectorAll(".card");
  if (!cards.length) {
    html += `<div style="margin-top:4px;">Nenhuma máquina lançada.</div>`;
  } else {
    cards.forEach((card, idx) => {
      const seloRaw = (card.querySelector(".inp-selo")?.value || "").trim();
      const jogoRaw = (card.querySelector(".inp-jogo")?.value || "").trim();

      const selo = seloRaw.toUpperCase();
      const jogo = jogoRaw.toUpperCase();

      const difEntradaTxt = card.querySelector(".dif-entrada")?.textContent || "R$ 0,00";
      const difSaidaTxt   = card.querySelector(".dif-saida")?.textContent   || "R$ 0,00";
      const resultadoTxt  = card.querySelector(".resultado-maquina")?.textContent || "R$ 0,00";

      const clsEnt = classeValorMonetario(difEntradaTxt);
      const clsSai = classeValorMonetario(difSaidaTxt);
      const clsRes = classeValorMonetario(resultadoTxt);

      html += `
        <div class="bloco-maquina">
          <div><strong>MÁQUINA ${idx + 1}</strong></div>
          <div>SELO: ${escapeHtml(selo || "-")}</div>
          <div>JOGO: ${escapeHtml(jogo || "-")}</div>
          <div>Dif. ENTRADA: <span class="${clsEnt}">${escapeHtml(difEntradaTxt)}</span></div>
          <div>Dif. SAÍDA: <span class="${clsSai}">${escapeHtml(difSaidaTxt)}</span></div>
          <div>RESULTADO: <span class="${clsRes}">${escapeHtml(resultadoTxt)}</span></div>
        </div>
      `;
    });
  }

  const totalTexto = totalGeralEl.textContent.replace(/^TOTAL:\s*/i, "");
  const clsTotal = classeValorMonetario(totalTexto);

  html += `
    <hr style="margin:6px 0 4px;">
    <div style="font-weight:800; font-size:0.95rem; text-align:right;">
      TOTAL: <span class="${clsTotal}">${escapeHtml(totalTexto)}</span>
    </div>
  `;

  relatorioConteudo.innerHTML = html;
  modal.classList.add("aberta");
}

/* ===========================
   Persistência em localStorage
=========================== */

function obterEstado() {
  const data = document.getElementById("data")?.value || "";
  const cliente = document.getElementById("cliente")?.value || "";

  const maquinas = [];
  document.querySelectorAll(".card").forEach((card) => {
    maquinas.push({
      selo: card.querySelector(".inp-selo")?.value || "",
      jogo: card.querySelector(".inp-jogo")?.value || "",
      entradaAnterior: card.querySelector(".entrada-anterior")?.value || "",
      entradaAtual: card.querySelector(".entrada-atual")?.value || "",
      saidaAnterior: card.querySelector(".saida-anterior")?.value || "",
      saidaAtual: card.querySelector(".saida-atual")?.value || "",
    });
  });

  return { data, cliente, maquinas };
}

function salvarNoStorage() {
  try {
    const dados = obterEstado();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {
    console.error("Erro ao salvar pré-fecho no storage:", e);
  }
}

function carregarDoStorage(listaMaquinas, totalGeralEl) {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return;

    const dados = JSON.parse(bruto);
    if (!dados || typeof dados !== "object") return;

    const inputData = document.getElementById("data");
    const inputCliente = document.getElementById("cliente");

    if (inputData && dados.data) inputData.value = dados.data;
    if (inputCliente && dados.cliente) inputCliente.value = dados.cliente;

    listaMaquinas.innerHTML = "";
    contadorMaquinas = 0;

    if (Array.isArray(dados.maquinas)) {
      dados.maquinas.forEach((m) => {
        adicionarMaquina(listaMaquinas, totalGeralEl, m);
      });
    }

    atualizarTotalGeral(totalGeralEl);
    reposicionarBarraAcoes();
  } catch (e) {
    console.error("Erro ao carregar pré-fecho do storage:", e);
  }
}

/* ===========================
   Helpers
=========================== */

function parseNumero(valor) {
  if (!valor) return 0;
  const limpo = valor
    .toString()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function formatarMoeda(n) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moedaParaNumero(txt) {
  if (!txt) return 0;
  const limpo = txt
    .toString()
    .replace(/[^0-9,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function aplicarCorValor(el, valor) {
  const LIMIAR = 0.005;
  el.classList.remove("positivo", "negativo");

  if (valor > LIMIAR) {
    el.classList.add("positivo");
  } else if (valor < -LIMIAR) {
    el.classList.add("negativo");
  }
}

function classeValorMonetario(txt) {
  const v = moedaParaNumero(txt);
  const LIMIAR = 0.005;
  if (v > LIMIAR) return "positivo";
  if (v < -LIMIAR) return "negativo";
  return "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
