// js/manutencao.js — manutenção com auto-preenchimento por cliente + máquinas
import { inicializarPagina } from "../../common/js/navegacao.js";
import { syncTry, pullClientes, pullMaquinas, pullManutencoes, pushManutencoes } from "./sync.js";

const K = {
  clientes: "clientes_lista_v1",
  maquinas: "maquinas_lista_v1",
  manutencoes: "manutencoes_lista_v1",
};

const fmtBRL = (v) => (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const hojeISO = ()=>{ const d=new Date(); return d.toISOString().slice(0,10); };

function readLS(key){ try{ return JSON.parse(localStorage.getItem(key) || "[]"); }catch{return [];} }
function writeLS(key,v){ localStorage.setItem(key, JSON.stringify(v)); }

document.addEventListener("DOMContentLoaded", async () => {
  inicializarPagina("Manutenção");

  const selPonto = document.getElementById("ponto");
  const selMaq   = document.getElementById("maquina");
  const inpResp  = document.getElementById("responsavel");
  const inpTel   = document.getElementById("telefone");
  const inpEnd   = document.getElementById("endereco");
  const txtProb  = document.getElementById("problema");
  const btnSalv  = document.getElementById("btnSalvar");
  const btnLimpar= document.getElementById("btnLimpar");
  const listaBox = document.getElementById("lista");

  // 1) pull inicial
  await Promise.allSettled([
    syncTry(() => pullClientes(), 8000),
    syncTry(() => pullMaquinas(), 8000),
    syncTry(() => pullManutencoes(), 8000),
  ]);

  let clientes = readLS(K.clientes);
  let maquinas = readLS(K.maquinas);
  let itens    = readLS(K.manutencoes);

  const byClienteId = (cid) => maquinas.filter(m => String(m.clienteId||m.cliente_id||m.cliente) === String(cid));

  function renderSelectClientes() {
    const opts = [`<option value="">Selecione...</option>`]
      .concat(clientes
        .sort((a,b)=> (a.nome||"").localeCompare(b.nome||"", "pt-BR", {sensitivity:"base"}))
        .map(c => `<option value="${c.id}">${c.nome || c.cliente || c.nomeFantasia || "-"}</option>`));
    selPonto.innerHTML = opts.join("");
  }
  function renderSelectMaquinas(cid) {
    const arr = cid ? byClienteId(cid) : [];
    selMaq.disabled = !arr.length;
    selMaq.innerHTML = [`<option value="">${arr.length ? "Selecione..." : "—"}</option>`]
      .concat(arr.map(m => `<option value="${m.id||m.selo}">${m.selo || m.id || "-"} ${m.jogo?("— "+m.jogo):""}</option>`))
      .join("");
  }
  function preencherCliente(cid){
    const c = clientes.find(x => String(x.id)===String(cid));
    if (!c) { inpResp.value=""; inpTel.value=""; inpEnd.value=""; return; }
    inpResp.value = c.responsavel || c.contato || "";
    inpTel.value  = c.telefone || c.fone || "";
    inpEnd.value  = c.endereco || c.logradouro || "";
  }

  selPonto.addEventListener("change", (e)=>{
    const cid = e.target.value;
    preencherCliente(cid);
    renderSelectMaquinas(cid);
  });

  btnLimpar.addEventListener("click", ()=>{
    selPonto.value=""; selMaq.innerHTML=""; selMaq.disabled=true;
    inpResp.value=""; inpTel.value=""; inpEnd.value=""; txtProb.value="";
  });

  function editar(i){
    const it = itens[i]; if (!it) return;
    const novoProb = prompt("Atualizar descrição do problema:", it.problema || "") ?? it.problema;
    const novoStatus = prompt("Status (aberta, em_andamento, concluida):", it.status || "aberta") ?? it.status;
    it.problema = novoProb;
    it.status = (novoStatus || "aberta").toLowerCase();
    writeLS(K.manutencoes, itens);
    renderLista();
    syncTry(()=> pushManutencoes({ upserts:[it], deletes:[] }), 6000).catch(()=>console.warn("sync pendente"));
  }
  function excluir(i){
    const it = itens[i]; if (!it) return;
    if (!confirm("Remover manutenção?")) return;
    itens.splice(i,1);
    writeLS(K.manutencoes, itens);
    renderLista();
    if (it.id) syncTry(()=> pushManutencoes({ upserts:[], deletes:[it.id] }), 6000).catch(()=>{});
  }

  function renderLista(){
    const rows = itens
      .sort((a,b)=>(b.ts||0)-(a.ts||0))
      .map((it,i)=>{
        const cli = clientes.find(c=>String(c.id)===String(it.clienteId));
        const maq = maquinas.find(m=>String(m.id||m.selo)===String(it.maquinaId));
        return `
          <div class="card">
            <div>
              <strong>${cli?.nome || "-"}</strong> — <small>${cli?.endereco || "-"}</small>
              <small>Resp.: ${it.responsavel || "-"} · Tel.: ${it.telefone || "-"}</small>
              <small>Máquina: ${maq?.selo || maq?.id || "-"} ${maq?.jogo?("("+maq.jogo+")"):""}</small>
              <div style="margin-top:6px">${it.problema || "-"}</div>
              <small>Status: <strong>${(it.status||"aberta")}</strong> — ${it.data || hojeISO()}</small>
            </div>
            <div class="acoes">
              <button title="editar" onclick="window._man.editar(${i})"><i class="fas fa-pen-to-square"></i></button>
              <button title="excluir" onclick="window._man.excluir(${i})"><i class="fas fa-trash"></i></button>
            </div>
          </div>`;
      }).join("");
    listaBox.innerHTML = rows || `<div style="color:#666">Sem manutenções abertas.</div>`;
  }

  btnSalv.addEventListener("click", ()=>{
    const clienteId = selPonto.value;
    const maquinaId = selMaq.value;
    const problema  = txtProb.value.trim();
    if (!clienteId) return alert("Selecione o ponto (cliente).");
    if (!problema)  return alert("Descreva o problema.");

    const novo = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      ts: Date.now(),
      data: hojeISO(),
      clienteId,
      maquinaId: maquinaId || null,
      responsavel: (document.getElementById("responsavel").value || "").trim(),
      telefone: (document.getElementById("telefone").value || "").trim(),
      endereco: (document.getElementById("endereco").value || "").trim(),
      problema,
      status: "aberta",
    };
    itens.push(novo);
    writeLS(K.manutencoes, itens);
    renderLista();

    // tenta sync; se back ainda não tiver a rota, só fica local por enquanto
    syncTry(()=> pushManutencoes({ upserts:[novo], deletes:[] }), 6000)
      .then(()=> console.log("manutenção sincronizada"))
      .catch(()=> console.warn("sync pendente p/ manutenção"));
    txtProb.value = "";
  });

  window._man = { editar, excluir };

  // primeira renderização
  renderSelectClientes();
  renderSelectMaquinas("");
  renderLista();
});
