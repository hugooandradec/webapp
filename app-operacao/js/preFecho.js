// preFecho.js

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

  const btnImportar = document.getElementById("btnImportar");
  const inputPrint = document.getElementById("inputPrintPre");

  // TEXTO
  const btnImportarTexto = document.getElementById("btnImportarTexto");
  const textoFonte = document.getElementById("textoFonte");

  if (inputData && !inputData.value) inputData.value = hojeBR();

  if (inputData) {
    inputData.addEventListener("input", salvarNoStorage);
    inputData.addEventListener("change", salvarNoStorage);
  }
  if (inputCliente) {
    inputCliente.addEventListener("input", () => {
      inputCliente.value = inputCliente.value.toUpperCase();
      salvarNoStorage();
    });
    inputCliente.addEventListener("change", salvarNoStorage);
  }

  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", () => {
      adicionarMaquina(listaMaquinas, totalGeralEl);
      salvarNoStorage();
      reposicionarBarraAcoes();
    });
  }

  if (btnRelatorio) {
    btnRelatorio.addEventListener("click", () => {
      abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal);
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      limparTudo(listaMaquinas, totalGeralEl);
      if (textoFonte) textoFonte.value = "";
    });
  }

  // ✅ IMPORTAR TEXTO
  if (btnImportarTexto) {
    btnImportarTexto.addEventListener("click", () => {
      const txt = (textoFonte?.value || "").trim();
      if (!txt) return alert("Cole o fechamento primeiro 🙂");
      importarTextoPre(txt, listaMaquinas, totalGeralEl, inputCliente);
      salvarNoStorage();
      reposicionarBarraAcoes();
    });
  }

  // OCR (legado)
  if (btnImportar && inputPrint) {
    btnImportar.addEventListener("click", () => inputPrint.click());
    inputPrint.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await importarPrintPre(file, listaMaquinas, totalGeralEl, inputCliente);
      inputPrint.value = "";
    });
  }

  if (btnFecharModal) btnFecharModal.addEventListener("click", () => modal.classList.remove("aberta"));
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("aberta"); });

  carregarDoStorage(listaMaquinas, totalGeralEl);
  reposicionarBarraAcoes();
});

