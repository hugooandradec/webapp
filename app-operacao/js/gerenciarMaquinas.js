// js/gerenciarMaquinas.js
import { inicializarPagina } from "../../common/js/navegacao.js";
import { pullMaquinas, pullClientes } from "./sync.js";

/* ========= estado / storage ========= */
const MAQUINAS_KEY = "maquinas_lista_v1";
let maquinas = [];
let clientes = [];

/* ========= utils ========= */
const norm = (s) => (s || "").toString().trim();
const up   = (s) => norm(s).toUpperCase();

const ok   = (m) => window.toast?.success?.(m) ?? alert(m);
const info = (m) => window.toast?.info?.(m) ?? alert(m);
const err  = (m) => window.toast?.error?.(m) ?? alert(m);

/* ========= refs ========= */
const listaEl   = document.getElementById("lista");
const seloEl    = document.getElementById("selo");
const jogoEl    = document.getElementById("jogo");
const clienteEl = document.getElementById("cliente");
const btnSalvar = document.getElementById("btnSalvar");

/* ========= storage ========= */
function salvarLocal(){ localStorage.setItem(MAQUINAS_KEY, JSON.stringify(maquinas)); }
function carregarLocal(){
  const raw = localStorage.getItem(MAQUINAS_KEY);
  maquinas = raw ? JSON.parse(raw) : [];
  maquinas = maquinas.map(m => ({ ...m, selo: up(m.selo), jogo: up(m.jogo), cliente: up(m.cliente||"BASE") }));
}

/* ========= clientes ========= */
function carregarClientesLocal(){
  const rc = localStorage.getItem("clientes_lista_v1");
  clientes = rc ? JSON.parse(rc) : [];
  clientes.sort((a,b) => a.nome.localeCompare(b.nome,"pt-BR"));
}
function preencherDropdownClientes(){
  clienteEl.innerHTML = "";
  const base = document.createElement("option");
  base.value = "BASE"; base.textContent = "BASE";
  clienteEl.appendChild(base);
  clientes.forEach(c => {
    const o = document.createElement("option");
    o.value = up(c.nome); o.textContent = up(c.nome);
    clienteEl.appendChild(o);
  });
  clienteEl.value = "BASE";
}

/* ========= init ========= */
document.addEventListener("DOMContentLoaded", async () => {
  inicializarPagina("Gerenciar Máquinas");

  carregarLocal();
  carregarClientesLocal();
  preencherDropdownClientes();
  renderLista();

  // puxa do servidor (quando disponível)
  try { await pullClientes(); carregarClientesLocal(); preencherDropdownClientes(); } catch {}
  try { const r = await pullMaquinas(); if (r?.count>=0) { carregarLocal(); renderLista(); info("Máquinas sincronizadas."); } } catch {}

  btnSalvar.addEventListener("click", (e) => { e.preventDefault(); salvarMaquina(); });

  // delegação: editar/excluir
  listaEl.addEventListener("click",(ev)=>{
    const btn = ev.target.closest("button[data-acao]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.acao==="editar") editarMaquina(id);
    if (btn.dataset.acao==="excluir") excluirMaquina(id);
  });
});

/* ========= render ========= */
function renderLista(){
  listaEl.innerHTML = "";
  const base = [...maquinas].sort((a,b)=>a.selo.localeCompare(b.selo,"pt-BR"));
  if (!base.length){ listaEl.innerHTML = `<div class="muted">nenhuma máquina cadastrada.</div>`; return; }
  base.forEach(m=>{
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div style="font-weight:900">${up(m.selo)} <span class="pill">${up(m.cliente||"BASE")}</span></div>
        <div class="muted">${up(m.jogo)||"-"}</div>
      </div>
      <div class="acoes">
        <button class="editar" data-acao="editar" data-id="${m.id}" title="editar"><i class="fas fa-pen"></i></button>
        <button class="excluir" data-acao="excluir" data-id="${m.id}" title="excluir"><i class="fas fa-trash"></i></button>
      </div>`;
    listaEl.appendChild(card);
  });
}

/* ========= ações ========= */
function salvarMaquina(){
  const selo = up(seloEl.value);
  const jogo = up(jogoEl.value);
  const cliente = up(clienteEl.value || "BASE");
  if (!selo || !jogo){ err("preencha selo e jogo."); return; }

  // id = selo (evita duplicado)
  const id = selo;
  const idx = maquinas.findIndex(m=>m.id===id);
  if (idx>=0){ maquinas[idx] = { ...maquinas[idx], jogo, cliente }; ok("Máquina atualizada localmente."); }
  else { maquinas.push({ id, selo, jogo, cliente }); ok("Máquina salva localmente."); }

  salvarLocal(); renderLista();
  seloEl.value=""; jogoEl.value=""; clienteEl.value="BASE"; seloEl.focus();
}

function editarMaquina(id){
  const m = maquinas.find(x=>x.id===id);
  if (!m) return;
  seloEl.value = up(m.selo);
  jogoEl.value = up(m.jogo);
  clienteEl.value = up(m.cliente||"BASE");
  ok("Modo edição carregado.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluirMaquina(id){
  const m = maquinas.find(x=>x.id===id); if(!m) return;
  if (!confirm(`Excluir a máquina ${m.selo} localmente?`)) return;
  maquinas = maquinas.filter(x=>x.id!==id);
  salvarLocal(); renderLista(); info("Máquina excluída localmente.");
}
