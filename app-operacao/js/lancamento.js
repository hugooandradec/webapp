// js/lancamento.js

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  // inicializarPagina("Lançamento");  // REMOVIDO pra não duplicar cabeçalho
  carregarDoStorage();

  ["data", "valorInicial"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { salvarNoStorage(); atualizarTotais(); });
  });
});

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
const corPos = "#1b8f2e";
const corNeg = "#c0392b";
const corAzul = "#1976d2";

/* ===== ESTADO ===== */
const STORAGE_KEY = "lancamentos";
const RAW_STORAGE_KEY = "lancamentos_raw";
const listaLancamentos = [];   // agregado
let historicoRaw = [];         // bruto

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
      mapa.set(k, { ponto: k, dinheiro: 0, cartao: 0, outros: 0, saida: 0 });
      ordem.push(k);
    }
    const acc = mapa.get(k);
    acc.dinheiro += Number(e.dinheiro) || 0;
    acc.cartao += Number(e.cartao) || 0;
    acc.outros += Number(e.outros) || 0;
    acc.saida += Number(e.saida) || 0;
  }
  listaLancamentos.length = 0;
  for (const k of ordem) listaLancamentos.push(mapa.get(k));
}

/* ===== UI ENTRADA ===== */
window.adicionarEntrada = function (lanc = {}, idx = null) {
  const box = document.getElementById("container-nova-entrada");
  box.innerHTML = `
    <input type="hidden" id="editIndex" value="${idx ?? ""}">
    <label for="ponto">Ponto:</label>
    <input id="ponto" type="text" placeholder="Nome do ponto" value="${lanc.ponto ?? ""}" />
    <label for="dinheiro">Dinheiro:</label>
    <input id="dinheiro" type="number" placeholder="R$" value="${lanc.dinheiro ?? ""}" />
    <label for="cartao">Cartão:</label>
    <input id="cartao" type="number" placeholder="R$" value="${lanc.cartao ?? ""}" />
    <label for="outros">Outros:</label>
    <input id="outros" type="number" placeholder="R$" value="${lanc.outros ?? ""}" />
    <label for="saida">Saída:</label>
    <input id="saida" type="number" placeholder="R$" value="${lanc.saida ?? ""}" />
    <button class="btn" onclick="salvarEntrada()">${idx !== null ? "Atualizar" : "Salvar"} Entrada</button>`;
  document.getElementById("ponto")?.focus();
};

