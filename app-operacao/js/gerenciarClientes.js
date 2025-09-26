// js/gerenciarClientes.js
import { inicializarPagina } from "../../common/js/navegacao.js";
import { pullClientes, pushClientes, queueCliente, CLIENTES_KEY } from "./sync.js";

/* ===== modelo =====
 { id, nome, endereco, bairro, rota, pctCliente, negativo, recuperacao } // tudo lowercase
*/
let clientes = [];

const qs  = (s,p=document)=>p.querySelector(s);
const low = (s)=> (s??"").toString().trim().toLowerCase();
const fmtBRL = (n)=> (Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

// currency (sem limite); admite “.” e “,”; força >=0
function moedaToNum(s){
  if (typeof s === "number") s = String(s);
  s = (s||"").replace(/[^0-9,.\s]/g,"").replace(/\s+/g,"");
  // se tiver , e . assume pt-BR (pontos milhar, vírgula decimal)
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g,"").replace(",",".");
  else if (s.includes(",")) s = s.replace(",",".");
  let n = Number(s);
  if (!Number.isFinite(n) || n < 0) n = Math.abs(n) || 0; // garante >= 0
  return n;
}

function carregarLocal(){
  const raw = localStorage.getItem(CLIENTES_KEY);
  clientes = raw ? JSON.parse(raw) : [];
}
function salvarLocal(){ localStorage.setItem(CLIENTES_KEY, JSON.stringify(clientes)); }

/* ===== refs ===== */
const formWrap = qs("#formWrap");
const searchWrap = qs("#searchWrap");
const editIdEl = qs("#editId");
const nomeEl = qs("#nome");
const endEl = qs("#endereco");
const bairroEl = qs("#bairro");
const rotaEl = qs("#rota");
const pctEl = qs("#pctCliente");
const negEl = qs("#negativo");
const recEl = qs("#recuperacao");
const msgForm = qs("#msgForm");
const btnNovo = qs("#btnNovo");
const btnPesquisar = qs("#btnPesquisar");
const btnSalvar = qs("#btnSalvar");
const btnCancelar = qs("#btnCancelar");
const buscaEl = qs("#busca");
const listaEl = qs("#lista");

// modal %
const modalPct = qs("#modalPct");
const gradePct = qs("#gradePct");

/* ===== init ===== */
document.addEventListener("DOMContentLoaded", async () => {
  inicializarPagina("Gerenciar Clientes");

  // grade % (0..50 de 5 em 5)
  let html = "";
  for (let p=0; p<=50; p+=5) html += `<button class="pct" data-v="${p}">${p}%</button>`;
  gradePct.innerHTML = html;

  // moeda: deixa digitar livre e formata só no blur; bloqueia '-' no keydown
  const blockMinus = (ev)=> { if (ev.key === "-" ) ev.preventDefault(); };
  [negEl, recEl].forEach(inp=>{
    inp.addEventListener("keydown", blockMinus);
    inp.addEventListener("blur", ()=>{
      const val = moedaToNum(inp.value);
      inp.value = val ? fmtBRL(val).replace("R$","").trim() : "";
    });
    inp.addEventListener("input", ()=>{
      // vermelho em "negativo" quando houver texto
      if (inp === negEl) inp.classList.toggle("valor-negativo", low(inp.value) !== "");
    });
  });

  carregarLocal();
  formWrap.style.display = "none";
  searchWrap.style.display = "none";

  try { await pullClientes(); carregarLocal(); } catch {}

  btnNovo.addEventListener("click", abrirFormNovo);
  btnPesquisar.addEventListener("click", abrirPesquisar);
  btnSalvar.addEventListener("click", (e)=>{ e.preventDefault(); salvarCliente(); });
  btnCancelar.addEventListener("click", (e)=>{ e.preventDefault(); fecharForm(); });

  listaEl.addEventListener("click", onListaClick);
  buscaEl?.addEventListener("input", ()=> renderLista(buscaEl.value));

  pctEl.addEventListener("click", ()=> modalPct.classList.add("aberta"));
  modalPct.addEventListener("click", (ev)=>{
    const b = ev.target.closest(".pct");
    if (b){ pctEl.value = `${b.dataset.v}%`; modalPct.classList.remove("aberta"); }
    else if (ev.target === modalPct) modalPct.classList.remove("aberta");
  });
});

