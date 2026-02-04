// js/lancamento.js

/* ===== HELPERS ===== */
function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}
function parseValor(v) {
  return parseFloat((v || "0").toString().replace(",", ".")) || 0;
}
function normalizarPonto(n) {
  return (n || "").trim().toLowerCase();
}
function formatarDataHora(ts) {
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return "--";
  const dt = new Date(n);
  if (Number.isNaN(dt.getTime())) return "--";
  const data = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} ${hora}`;
}

const corPos = "#1b8f2e";
const corNeg = "#c0392b";
const roxo = "#6a1b9a";

/* ===== ESTADO ===== */
const STORAGE_KEY = "lancamentos";
const RAW_STORAGE_KEY = "lancamentos_raw";
const listaLancamentos = [];   // agregado
let historicoRaw = [];         // bruto

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  carregarDoStorage();

  ["data", "valorInicial"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { salvarNoStorage(); atualizarTotais(); });
  });
});

/* ===== STORAGE ===== */
function salvarNoStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listaLancamentos));
  localStorage.setItem(RAW_STORAGE_KEY, JSON.stringify(historicoRaw));
  localStorage.setItem("dataLancamento", document.getElementById("data")?.value || "");
  localStorage.setItem("valorInicialLancamento", document.getElementById("valorInicial")?.value || "");
}

function carregarDoStorage() {
  const d = document.getElementById("data");
  const vi = document.getElementById("valorInicial");

  if (d) d.value = localStorage.getItem("dataLancamento") || "";
  if (vi) vi.value = localStorage.getItem("valorInicialLancamento") || "";

  const raw = localStorage.getItem(RAW_STORAGE_KEY);
  historicoRaw = raw ? JSON.parse(raw) : [];

  rebuildAgregadoFromRaw();
  salvarNoStorage();
  atualizarLista();
}

/* ===== AGREGAÇÃO ===== */
function rebuildAgregadoFromRaw() {
  const mapa = new Map();
  const ordem = [];

  for (const e of historicoRaw) {
    const k = normalizarPonto(e.ponto);

    if (!mapa.has(k)) {
      mapa.set(k, { ponto: k, dinheiro: 0, saida: 0 });
      ordem.push(k);
    }

    const acc = mapa.get(k);
    acc.dinheiro += Number(e.dinheiro) || 0;
    acc.saida += Number(e.saida) || 0;
  }

  listaLancamentos.length = 0;
  for (const k of ordem) listaLancamentos.push(mapa.get(k));
}

/* ===== UI ENTRADA ===== */
window.adicionarEntrada = function (lanc = {}, idx = null) {
  const box = document.getElementById("container-nova-entrada");
  const pontoNorm = normalizarPonto(lanc.ponto ?? "");

  box.innerHTML = `
    <input type="hidden" id="editIndex" value="${idx ?? ""}">
    <input type="hidden" id="pontoOriginal" value="${pontoNorm}">

    <label for="ponto">Ponto</label>
    <input id="ponto" type="text" placeholder="Nome do ponto" value="${pontoNorm}" />

    <label for="dinheiro">Entrada</label>
    <input id="dinheiro" type="number" placeholder="R$" value="${lanc.dinheiro ?? ""}" />

    <label for="saida">Saída</label>
    <input id="saida" type="number" placeholder="R$" value="${lanc.saida ?? ""}" />

    <button class="btn" onclick="salvarEntrada()">${idx !== null ? "Atualizar" : "Salvar"} Entrada</button>
  `;
  document.getElementById("ponto")?.focus();
};

window.salvarEntrada = function () {
  const pontoNovo = normalizarPonto(document.getElementById("ponto").value);
  const entrada = parseValor(document.getElementById("dinheiro").value);
  const saida = parseValor(document.getElementById("saida").value);
  const editIdx = document.getElementById("editIndex").value;
  const pontoOriginal = normalizarPonto(document.getElementById("pontoOriginal")?.value || "");

  if (!pontoNovo) {
    window.toast?.error?.("informe o nome do ponto.");
    return;
  }

  const base = {
    id: crypto?.randomUUID?.() || String(Date.now()),
    ts: Date.now(),
    ponto: pontoNovo,
    dinheiro: entrada,
    saida
  };

  // ====== EDITAR ======
  if (editIdx !== "") {
    const idx = Number(editIdx);
    const antigo = listaLancamentos[idx];
    if (!antigo) return;

    const keyAntiga = normalizarPonto(pontoOriginal || antigo.ponto);
    const keyNova = normalizarPonto(pontoNovo);

    // ✅ Se mudou o nome: renomeia o histórico inteiro do ponto antigo para o novo
    if (keyAntiga && keyNova && keyAntiga !== keyNova) {
      historicoRaw = historicoRaw.map(r => {
        const k = normalizarPonto(r.ponto);
        if (k === keyAntiga) return { ...r, ponto: keyNova };
        return r;
      });
    }

    // Depois de renomear, recalcula o agregado e pega o "atual" do novo nome
    rebuildAgregadoFromRaw();
    const atualNovo = listaLancamentos.find(x => normalizarPonto(x.ponto) === keyNova) || { dinheiro: 0, saida: 0 };

    // ✅ Aplica o delta para chegar no valor editado final
    historicoRaw.push({
      ...base,
      dinheiro: entrada - (Number(atualNovo.dinheiro) || 0),
      saida: saida - (Number(atualNovo.saida) || 0),
      cartao: 0,
      outros: 0
    });

    rebuildAgregadoFromRaw();
    window.toast?.success?.("Entrada atualizada.");
  }
  // ====== NOVO ======
  else {
    historicoRaw.push({
      ...base,
      cartao: 0,
      outros: 0
    });

    rebuildAgregadoFromRaw();
    window.toast?.success?.("Entrada salva.");
  }

  document.getElementById("container-nova-entrada").innerHTML = "";
  salvarNoStorage();
  atualizarLista();
};

/* ===== LISTA ===== */
function atualizarLista() {
  const lista = document.getElementById("entradas");
  lista.innerHTML = "";

  listaLancamentos.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "linha-lancamento";

    const bloco = document.createElement("div");
    bloco.innerHTML = `<strong>${it.ponto}</strong><br/>`;

    const parts = [];
    if (it.dinheiro) parts.push(`Entrada: <span style="color:${corPos}">${formatarMoeda(it.dinheiro)}</span>`);
    if (it.saida) parts.push(`Saída: <span style="color:${corNeg}">-${formatarMoeda(it.saida)}</span>`);
    bloco.innerHTML += parts.join(" | ");

    const acoes = document.createElement("div");
    acoes.className = "acoes";
    acoes.innerHTML = `
      <button title="Editar" onclick="editarLancamento(${idx})"><i class="fas fa-pen"></i></button>
      <button title="Histórico" onclick="visualizarHistorico(${idx})"><i class="fas fa-clock-rotate-left"></i></button>
      <button title="Excluir" onclick="excluirLancamento(${idx})"><i class="fas fa-trash"></i></button>
    `;

    div.appendChild(bloco);
    div.appendChild(acoes);
    lista.appendChild(div);
  });

  atualizarTotais();
}

/* ===== TOTAIS ===== */
function atualizarTotais() {
  const totalEntrada = listaLancamentos.reduce((s, e) => s + (Number(e.dinheiro) || 0), 0);
  const totalSaida = listaLancamentos.reduce((s, e) => s + (Number(e.saida) || 0), 0);

  const valorInicial = parseValor(document.getElementById("valorInicial").value);
  const valorTotal = valorInicial + totalEntrada - totalSaida;

  let dataResumo = document.getElementById("data").value || "";
  if (dataResumo) {
    const [yyyy, mm, dd] = dataResumo.split("-");
    const d = new Date(+yyyy, +mm - 1, +dd);
    const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
    dataResumo = `${dd}/${mm}/${yyyy} (${dia})`;
  }

  document.getElementById("resumoLancamento").innerHTML = `
    <p><strong>Data:</strong> ${dataResumo || "-"}</p>
    <p><strong>Valor Inicial:</strong> <span style="color:${valorInicial < 0 ? corNeg : corPos}">${formatarMoeda(valorInicial)}</span></p>
    <p><strong>Valor Total:</strong> <span style="color:${valorTotal < 0 ? corNeg : corPos}">${formatarMoeda(valorTotal)}</span></p>
  `;

  salvarNoStorage();
}

/* ===== AÇÕES ===== */
window.editarLancamento = (i) => {
  const it = listaLancamentos[i];
  if (!it) return;
  window.adicionarEntrada(it, i);
};

window.excluirLancamento = (i) => {
  const it = listaLancamentos[i];
  if (!it) return;
  if (!confirm("Excluir este lançamento (e o histórico deste ponto)?")) return;

  const key = normalizarPonto(it.ponto);
  historicoRaw = historicoRaw.filter(e => normalizarPonto(e.ponto) !== key);
  rebuildAgregadoFromRaw();

  salvarNoStorage();
  atualizarLista();
  window.toast?.success?.("Lançamento removido.");
};

/* ===== MODAL ===== */
function abrirModal(html) {
  const conteudo = document.getElementById("conteudo-relatorio");
  conteudo.innerHTML = html;
  document.getElementById("modal-relatorio").classList.add("aberta");

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  const onEsc = (ev) => {
    if (ev.key === "Escape") {
      window.removeEventListener("keydown", onEsc);
      fecharRelatorio();
    }
  };
  window.addEventListener("keydown", onEsc);
}

window.fecharRelatorio = function () {
  document.getElementById("modal-relatorio").classList.remove("aberta");
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
};

window.visualizarRelatorio = function () {
  const dataIso = document.getElementById("data")?.value || "";
  let dataFmt = "-";
  if (dataIso) {
    const [y, m, d] = dataIso.split("-");
    const dt = new Date(+y, +m - 1, +d);
    const dia = dt.toLocaleDateString("pt-BR", { weekday: "long" });
    dataFmt = `${d}/${m}/${y} (${dia})`;
  }

  const valorInicial = parseValor(document.getElementById("valorInicial")?.value || 0);

  const totalEntrada = listaLancamentos.reduce((s, e) => s + (Number(e.dinheiro) || 0), 0);
  const totalSaida = listaLancamentos.reduce((s, e) => s + (Number(e.saida) || 0), 0);

  const valorTotal = valorInicial + totalEntrada - totalSaida;

  const linhas = listaLancamentos.map(e => {
    const sub = (Number(e.dinheiro) || 0) - (Number(e.saida) || 0);
    return `<tr>
      <td style="text-transform:lowercase; padding:8px 6px; border-bottom:1px solid #eee;">${e.ponto}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;">${e.dinheiro ? `<span style="color:${corPos}">${formatarMoeda(e.dinheiro)}</span>` : "-"}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;">${e.saida ? `<span style="color:${corNeg}">-${formatarMoeda(e.saida)}</span>` : "-"}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; font-weight:700; ${sub < 0 ? `color:${corNeg}` : `color:${corPos}` }">${formatarMoeda(sub)}</td>
    </tr>`;
  }).join("");

  const totalSub = totalEntrada - totalSaida;

  const html = `
    <button onclick="fecharRelatorio()"
      style="position:fixed; top:10px; right:14px; z-index:9999;
             background:transparent; border:none; padding:0;
             font-size:28px; line-height:1; color:${roxo}; cursor:pointer;">
      ×
    </button>

    <div style="font-family: Arial; font-size:14px; padding:16px;">
      <h3 style="color:${roxo}; text-align:center; margin:0 0 10px;">Resumo</h3>

      <div style="margin:0 0 10px;">
        <p><strong>Data:</strong> ${dataFmt}</p>
        <p><strong>Valor Inicial:</strong> <span style="color:${valorInicial < 0 ? corNeg : corPos}">${formatarMoeda(valorInicial)}</span></p>
        <p><strong>Valor Total:</strong> <span style="color:${valorTotal < 0 ? corNeg : corPos}">${formatarMoeda(valorTotal)}</span></p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff;">
        <thead>
          <tr style="background:#f2f2f7">
            <th style="text-align:left;  padding:8px 6px;">Cliente</th>
            <th style="text-align:right; padding:8px 6px;">Entrada</th>
            <th style="text-align:right; padding:8px 6px;">Saída</th>
            <th style="text-align:right; padding:8px 6px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${linhas || `<tr><td colspan="4" style="text-align:center; padding:12px;">Sem entradas.</td></tr>`}
        </tbody>
        <tfoot>
          <tr style="background:#f2f2f7; font-weight:700">
            <td style="text-align:left;  padding:8px 6px;">Total</td>
            <td style="text-align:right; padding:8px 6px; color:${corPos}">${formatarMoeda(totalEntrada)}</td>
            <td style="text-align:right; padding:8px 6px; color:${corNeg}">-${formatarMoeda(totalSaida)}</td>
            <td style="text-align:right; padding:8px 6px; ${(totalSub) < 0 ? `color:${corNeg}` : `color:${corPos}` }">
              ${formatarMoeda(totalSub)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  abrirModal(html);
};