window.salvarEntrada = function () {
  const ponto = normalizarPonto(document.getElementById("ponto").value);
  const dinheiro = parseValor(document.getElementById("dinheiro").value);
  const cartao = parseValor(document.getElementById("cartao").value);
  const outros = parseValor(document.getElementById("outros").value);
  const saida = parseValor(document.getElementById("saida").value);
  const editIdx = document.getElementById("editIndex").value;

  if (!ponto) {
    window.toast?.error?.("informe o nome do ponto.");
    return;
  }

  if (editIdx !== "") {
    const idx = Number(editIdx);
    const antigo = listaLancamentos[idx];
    if (antigo) {
      const delta = {
        id: crypto?.randomUUID?.() || String(Date.now()),
        ts: Date.now(),
        ponto,
        dinheiro: (dinheiro - (Number(antigo.dinheiro) || 0)),
        cartao: (cartao - (Number(antigo.cartao) || 0)),
        outros: (outros - (Number(antigo.outros) || 0)),
        saida: (saida - (Number(antigo.saida) || 0)),
      };
      historicoRaw.push(delta);
      rebuildAgregadoFromRaw();
      window.toast?.success?.("Entrada atualizada.");
    }
  } else {
    historicoRaw.push({
      id: crypto?.randomUUID?.() || String(Date.now()),
      ts: Date.now(),
      ponto,
      dinheiro,
      cartao,
      outros,
      saida
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
    const detalhe = [];
    if (it.dinheiro) detalhe.push(`Dinheiro: <span style="color:${corPos}">${formatarMoeda(it.dinheiro)}</span>`);
    if (it.cartao) detalhe.push(`Cartão: <span style="color:${corAzul}">${formatarMoeda(it.cartao)}</span>`);
    if (it.outros) detalhe.push(`Outros: <span style="color:${corPos}">${formatarMoeda(it.outros)}</span>`);
    if (it.saida) detalhe.push(`Saída: <span style="color:${corNeg}">-${formatarMoeda(it.saida)}</span>`);
    bloco.innerHTML += detalhe.join(" | ");

    const acoes = document.createElement("div");
    acoes.className = "acoes";
    acoes.innerHTML = `
      <button class="editar" title="Editar" onclick="editarLancamento(${idx})"><i class="fas fa-pen"></i></button>
      <button class="historico" title="Histórico" onclick="visualizarHistorico(${idx})"><i class="fas fa-clock-rotate-left"></i></button>
      <button class="excluir" title="Excluir" onclick="excluirLancamento(${idx})"><i class="fas fa-trash"></i></button>`;

    div.appendChild(bloco);
    div.appendChild(acoes);
    lista.appendChild(div);
  });
  atualizarTotais();
}

/* ===== TOTAIS ===== */
function atualizarTotais() {
  const totalDinheiro = listaLancamentos.reduce((s, e) => s + (Number(e.dinheiro) || 0), 0);
  const totalCartao = listaLancamentos.reduce((s, e) => s + (Number(e.cartao) || 0), 0);
  const totalOutros = listaLancamentos.reduce((s, e) => s + (Number(e.outros) || 0), 0);
  const totalSaida = listaLancamentos.reduce((s, e) => s + (Number(e.saida) || 0), 0);
  const valorInicial = parseValor(document.getElementById("valorInicial").value);
  const totalNaMao = valorInicial + totalDinheiro + totalOutros - totalSaida;

  let dataResumo = document.getElementById("data").value || "";
  if (dataResumo) {
    const [yyyy, mm, dd] = dataResumo.split("-");
    const d = new Date(+yyyy, +mm - 1, +dd);
    const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
    dataResumo = `${dd}/${mm}/${yyyy} (${dia})`;
  }

  const r = document.getElementById("resumoLancamento");
  r.innerHTML = `
    <p><strong>Data:</strong> ${dataResumo || "-"}</p>
    <p><strong>Valor Inicial:</strong> <span style="color:${valorInicial < 0 ? corNeg : corPos}">${formatarMoeda(valorInicial)}</span></p>
    <p><strong>Total Dinheiro:</strong> <span style="color:${corPos}">${formatarMoeda(totalDinheiro)}</span></p>
    <p><strong>Total Cartão:</strong> <span style="color:${corAzul}">${formatarMoeda(totalCartao)}</span></p>
    <p><strong>Total Outros:</strong> <span style="color:${corPos}">${formatarMoeda(totalOutros)}</span></p>
    <p><strong>Total Saída:</strong> <span style="color:${corNeg}">-${formatarMoeda(totalSaida)}</span></p>
    <p><strong>Valor Total:</strong> <span style="color:${totalNaMao < 0 ? corNeg : corPos}">${formatarMoeda(totalNaMao)}</span></p>
  `;
  salvarNoStorage();
}

/* ===== AÇÕES LISTA ===== */
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

/* ===== HISTÓRICO ===== */
window.visualizarHistorico = function (index) {
  const it = listaLancamentos[index];
  if (!it) return;
  const key = normalizarPonto(it.ponto);
  const itens = historicoRaw.filter(e => normalizarPonto(e.ponto) === key);
  const linhas = itens.map(e => {
    const dt = new Date(e.ts);
    const data = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const sub = (Number(e.dinheiro) || 0) + (Number(e.outros) || 0) - (Number(e.saida) || 0);
    return `<tr>
      <td style="text-align:left">${data} ${hora}</td>
      <td style="text-align:right"><span style="color:${e.dinheiro ? corPos : '#777'}">${e.dinheiro ? formatarMoeda(e.dinheiro) : "-"}</span></td>
      <td style="text-align:right"><span style="color:${e.cartao ? corAzul : '#777'}">${e.cartao ? formatarMoeda(e.cartao) : "-"}</span></td>
      <td style="text-align:right"><span style="color:${e.outros ? corPos : '#777'}">${e.outros ? formatarMoeda(e.outros) : "-"}</span></td>
      <td style="text-align:right"><span style="color:${e.saida ? corNeg : '#777'}">${e.saida ? "-" + formatarMoeda(e.saida) : "-"}</span></td>
      <td style="text-align:right;font-weight:700;${sub < 0 ? `color:${corNeg}` : `color:${corPos}` }">${formatarMoeda(sub)}</td>
    </tr>`;
  }).join("");
  const html = `
    <button class="fechar-x" onclick="fecharRelatorio()">✖</button>
    <div style="font-family: Arial; font-size:14px; padding-bottom:70px;">
      <h3 style="color:#6a1b9a; text-align:center; margin:0 0 10px;">Histórico — ${it.ponto}</h3>
      <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff;">
        <thead><tr style="background:#f2f2f7">
          <th style="text-align:left; padding:8px 6px; border-bottom:1px solid #eee">Data</th>
          <th style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee">Dinheiro</th>
          <th style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee">Cartão</th>
          <th style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee">Outros</th>
          <th style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee">Saída</th>
          <th style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee">Subtotal</th>
        </tr></thead><tbody>
          ${linhas || `<tr><td colspan="6" style="text-align:center; padding:12px;">Sem entradas.</td></tr>`}
        </tbody>
      </table>
    </div>`;
  const box = document.getElementById("conteudo-relatorio");
  box.innerHTML = html;
  const modal = document.getElementById("modal-relatorio");
  modal.classList.add("aberta");
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
};

/* ===== MODAL CONTROLES ===== */
window.fecharRelatorio = function () {
  document.getElementById("modal-relatorio").classList.remove("aberta");
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
};

/* ===== MODAL "RESUMO" ===== */
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

  const totalDinheiro = listaLancamentos.reduce((s, e) => s + (Number(e.dinheiro) || 0), 0);
  const totalCartao = listaLancamentos.reduce((s, e) => s + (Number(e.cartao) || 0), 0);
  const totalOutros = listaLancamentos.reduce((s, e) => s + (Number(e.outros) || 0), 0);
  const totalSaida = listaLancamentos.reduce((s, e) => s + (Number(e.saida) || 0), 0);
  const valorTotal = valorInicial + totalDinheiro + totalOutros - totalSaida;

  const linhas = listaLancamentos
    .map(e => {
      const sub = (Number(e.dinheiro) || 0) + (Number(e.outros) || 0) - (Number(e.saida) || 0);
      return `<tr>
        <td style="text-transform:lowercase">${e.ponto}</td>
        <td class="num">${e.dinheiro ? `<span style="color:${corPos}">${formatarMoeda(e.dinheiro)}</span>` : "-"}</td>
        <td class="num">${e.cartao ? `<span style="color:${corAzul}">${formatarMoeda(e.cartao)}</span>` : "-"}</td>
        <td class="num">${e.outros ? `<span style="color:${corPos}">${formatarMoeda(e.outros)}</span>` : "-"}</td>
        <td class="num">${e.saida ? `<span style="color:${corNeg}">-${formatarMoeda(e.saida)}</span>` : "-"}</td>
        <td class="num" style="font-weight:700; ${sub < 0 ? `color:${corNeg}` : `color:${corPos}` }">${formatarMoeda(sub)}</td>
      </tr>`;
    })
    .join("");

  const html = `
    <button class="fechar-x" onclick="fecharRelatorio()">✖</button>
    <div style="font-family: Arial; font-size:14px; padding-bottom:70px;">
      <h3 style="color:#6a1b9a; text-align:center; margin:0 0 10px;">Resumo</h3>

      <div style="margin:0 0 10px;">
        <p><strong>Data:</strong> ${dataFmt}</p>
        <p><strong>Valor Inicial:</strong> <span style="color:${valorInicial < 0 ? corNeg : corPos}">${formatarMoeda(valorInicial)}</span></p>
        <p><strong>Valor Total:</strong> <span style="color:${valorTotal < 0 ? corNeg : corPos}">${formatarMoeda(valorTotal)}</span></p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff;">
        <thead>
          <tr style="background:#f2f2f7">
            <th style="text-align:left;  padding:8px 6px;">Cliente</th>
            <th style="text-align:right; padding:8px 6px;">Dinheiro</th>
            <th style="text-align:right; padding:8px 6px;">Cartão</th>
            <th style="text-align:right; padding:8px 6px;">Outros</th>
            <th style="text-align:right; padding:8px 6px;">Saída</th>
            <th style="text-align:right; padding:8px 6px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${linhas || `<tr><td colspan="6" style="text-align:center; padding:12px;">Sem entradas.</td></tr>`}
        </tbody>
        <tfoot>
          <tr style="background:#f2f2f7; font-weight:700">
            <td style="text-align:left;  padding:8px 6px;">Total</td>
            <td class="num" style="padding:8px 6px; color:${corPos}">${formatarMoeda(totalDinheiro)}</td>
            <td class="num" style="padding:8px 6px; color:${corAzul}">${formatarMoeda(totalCartao)}</td>
            <td class="num" style="padding:8px 6px; color:${corPos}">${formatarMoeda(totalOutros)}</td>
            <td class="num" style="padding:8px 6px; color:${corNeg}">-${formatarMoeda(totalSaida)}</td>
            <td class="num" style="padding:8px 6px; ${(totalDinheiro + totalOutros - totalSaida) < 0 ? `color:${corNeg}` : `color:${corPos}` }">
              ${formatarMoeda(totalDinheiro + totalOutros - totalSaida)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  const box = document.getElementById("conteudo-relatorio");
  box.innerHTML = html;

  const modal = document.getElementById("modal-relatorio");
  modal.classList.add("aberta");
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  const onEsc = (ev) => {
    if (ev.key === "Escape") {
      window.removeEventListener("keydown", onEsc);
      fecharRelatorio();
    }
  };
  window.addEventListener("keydown", onEsc);
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
