// ================================
// CÁLCULO DE SALAS (ATUALIZADO)
// Com taxa de parcelamento + Pipo/Pass + cores no relatório
// ================================

const STORAGE_KEY = "calculo_salas_v1";
let salas = [];

// --- Helpers ---
function parseCentavos(v) {
  if (!v) return 0;
  const n = v.toString().replace(/\D/g, "");
  return n ? Number(n) / 100 : 0;
}

function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarInput(input) {
  let v = input.value.replace(/\D/g, "");
  if (!v) { input.value = ""; return; }
  input.value = (Number(v) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

// --- Cálculo ---
function calcularSala(s) {
  const bruto = parseCentavos(s.bruto);
  const despesas = parseCentavos(s.despesas);
  const cartao = parseCentavos(s.cartao);
  const taxa = parseCentavos(s.taxa);

  const metade = bruto / 2;
  const com10 = metade * 1.10;
  const valor1 = com10 - despesas;
  const valor2 = cartao * 0.06;

  return valor1 - valor2 - taxa;
}

// --- Render de cada card ---
function adicionarCard(index, sala) {
  const lista = document.getElementById("listaSalas");

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Sala ${index + 1}</span>
      <button class="btn-remover" style="background:none;border:none;color:#777;">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>

    <div class="linha col-sala">
      <label>Nome:</label>
      <input class="sala-nome" placeholder="NOME" />
    </div>

    <div class="col-sala">
      <label>Bruto</label>
      <input class="sala-bruto" placeholder="0,00" />
    </div>

    <div class="col-sala">
      <label>Despesas</label>
      <input class="sala-despesas" placeholder="0,00" />
    </div>

    <div class="col-sala">
      <label>Cartão</label>
      <input class="sala-cartao" placeholder="0,00" />
    </div>

    <div class="col-sala">
      <label>Taxa parcelamento</label>
      <input class="sala-taxa" placeholder="0,00" />
    </div>

    <div class="resultado-sala">
      Resultado: <span class="res-valor">R$ 0,00</span> <span class="res-status">(Neutro)</span>
      <br><br>
      <div class="linha-pipo-pass">
        Pipo: <span class="pipo-valor">R$ 0,00</span> |
        Pass: <span class="pass-valor">R$ 0,00</span>
      </div>
    </div>
  `;

  lista.appendChild(card);

  const nome = card.querySelector(".sala-nome");
  const bruto = card.querySelector(".sala-bruto");
  const despesas = card.querySelector(".sala-despesas");
  const cartao = card.querySelector(".sala-cartao");
  const taxa = card.querySelector(".sala-taxa");

  const resSpan = card.querySelector(".res-valor");
  const statusSpan = card.querySelector(".res-status");
  const pipoSpan = card.querySelector(".pipo-valor");
  const passSpan = card.querySelector(".pass-valor");

  if (sala) {
    nome.value = sala.nome || "";
    bruto.value = sala.bruto || "";
    despesas.value = sala.despesas || "";
    cartao.value = sala.cartao || "";
    taxa.value = sala.taxa || "";
  }

  function atualizar() {
    salas[index] = {
      nome: nome.value.toUpperCase(),
      bruto: bruto.value,
      despesas: despesas.value,
      cartao: cartao.value,
      taxa: taxa.value
    };

    [bruto, despesas, cartao, taxa].forEach(i => formatarInput(i));

    const r = calcularSala(salas[index]);

    // Resultado
    resSpan.textContent = formatarMoeda(r);
    resSpan.classList.remove("verde", "vermelho");

    if (r > 0) { resSpan.classList.add("verde"); statusSpan.textContent = "(Lucro)"; }
    else if (r < 0) { resSpan.classList.add("vermelho"); statusSpan.textContent = "(Prejuízo)"; }
    else { statusSpan.textContent = "(Neutro)"; }

    // Pipo e Pass
    const pipo = (r / 3) * 2;
    const pass = r / 3;

    pipoSpan.textContent = formatarMoeda(pipo);
    passSpan.textContent = formatarMoeda(pass);

    pipoSpan.classList.remove("verde","vermelho");
    passSpan.classList.remove("verde","vermelho");

    if (pipo > 0) pipoSpan.classList.add("verde");
    else if (pipo < 0) pipoSpan.classList.add("vermelho");

    if (pass > 0) passSpan.classList.add("verde");
    else if (pass < 0) passSpan.classList.add("vermelho");

    salvar();
    atualizarTotal();
  }

  [nome, bruto, despesas, cartao, taxa].forEach(input =>
    input.addEventListener("input", atualizar)
  );

  atualizar();

  // Remover card
  card.querySelector(".btn-remover").onclick = () => {
    salas.splice(index, 1);
    render();
    salvar();
  };
}

// --- Total geral ---
function atualizarTotal() {
  let total = salas.reduce((acc, s) => acc + calcularSala(s), 0);
  const el = document.getElementById("totalGeral");

  el.textContent = `TOTAL GERAL: ${formatarMoeda(total)}`;
  el.classList.remove("verde","vermelho");

  if (total > 0) el.classList.add("verde");
  else if (total < 0) el.classList.add("vermelho");
}

// --- Render geral ---
function render() {
  const lista = document.getElementById("listaSalas");
  lista.innerHTML = "";
  salas.forEach((s, i) => adicionarCard(i, s));
}

// --- Storage ---
function salvar() {
  const dataDe = document.getElementById("dataDe").value;
  const dataAte = document.getElementById("dataAte").value;

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ dataDe, dataAte, salas }));
}

function carregar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const dados = JSON.parse(raw);
    document.getElementById("dataDe").value = dados.dataDe || "";
    document.getElementById("dataAte").value = dados.dataAte || "";
    salas = dados.salas || [];
  } else salas = [];
}

// --- Modal ---
function abrirModal() {
  const modal = document.getElementById("modalSalas");
  const rel = document.getElementById("relConteudo");

  const dataDe = document.getElementById("dataDe").value || "__/__/____";
  const dataAte = document.getElementById("dataAte").value || "__/__/____";

  let html = `Período: ${dataDe} até ${dataAte}<br><br>`;

  salas.forEach((s, i) => {
    const bruto = parseCentavos(s.bruto);
    const desp = parseCentavos(s.despesas);
    const cart = parseCentavos(s.cartao);
    const taxa = parseCentavos(s.taxa);

    const r = calcularSala(s);
    const pipo = (r / 3) * 2;
    const pass = r / 3;

    const classe = r > 0 ? "verde" : r < 0 ? "vermelho" : "";

    html += `
      <strong>Sala ${i+1} — ${s.nome}</strong><br>
      Bruto: <span class="verde">${formatarMoeda(bruto)}</span><br>
      Despesas: <span class="vermelho">-${formatarMoeda(desp)}</span><br>
      Cartão: <span class="azul">${formatarMoeda(cart)}</span><br>
      Taxa parcelamento: <span class="vermelho">-${formatarMoeda(taxa)}</span><br>
      <br>
      Resultado: <span class="${classe}" style="font-weight:bold;">${formatarMoeda(r)}</span><br>
      <br>
      Pipo: <span class="${classe}" style="font-weight:bold;">${formatarMoeda(pipo)}</span> |
      Pass: <span class="${classe}" style="font-weight:bold;">${formatarMoeda(pass)}</span>
      <br>----------------------------------------<br><br>
    `;
  });

  const total = salas.reduce((acc, s) => acc + calcularSala(s), 0);
  const clsTot = total > 0 ? "verde" : total < 0 ? "vermelho" : "";

  html += `<strong>TOTAL GERAL: <span class="${clsTot}">${formatarMoeda(total)}</span></strong>`;

  rel.innerHTML = html;
  modal.classList.add("aberta");
}

document.addEventListener("DOMContentLoaded", () => {
  carregar();
  render();
  atualizarTotal();

  document.getElementById("btnAdicionar").onclick = () => {
    salas.push({ nome:"", bruto:"", despesas:"", cartao:"", taxa:"" });
    render();
    salvar();
  };

  document.getElementById("btnRelatorio").onclick = abrirModal;

  document.getElementById("btnLimpar").onclick = () => {
    if (confirm("Limpar tudo?")) {
      salas = [];
      salvar();
      render();
      atualizarTotal();
    }
  };

  document.getElementById("btnFecharModal").onclick =
    () => document.getElementById("modalSalas").classList.remove("aberta");
});