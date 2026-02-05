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
  const d = new Date(ts);
  if (isNaN(d)) return "--";
  return d.toLocaleDateString("pt-BR") + " " +
         d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}

const corPos = "#1b8f2e";
const corNeg = "#c0392b";
const roxo   = "#6a1b9a";

/* ===== ESTADO ===== */
let historicoRaw = [];
const listaLancamentos = [];

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  carregarDoStorage();
  ["data","valorInicial"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", atualizarTotais);
  });
});

/* ===== STORAGE ===== */
function salvarNoStorage(){
  localStorage.setItem("lancamentos_raw", JSON.stringify(historicoRaw));
  localStorage.setItem("dataLancamento", data.value);
  localStorage.setItem("valorInicialLancamento", valorInicial.value);
}
function carregarDoStorage(){
  data.value = localStorage.getItem("dataLancamento") || "";
  valorInicial.value = localStorage.getItem("valorInicialLancamento") || "";
  historicoRaw = JSON.parse(localStorage.getItem("lancamentos_raw") || "[]");
  rebuild();
}

/* ===== AGREGAÇÃO ===== */
function rebuild(){
  listaLancamentos.length = 0;
  const mapa = {};
  historicoRaw.forEach(e=>{
    const k = normalizarPonto(e.ponto);
    if(!mapa[k]) mapa[k]={ ponto:k, dinheiro:0, saida:0 };
    mapa[k].dinheiro += e.dinheiro||0;
    mapa[k].saida    += e.saida||0;
  });
  Object.values(mapa).forEach(v=>listaLancamentos.push(v));
  atualizarLista();
}

/* ===== NOVA / EDITAR ===== */
window.adicionarEntrada = function(l={},idx=null){
  containerNovaEntrada.innerHTML = `
    <input type="hidden" id="editIdx" value="${idx ?? ""}">
    <label>Ponto</label>
    <input id="ponto" value="${l.ponto||""}">
    <label>Entrada</label>
    <input id="dinheiro" type="number" value="${l.dinheiro||""}">
    <label>Saída</label>
    <input id="saida" type="number" value="${l.saida||""}">
    <button class="btn" onclick="salvarEntrada()">Salvar</button>
  `;
};

window.salvarEntrada = function(){
  const ponto = normalizarPonto(ponto.value);
  if(!ponto) return;
  historicoRaw.push({
    ts:Date.now(),
    ponto,
    dinheiro:parseValor(dinheiro.value),
    saida:parseValor(saida.value)
  });
  containerNovaEntrada.innerHTML="";
  salvarNoStorage();
  rebuild();
};

/* ===== LISTA ===== */
function atualizarLista(){
  entradas.innerHTML="";
  listaLancamentos.forEach((e,i)=>{
    entradas.innerHTML += `
      <div class="linha-lancamento">
        <div>
          <strong>${e.ponto}</strong><br>
          ${e.dinheiro?`Entrada: <span style="color:${corPos}">${formatarMoeda(e.dinheiro)}</span>`:""}
          ${e.saida?` | Saída: <span style="color:${corNeg}">-${formatarMoeda(e.saida)}</span>`:""}
        </div>
        <div class="acoes">
          <button onclick="visualizarHistorico(${i})"><i class="fas fa-clock"></i></button>
        </div>
      </div>`;
  });
  atualizarTotais();
}

/* ===== RESUMO ===== */
function atualizarTotais(){
  const entrada = listaLancamentos.reduce((s,e)=>s+e.dinheiro,0);
  const saida   = listaLancamentos.reduce((s,e)=>s+e.saida,0);
  const inicial = parseValor(valorInicial.value);
  const total   = inicial + entrada - saida;

  resumoLancamento.innerHTML = `
    <p><strong>Valor Inicial:</strong> <span style="color:${corPos}">${formatarMoeda(inicial)}</span></p>
    <p><strong>Entrada:</strong> <span style="color:${corPos}">${formatarMoeda(entrada)}</span></p>
    <p><strong>Saída:</strong> <span style="color:${corNeg}">-${formatarMoeda(saida)}</span></p>
    <p><strong>Valor Total:</strong> <span style="color:${total<0?corNeg:corPos}">${formatarMoeda(total)}</span></p>
  `;
}

/* ===== MODAL ===== */
window.visualizarRelatorio = function(){
  const entrada = listaLancamentos.reduce((s,e)=>s+e.dinheiro,0);
  const saida   = listaLancamentos.reduce((s,e)=>s+e.saida,0);
  const inicial = parseValor(valorInicial.value);
  const total   = inicial + entrada - saida;

  conteudoRelatorio.innerHTML = `
    <button onclick="fecharRelatorio()" style="position:fixed;top:10px;right:14px;
      background:none;border:none;font-size:28px;color:${roxo}">×</button>

    <div style="padding:16px">
      <h3 style="text-align:center;color:${roxo}">Resumo</h3>
      <p><strong>Valor Inicial:</strong> ${formatarMoeda(inicial)}</p>
      <p><strong>Entrada:</strong> ${formatarMoeda(entrada)}</p>
      <p><strong>Saída:</strong> -${formatarMoeda(saida)}</p>
      <p><strong>Valor Total:</strong> ${formatarMoeda(total)}</p>
    </div>
  `;
  modalRelatorio.classList.add("aberta");
};

window.fecharRelatorio = ()=>modalRelatorio.classList.remove("aberta");

/* ===== HISTÓRICO ===== */
window.visualizarHistorico = function(i){
  const k = listaLancamentos[i].ponto;
  const itens = historicoRaw.filter(e=>e.ponto===k);
  conteudoRelatorio.innerHTML = `
    <button onclick="fecharRelatorio()" style="position:fixed;top:10px;right:14px;
      background:none;border:none;font-size:28px;color:${roxo}">×</button>

    <div style="padding:16px">
      <h3 style="text-align:center;color:${roxo}">Histórico — ${k}</h3>
      ${itens.map(e=>{
        const ent=e.dinheiro, sai=e.saida;
        return `<p>${formatarDataHora(e.ts)} — 
          ${ent?`Entrada ${formatarMoeda(ent)}`:""} 
          ${sai?`Saída -${formatarMoeda(sai)}`:""}
        </p>`;
      }).join("")}
    </div>`;
  modalRelatorio.classList.add("aberta");
};

/* ===== LIMPAR ===== */
window.limparLancamentos = function(){
  if(!confirm("Limpar tudo?"))return;
  historicoRaw=[];
  localStorage.clear();
  entradas.innerHTML="";
  resumoLancamento.innerHTML="";
};