/* ===== abrir/fechar ===== */
function abrirFormNovo(){
  editIdEl.value = "";
  nomeEl.value = ""; endEl.value = ""; bairroEl.value = ""; rotaEl.value = "";
  pctEl.value = "0%"; negEl.value = ""; recEl.value = "";
  msgForm.textContent=""; msgForm.className="msg";
  searchWrap.style.display = "none";
  formWrap.style.display = "block";
  nomeEl.focus();
}
function fecharForm(){ formWrap.style.display = "none"; editIdEl.value = ""; msgForm.textContent=""; msgForm.className="msg"; }
function abrirPesquisar(){ fecharForm(); searchWrap.style.display = "block"; buscaEl.focus(); renderLista(buscaEl.value); }

/* ===== render lista (só em pesquisar) ===== */
function renderLista(filtro=""){
  listaEl.innerHTML = "";
  if (!clientes.length) return;
  const f = low(filtro);
  const base = clientes
    .filter(c => !f || low(c.nome).includes(f) || low(c.bairro).includes(f) || low(c.rota).includes(f) || low(c.endereco).includes(f))
    .sort((a,b)=> low(a.nome).localeCompare(low(b.nome),"pt-BR",{sensitivity:"base"}));

  for (const c of base){
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="info">
        <div class="titulo">${low(c.nome)}
          <span class="pill">${low(c.bairro)}</span>
          <span class="pill">${low(c.rota)}</span>
          <span class="pill">${c.pctCliente}%</span>
        </div>
        <div class="muted">${low(c.endereco)}</div>
      </div>
      <div class="acoes">
        <button class="editar" data-acao="editar" data-id="${c.id}" title="editar" aria-label="editar"><i class="fas fa-pen"></i></button>
        <button class="excluir" data-acao="excluir" data-id="${c.id}" title="excluir" aria-label="excluir"><i class="fas fa-trash"></i></button>
      </div>`;
    listaEl.appendChild(card);
  }
}

/* ===== ações lista ===== */
function onListaClick(ev){
  const btn = ev.target.closest("button[data-acao]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.acao === "editar")  abrirFormEditar(id);
  if (btn.dataset.acao === "excluir") excluirCliente(id);
}

function abrirFormEditar(id){
  const c = clientes.find(x=>x.id===id); if (!c) return;
  editIdEl.value = c.id;
  nomeEl.value   = low(c.nome);
  endEl.value    = low(c.endereco);
  bairroEl.value = low(c.bairro);
  rotaEl.value   = low(c.rota);
  pctEl.value    = `${c.pctCliente}%`;
  negEl.value    = c.negativo ? fmtBRL(c.negativo).replace("R$","").trim() : "";
  recEl.value    = c.recuperacao ? fmtBRL(c.recuperacao).replace("R$","").trim() : "";
  msgForm.textContent=""; msgForm.className="msg";
  searchWrap.style.display = "none";
  formWrap.style.display = "block";
  nomeEl.focus();
}

/* ===== salvar / excluir ===== */
function validarObrigatorios(){
  if (!low(nomeEl.value))   return "preencha o nome.";
  if (!low(endEl.value))    return "preencha o endereço.";
  if (!low(bairroEl.value)) return "preencha o bairro.";
  if (!low(rotaEl.value))   return "preencha a rota.";
  if (!low(pctEl.value))    return "selecione o % do cliente.";
  return "";
}

async function salvarCliente(){
  const erro = validarObrigatorios();
  if (erro){ msgForm.textContent = erro; msgForm.className = "msg err"; return; }

  const id = editIdEl.value || crypto?.randomUUID?.() || String(Date.now());
  const item = {
    id,
    nome: low(nomeEl.value),
    endereco: low(endEl.value),
    bairro: low(bairroEl.value),
    rota: low(rotaEl.value),
    pctCliente: Math.max(0, Math.min(50, Number(String(pctEl.value).replace("%","")) || 0)),
    negativo: moedaToNum(negEl.value),
    recuperacao: moedaToNum(recEl.value),
  };

  // duplicidade por nome (lowercase)
  const outro = clientes.find(c => c.id !== id && low(c.nome) === item.nome);
  if (outro){ msgForm.textContent = "já existe cliente com esse nome."; msgForm.className="msg warn"; return; }

  const idx = clientes.findIndex(c=>c.id===id);
  if (idx>=0) clientes[idx] = { ...clientes[idx], ...item };
  else clientes.push(item);

  salvarLocal();

  // enfileira e tenta enviar (se online)
  try { queueCliente(item); await pushClientes(); window.dispatchEvent(new CustomEvent("clientes:changed")); } catch {}

  // fecha o formulário (não mostra lista aqui)
  fecharForm();
}

function excluirCliente(id){
  const c = clientes.find(x=>x.id===id); if(!c) return;
  if (!confirm(`excluir o cliente "${c.nome}" localmente?`)) return;
  clientes = clientes.filter(x=>x.id!==id);
  salvarLocal();
  renderLista(buscaEl.value);
}
