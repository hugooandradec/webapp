import { inicializarPagina, getURLBackend, isOnline } from "../../common/js/navegacao.js";
import pullAndMergeIncremental, { __erpSyncInternals as SY } from "./sync.js";

const KEY = SY.KEYS.produtos;
let itens = [];
let editId = null;
let salvando = false;

document.addEventListener("DOMContentLoaded", async () => {
  await inicializarPagina("ERP – Produtos", "erp");
  carregarLocal();
  await tentarSync();
  carregarLocal();
  preencherLista();
  document.getElementById("btn-salvar").addEventListener("click", salvar);
  document.getElementById("busca").addEventListener("input", preencherLista);
  window.addEventListener("storage", (e) => {
    if ([KEY, "__erp_last_sync_broadcast"].includes(e.key)) { carregarLocal(); preencherLista(); }
  });
});

function carregarLocal(){ try{ itens = JSON.parse(localStorage.getItem(KEY))||[] }catch{ itens=[] } itens = itens.filter(p=>p.ativo!==false); }
function salvarLocal(){ localStorage.setItem(KEY, JSON.stringify(itens)); }
async function tentarSync(){ try{ await pullAndMergeIncremental(); }catch{} }

function toBRL(v){ return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function parseMoeda(txt){ if(typeof txt!=="string") return Number(txt)||0; const n=txt.replace(/[^\d,,-.]/g,"").replace(/\./g,"").replace(",","."); const val=Number(n); return isNaN(val)?0:val; }
function upper(s){ return (s||"").toUpperCase(); }

function proximoSKU(){
  const usados = itens.map(p => Number(p.sku||0)).filter(n=>!isNaN(n));
  const max = usados.length? Math.max(...usados):0;
  const nxt = String(max+1).padStart(4,"0");
  return nxt;
}

function limparForm(keepSKU=true){
  const nome=document.getElementById("p-nome");
  const sku=document.getElementById("p-sku");
  const unidade=document.getElementById("p-unidade");
  const custo=document.getElementById("p-custo");
  const repasse=document.getElementById("p-repasse");
  nome.value=""; unidade.value=""; custo.value=""; repasse.value="";
  sku.value = keepSKU ? proximoSKU() : "";
  editId=null;
}

function preencherLista(){
  const q=(document.getElementById("busca").value||"").trim().toUpperCase();
  const tbody=document.getElementById("lista"); tbody.innerHTML="";
  const arr=[...itens]
    .sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"))
    .filter(p => !q || upper(p.nome).includes(q) || String(p.sku).includes(q));
  for(const p of arr){
    const tr=document.createElement("tr");
    tr.innerHTML = `
      <td>${upper(p.nome)}</td>
      <td>${p.sku||""}</td>
      <td>${upper(p.unidade||"")}</td>
      <td>${toBRL(p.precoCusto||0)}</td>
      <td>${toBRL(p.precoRepasse||0)}</td>
      <td class="acoes-linha" style="text-align:right">
        <button title="Editar" onclick="editar('${p._id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button title="Remover" onclick="remover('${p._id}')"><i class="fa-solid fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
}

async function salvar(){
  if (salvando) return;
  const nome=upper(document.getElementById("p-nome").value.trim());
  const sku=(document.getElementById("p-sku").value || proximoSKU()).padStart(4,"0");
  const unidade=upper(document.getElementById("p-unidade").value.trim());
  const precoCusto=parseMoeda(document.getElementById("p-custo").value||"0");
  const precoRepasse=parseMoeda(document.getElementById("p-repasse").value||"0");
  if(!nome){ alert("Informe o nome."); return; }
  if(!sku){ alert("SKU inválido."); return; }

  const now=new Date().toISOString();
  salvando=true;

  if (editId){
    const i=itens.findIndex(x=>x._id===editId);
    if(i>=0) itens[i]={...itens[i], nome, sku, unidade, precoCusto, precoRepasse, updatedAt:now};
  } else {
    const tempId = "local_"+Math.random().toString(36).slice(2);
    itens.push({_id:tempId, nome, sku, unidade, precoCusto, precoRepasse, ativo:true, createdAt:now, updatedAt:now});
  }
  salvarLocal(); preencherLista(); limparForm(true);

  if(await isOnline()){
    try{
      const body={nome, sku, unidade, precoCusto, precoRepasse, ativo:true};
      const method= editId && !String(editId).startsWith("local_") ? "PUT":"POST";
      const url = `${getURLBackend()}/api/erp/produtos${method==="POST"?"":`/${editId}`}`;
      const resp=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(resp.ok){
        const doc=await resp.json();
        const idToReplace = editId && !String(editId).startsWith("local_") ? editId : (itens.find(p=>p.sku===sku)?._id);
        const j=itens.findIndex(p=>p._id===idToReplace);
        if(j>=0){ itens[j]=doc; salvarLocal(); preencherLista(); }
      }
    }catch{}
  }
  editId=null; salvando=false;
}

function editar(id){
  const p=itens.find(x=>x._id===id); if(!p) return;
  editId=id;
  document.getElementById("p-nome").value=upper(p.nome);
  document.getElementById("p-sku").value=p.sku||proximoSKU();
  document.getElementById("p-unidade").value=upper(p.unidade||"");
  document.getElementById("p-custo").value=p.precoCusto;
  document.getElementById("p-repasse").value=p.precoRepasse;
  window.scrollTo({top:0,behavior:"smooth"});
}

async function remover(id){
  if(!confirm("Remover este produto?")) return;
  const i=itens.findIndex(x=>x._id===id); if(i>=0){ itens[i]={...itens[i], ativo:false, updatedAt:new Date().toISOString()}; salvarLocal(); preencherLista(); }
  if(!String(id).startsWith("local_") && await isOnline()){
    try{ await fetch(`${getURLBackend()}/api/erp/produtos/${id}`,{method:"DELETE"}); }catch{}
  }
}

window.editar=editar; window.remover=remover;
