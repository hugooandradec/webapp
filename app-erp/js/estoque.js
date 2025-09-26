import { inicializarPagina, getURLBackend, isOnline } from "../../common/js/navegacao.js";
import pullAndMergeIncremental, { __erpSyncInternals as SY } from "./sync.js";

const K = SY.KEYS;
let fornecedores=[], produtos=[], entradas=[], vendas=[];
let editId=null; let salvando=false;

document.addEventListener("DOMContentLoaded", async () => {
  await inicializarPagina("ERP – Estoque", "erp");
  carregarLocal(); await tentarSync(); carregarLocal();

  preencherSelects();
  preencherEntradas();
  preencherResumo();

  document.getElementById("btn-salvar-entrada").addEventListener("click", salvarEntrada);
  document.getElementById("btn-limpar").addEventListener("click", limparForm);
  document.getElementById("busca-entrada").addEventListener("input", preencherEntradas);

  window.addEventListener("storage",(e)=>{
    if ([K.fornecedores,K.produtos,K.entradas,K.vendas,"__erp_last_sync_broadcast"].includes(e.key)){
      carregarLocal(); preencherSelects(); preencherEntradas(); preencherResumo();
    }
  });

  // data padrão hoje
  document.getElementById("e-data").value = new Date().toISOString().slice(0,10);
});

function carregarLocal(){
  try{ fornecedores=JSON.parse(localStorage.getItem(K.fornecedores))||[] }catch{ fornecedores=[] }
  try{ produtos=JSON.parse(localStorage.getItem(K.produtos))||[] }catch{ produtos=[] }
  try{ entradas=JSON.parse(localStorage.getItem(K.entradas))||[] }catch{ entradas=[] }
  try{ vendas=JSON.parse(localStorage.getItem(K.vendas))||[] }catch{ vendas=[] }
  fornecedores=fornecedores.filter(x=>x.ativo!==false);
  produtos=produtos.filter(x=>x.ativo!==false);
  entradas=entradas.filter(x=>x.ativo!==false && x.tipo==="ENTRADA");
  vendas=vendas.filter(x=>x.ativo!==false);
}
function salvarLocal(){ localStorage.setItem(K.entradas, JSON.stringify(entradas)); }
async function tentarSync(){ try{ await pullAndMergeIncremental(); }catch{} }

const upper=s=>(s||"").toUpperCase();
const toBRL=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function parseMoeda(txt){ if(typeof txt!=="string") return Number(txt)||0; const n=txt.replace(/[^\d,,-.]/g,"").replace(/\./g,"").replace(",","."); const val=Number(n); return isNaN(val)?0:val; }