window.visualizarHistorico = function (index) {
  const it = listaLancamentos[index];
  if (!it) return;

  const key = normalizarPonto(it.ponto);
  const itens = historicoRaw.filter(e => normalizarPonto(e.ponto) === key);

  const linhas = itens.map(e => {
    const entrada = Number(e.dinheiro) || 0;
    const saida = Number(e.saida) || 0;
    const sub = entrada - saida;

    return `<tr>
      <td style="text-align:left; padding:8px 6px; border-bottom:1px solid #eee;">${formatarDataHora(e.ts)}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;"><span style="color:${entrada ? corPos : '#777'}">${entrada ? formatarMoeda(entrada) : "-"}</span></td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;"><span style="color:${saida ? corNeg : '#777'}">${saida ? "-" + formatarMoeda(saida) : "-"}</span></td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; font-weight:700; ${sub < 0 ? `color:${corNeg}` : `color:${corPos}` }">${formatarMoeda(sub)}</td>
    </tr>`;
  }).join("");

  const html = `
    <button onclick="fecharRelatorio()"
      style="position:fixed; top:10px; right:14px; z-index:9999;
             background:transparent; border:none; padding:0;
             font-size:28px; line-height:1; color:${roxo}; cursor:pointer;">
      ×
    </button>

    <div style="font-family: Arial; font-size:14px; padding:16px;">
      <h3 style="color:${roxo}; text-align:center; margin:0 0 10px;">Histórico — ${it.ponto}</h3>

      <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff;">
        <thead>
          <tr style="background:#f2f2f7">
            <th style="text-align:left;  padding:8px 6px;">Data</th>
            <th style="text-align:right; padding:8px 6px;">Entrada</th>
            <th style="text-align:right; padding:8px 6px;">Saída</th>
            <th style="text-align:right; padding:8px 6px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${linhas || `<tr><td colspan="4" style="text-align:center; padding:12px;">Sem entradas.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  abrirModal(html);
};

/* ===== LIMPAR ===== */
window.limparLancamentos = function () {
  if (!confirm("Deseja realmente limpar todos os lançamentos e valores?")) return;

  listaLancamentos.length = 0;
  historicoRaw = [];

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(RAW_STORAGE_KEY);
  localStorage.removeItem("dataLancamento");
  localStorage.removeItem("valorInicialLancamento");

  document.getElementById("data").value = "";
  document.getElementById("valorInicial").value = "";
  document.getElementById("container-nova-entrada").innerHTML = "";

  atualizarLista();
  window.toast?.success?.("Tudo limpo.");
};