function reposicionarBarraAcoes() {
  const lista = document.getElementById("listaMaquinas");
  const acoes = document.getElementById("acoesBar");
  if (!lista || !acoes) return;
  const main = lista.parentElement;
  if (!main) return;
  const proximo = lista.nextSibling;
  if (proximo === acoes) return;
  main.insertBefore(acoes, lista.nextSibling);
}

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
      <label style="min-width:50px;">Selo:</label>
      <input type="text" class="inp-selo" placeholder="código da máquina">
    </div>

    <div class="linha">
      <label style="min-width:50px;">Jogo:</label>
      <input type="text" class="inp-jogo" placeholder="tipo de jogo">
    </div>

    <div class="grid">
      <div class="col">
        <h4>Entrada</h4>
        <div class="linha2">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="entrada-anterior" placeholder="Anterior">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="entrada-atual" placeholder="Atual">
        </div>
        <div class="dif">Diferença: <span class="dif-entrada">R$ 0,00</span></div>
      </div>

      <div class="divv"></div>

      <div class="col">
        <h4>Saída</h4>
        <div class="linha2">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="saida-anterior" placeholder="Anterior">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="saida-atual" placeholder="Atual">
        </div>
        <div class="dif">Diferença: <span class="dif-saida">R$ 0,00</span></div>
      </div>
    </div>

    <div style="margin-top:8px;font-weight:700;">
      Resultado: <span class="resultado-maquina">R$ 0,00</span>
    </div>
  `;

  listaMaquinas.appendChild(card);

  const btnRemover = card.querySelector(".btn-remover");
  btnRemover?.addEventListener("click", () => {
    card.remove();
    atualizarTotalGeral(totalGeralEl);
    salvarNoStorage();
    reposicionarBarraAcoes();
  });

  const seloInput = card.querySelector(".inp-selo");
  const jogoInput = card.querySelector(".inp-jogo");
  const entradaAnterior = card.querySelector(".entrada-anterior");
  const entradaAtual = card.querySelector(".entrada-atual");
  const saidaAnterior = card.querySelector(".saida-anterior");
  const saidaAtual = card.querySelector(".saida-atual");
  const spanDifEntrada = card.querySelector(".dif-entrada");
  const spanDifSaida = card.querySelector(".dif-saida");
  const spanResultado = card.querySelector(".resultado-maquina");

  const sanitizarNumero = (el) => {
    if (!el) return;
    const soDigitos = (el.value || "").replace(/\D/g, "");
    if (el.value !== soDigitos) el.value = soDigitos;
  };

  const atualizarCalculos = () => {
    [entradaAnterior, entradaAtual, saidaAnterior, saidaAtual].forEach(sanitizarNumero);

    const entAnt = parseNumero(entradaAnterior.value);
    const entAt  = parseNumero(entradaAtual.value);
    const saiAnt = parseNumero(saidaAnterior.value);
    const saiAt  = parseNumero(saidaAtual.value);

    const difEntradaBruta = entAt - entAnt;
    const difSaidaBruta   = saiAt - saiAnt;

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

  [entradaAnterior, entradaAtual, saidaAnterior, saidaAtual].forEach((inp) => {
    inp.addEventListener("input", atualizarCalculos);
    inp.addEventListener("change", atualizarCalculos);
  });

  [seloInput, jogoInput].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("input", () => {
      inp.value = inp.value.toUpperCase();
      salvarNoStorage();
    });
    inp.addEventListener("change", salvarNoStorage);
  });

  if (dadosMaquina) {
    seloInput.value = (dadosMaquina.selo || "").toUpperCase();
    jogoInput.value = (dadosMaquina.jogo || "").toUpperCase();
    entradaAnterior.value = dadosMaquina.entradaAnterior || "";
    entradaAtual.value = dadosMaquina.entradaAtual || "";
    saidaAnterior.value = dadosMaquina.saidaAnterior || "";
    saidaAtual.value = dadosMaquina.saidaAtual || "";
    atualizarCalculos();
  }
}

function atualizarTotalGeral(totalGeralEl) {
  let total = 0;
  document.querySelectorAll(".resultado-maquina").forEach((span) => {
    const valor = moedaParaNumero(span.textContent);
    if (!isNaN(valor)) total += valor;
  });
  totalGeralEl.textContent = `TOTAL: ${formatarMoeda(total)}`;
  aplicarCorValor(totalGeralEl, total);
}

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
      const selo = (card.querySelector(".inp-selo")?.value || "").trim().toUpperCase();
      const jogo = (card.querySelector(".inp-jogo")?.value || "").trim().toUpperCase();
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

function limparTudo(listaMaquinas, totalGeralEl) {
  document.getElementById("cliente").value = "";
  document.getElementById("data").value = hojeBR();

  listaMaquinas.innerHTML = "";
  contadorMaquinas = 0;

  totalGeralEl.textContent = `TOTAL: ${formatarMoeda(0)}`;
  totalGeralEl.classList.remove("positivo", "negativo");

  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  reposicionarBarraAcoes();
}

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obterEstado()));
  } catch (e) {}
}

function carregarDoStorage(listaMaquinas, totalGeralEl) {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return;
    const dados = JSON.parse(bruto);

    const inputData = document.getElementById("data");
    const inputCliente = document.getElementById("cliente");

    if (inputData && dados.data) inputData.value = dados.data;
    if (inputCliente && dados.cliente) inputCliente.value = dados.cliente;

    listaMaquinas.innerHTML = "";
    contadorMaquinas = 0;

    (dados.maquinas || []).forEach((m) => adicionarMaquina(listaMaquinas, totalGeralEl, m));
    atualizarTotalGeral(totalGeralEl);
    reposicionarBarraAcoes();
  } catch (e) {}
}

/* ===========================
   ✅ IMPORTAR TEXTO (regra nova)
   - pega ponto
   - pega selo/jogo
   - pega SOMENTE a 2ª coluna (relógio “atual” do fechamento)
   - joga essa 2ª coluna no campo ANTERIOR do sistema
   - deixa os campos ATUAIS vazios
=========================== */
function importarTextoPre(txt, listaMaquinas, totalGeralEl, inputCliente) {
  const texto = (txt || "").toString();

  const nomePonto = extrairNomePonto(texto);
  if (nomePonto && inputCliente) inputCliente.value = nomePonto.toUpperCase();

  const maquinas = extrairMaquinasRelatorio(texto);

  if (!maquinas.length) {
    alert("Não consegui identificar nenhuma máquina nesse texto 😩");
    return;
  }

  listaMaquinas.innerHTML = "";
  contadorMaquinas = 0;

  maquinas.forEach((m) => {
    // ✅ regra nova: relógio do texto (2ª coluna) entra como ANTERIOR no sistema
    adicionarMaquina(listaMaquinas, totalGeralEl, {
      selo: m.selo,
      jogo: m.jogo,
      entradaAnterior: m.entradaFecho,   // <-- 2ª coluna E
      entradaAtual: "",                 // você digita na hora
      saidaAnterior: m.saidaFecho,      // <-- 2ª coluna S
      saidaAtual: "",                   // você digita na hora
    });
  });

  atualizarTotalGeral(totalGeralEl);
  salvarNoStorage();
  reposicionarBarraAcoes();
}

function extrairNomePonto(texto) {
  const linhas = texto.replace(/\r/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);

  for (const l of linhas) {
    const m = l.match(/^\*[^|]*\|\s*(.+?)\s*\*$/);
    if (m && m[1]) return m[1].trim();
    const m2 = l.match(/^\*[^|]*\|\s*(.+?)\s*$/);
    if (m2 && m2[1]) return m2[1].replace(/\*+$/,"").trim();
  }

  const m3 = texto.match(/NOME\s+DO\s+PONTO\s*:\s*(.+)$/im);
  if (m3 && m3[1]) return m3[1].trim();

  return "";
}

function extrairMaquinasRelatorio(texto) {
  const linhas = texto.replace(/\r/g, "\n").split("\n");

  const maquinas = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = (linhas[i] || "").trim();

    // 038 - HALLOWEN 2018
    const h = linha.match(/^(\d{3})\s*-\s*(.+)$/);
    if (!h) { i++; continue; }

    const selo = (h[1] || "").trim().toUpperCase();
    const jogo = (h[2] || "").trim().toUpperCase();

    // ✅ aqui a gente ignora a 1ª coluna e guarda só a 2ª coluna
    let entradaFecho = "";
    let saidaFecho = "";

    let j = i + 1;
    for (; j < Math.min(i + 10, linhas.length); j++) {
      const l2 = (linhas[j] || "").trim();

      if (/^\d{3}\s*-\s*/.test(l2)) break;

      // E    30609700   31171300___...
      const e = l2.match(/^E\s+(\d+)\s+(\d+)/i);
      if (e) {
        entradaFecho = (e[2] || "").trim(); // <-- 2ª coluna
        continue;
      }

      // S    19863586   20437476___...
      const s = l2.match(/^S\s+(\d+)\s+(\d+)/i);
      if (s) {
        saidaFecho = (s[2] || "").trim(); // <-- 2ª coluna
        continue;
      }
    }

    if (entradaFecho || saidaFecho) {
      maquinas.push({ selo, jogo, entradaFecho, saidaFecho });
    }

    i = j;
  }

  return maquinas;
}

/* ========= OCR (legado) ========= */
async function importarPrintPre(file, listaMaquinas, totalGeralEl, inputCliente) {
  alert("OCR ainda está aqui, mas o fluxo principal agora é texto. Se quiser, eu removo o OCR por completo.");
}

/* ===========================
   Helpers
=========================== */
function hojeBR() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function parseNumero(valor) {
  if (!valor) return 0;
  const limpo = valor.toString().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function formatarMoeda(n) {
  return n.toLocaleString("pt-BR", { style:"currency", currency:"BRL", minimumFractionDigits:2, maximumFractionDigits:2 });
}

function moedaParaNumero(txt) {
  if (!txt) return 0;
  const limpo = txt.toString().replace(/[^0-9,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function aplicarCorValor(el, valor) {
  const LIMIAR = 0.005;
  el.classList.remove("positivo", "negativo");
  if (valor > LIMIAR) el.classList.add("positivo");
  else if (valor < -LIMIAR) el.classList.add("negativo");
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
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