function limparForm(){
  ["e-data","e-fornecedor","e-produto","e-quantidade","e-custo","e-obs"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  document.getElementById("e-data").value = new Date().toISOString().slice(0,10);
  editId=null;
}

function preencherSelects(){
  const sf=document.getElementById("e-fornecedor");
  const sp=document.getElementById("e-produto");
  sf.innerHTML=`<option value="">-- selecione --</option>`;
  sp.innerHTML=`<option value="">-- selecione --</option>`;

  fornecedores.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"))
    .forEach(f=>sf.insertAdjacentHTML("beforeend",`<option value="${f._id}">${upper(f.nome)}</option>`));
  produtos.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"))
    .forEach(p=>sp.insertAdjacentHTML("beforeend",`<option value="${p._id}">${upper(p.nome)} (${p.sku||""})</option>`));
}

function preencherEntradas(){
  const q=(document.getElementById("busca-entrada").value||"").trim().toUpperCase();
  const tbody=document.getElementById("lista-entradas"); tbody.innerHTML="";
  const arr=[...entradas]
    .sort((a,b)=>(b.data||"").localeCompare(a.data||""))
    .filter(e=>{
      const forn = fornecedores.find(f=>f._id===e.fornecedorId);
      const prod = produtos.find(p=>p._id===e.produtoId);
      const texto = `${upper(forn?.nome||"")} ${upper(prod?.nome||"")} ${upper(e.obs||"")}`;
      return !q || texto.includes(q);
    });

  for(const e of arr){
    const forn = fornecedores.find(f=>f._id===e.fornecedorId);
    const prod = produtos.find(p=>p._id===e.produtoId);
    const total = (Number(e.quantidade||0) * Number(e.custoUnit||0));
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${fmtData(e.data)}</td>
      <td>${upper(forn?.nome||"")}</td>
      <td>${upper(prod?.nome||"")}</td>
      <td>${e.quantidade||0}</td>
      <td>${toBRL(e.custoUnit||0)}</td>
      <td>${toBRL(total)}</td>
      <td style="text-align:right" class="acoes-linha">
        <button title="Editar" onclick="editar('${e._id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button title="Remover" onclick="remover('${e._id}')"><i class="fa-solid fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
}

function estoqueDisponivel(produtoId){
  let ent=0; for(const e of entradas) if(e.produtoId===produtoId) ent += (e.quantidade||0);
  let sai=0; for(const v of vendas)   if(v.produtoId===produtoId) sai += (v.quantidade||0);
  return ent - sai;
}

function preencherResumo(){
  const tbody=document.getElementById("lista-estoque"); tbody.innerHTML="";
  const saldoMap = new Map(); // produtoId => { sku,nome, qtd, somaCusto }
  for(const p of produtos){ saldoMap.set(p._id,{ sku:p.sku||"", nome:upper(p.nome||""), qtd:0, custoTotal:0 }); }
  for(const e of entradas){
    const n=saldoMap.get(e.produtoId); if(!n) continue;
    n.qtd += (e.quantidade||0);
    n.custoTotal += (e.quantidade||0) * (e.custoUnit||0);
  }
  for(const v of vendas){
    const n=saldoMap.get(v.produtoId); if(!n) continue;
    n.qtd -= (v.quantidade||0);
  }
  const linhas=[...saldoMap.values()].filter(l=>l.qtd!==0 || l.custoTotal!==0)
    .sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
  for(const l of linhas){
    const custoMedio = l.qtd>0 ? (l.custoTotal/l.qtd) : 0;
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${l.sku}</td>
      <td>${l.nome}</td>
      <td>${l.qtd}</td>
      <td>${toBRL(custoMedio)}</td>
      <td>${toBRL(custoMedio*l.qtd)}</td>`;
    tbody.appendChild(tr);
  }
}

async function salvarEntrada(){
  if(salvando) return;
  const data=document.getElementById("e-data").value;
  const fornecedorId=document.getElementById("e-fornecedor").value;
  const produtoId=document.getElementById("e-produto").value;
  const quantidade=Number(document.getElementById("e-quantidade").value||0);
  const custoUnit=parseMoeda(document.getElementById("e-custo").value||"0");
  const obs=(document.getElementById("e-obs").value||"").trim();
  if(!data||!fornecedorId||!produtoId||quantidade<=0){ alert("Preencha os campos obrigatórios."); return; }

  salvando=true;
  const now=new Date().toISOString();
  if(editId){
    const i=entradas.findIndex(x=>x._id===editId);
    if(i>=0) entradas[i]={...entradas[i], data, fornecedorId, produtoId, quantidade, custoUnit, obs, updatedAt:now};
  }else{
    const tempId="local_"+Math.random().toString(36).slice(2);
    entradas.push({_id:tempId, tipo:"ENTRADA", data, fornecedorId, produtoId, quantidade, custoUnit, obs, ativo:true, createdAt:now, updatedAt:now});
  }
  salvarLocal(); preencherEntradas(); preencherResumo(); limparForm();

  if(await isOnline()){
    try{
      const body={tipo:"ENTRADA", data, fornecedorId, produtoId, quantidade, custoUnit, obs, ativo:true};
      const method= editId && !String(editId).startsWith("local_") ? "PUT":"POST";
      const url = `${getURLBackend()}/api/erp/entradas${method==="POST"?"":`/${editId}`}`;
      const resp=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(resp.ok){
        const doc=await resp.json();
        const j=entradas.findIndex(x=>x._id===(editId||doc._id));
        if(j>=0){ entradas[j]=doc; salvarLocal(); preencherEntradas(); preencherResumo(); }
      }
    }catch{}
  }
  editId=null; salvando=false;
}

function editar(id){
  const e=entradas.find(x=>x._id===id); if(!e) return; editId=id;
  document.getElementById("e-data").value=e.data||"";
  document.getElementById("e-fornecedor").value=e.fornecedorId||"";
  document.getElementById("e-produto").value=e.produtoId||"";
  document.getElementById("e-quantidade").value=e.quantidade??"";
  document.getElementById("e-custo").value=e.custoUnit??"";
  document.getElementById("e-obs").value=e.obs||"";
  window.scrollTo({top:0,behavior:"smooth"});
}

async function remover(id){
  if(!confirm("Remover esta entrada?")) return;
  const i=entradas.findIndex(x=>x._id===id);
  if(i>=0){ entradas[i]={...entradas[i], ativo:false, updatedAt:new Date().toISOString()}; salvarLocal(); preencherEntradas(); preencherResumo(); }
  if(!String(id).startsWith("local_") && await isOnline()){
    try{ await fetch(`${getURLBackend()}/api/erp/entradas/${id}`,{method:"DELETE"}); }catch{}
  }
}

function fmtData(iso){ if(!iso) return ""; const d=new Date(iso+"T00:00:00"); const dd=String(d.getDate()).padStart(2,"0"), mm=String(d.getMonth()+1).padStart(2,"0"), yy=String(d.getFullYear()).slice(-2); return `${dd}/${mm}/${yy}`; }

window.editar=editar; window.remover=remover;
