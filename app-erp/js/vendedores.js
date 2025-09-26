import { inicializarPagina, getURLBackend, isOnline } from "../../common/js/navegacao.js";
import pullAndMergeIncremental, { __erpSyncInternals as SY } from "./sync.js";

const KEY = SY.KEYS.vendedores;
let itens=[]; let editId=null; let salvando=false;

document.addEventListener("DOMContentLoaded", async () => {
  await inicializarPagina("ERP – Vendedores", "erp");
  carregarLocal(); await tentarSync(); carregarLocal(); preencherLista();
  document.getElementById("btn-salvar").addEventListener("click", salvar);
  document.getElementById("busca").addEventListener("input", preencherLista);
  window.addEventListener("storage",(e)=>{ if([KEY,"__erp_last_sync_broadcast"].includes(e.key)){ carregarLocal(); preencherLista(); }});
});

function carregarLocal(){ try{itens=JSON.parse(localStorage.getItem(KEY))||[]}catch{itens=[]} itens=itens.filter(x=>x.ativo!==false); }
function salvarLocal(){ localStorage.setItem(KEY, JSON.stringify(itens)); }
async function tentarSync(){ try{ await pullAndMergeIncremental(); }catch{} }
const upper=s=>(s||"").toUpperCase();
function limparForm(){ document.getElementById("v-nome").value=""; document.getElementById("v-telefone").value=""; editId=null; }

function preencherLista(){
  const q=(document.getElementById("busca").value||"").trim().toUpperCase();
  const tbody=document.getElementById("lista"); tbody.innerHTML="";
  const arr=[...itens].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"))
    .filter(v=>!q || upper(v.nome).includes(q) || (v.telefone||"").includes(q));
  for(const v of arr){
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${upper(v.nome)}</td>
      <td>${v.telefone||""}</td>
      <td class="acoes-linha" style="text-align:right">
        <button title="Editar" onclick="editar('${v._id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button title="Remover" onclick="remover('${v._id}')"><i class="fa-solid fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
}

async function salvar(){
  if(salvando) return;
  const nome=upper(document.getElementById("v-nome").value.trim());
  const telefone=(document.getElementById("v-telefone").value||"").trim();
  if(!nome){ alert("Informe o nome."); return; }
  salvando=true;
  const now=new Date().toISOString();

  if(editId){
    const i=itens.findIndex(x=>x._id===editId);
    if(i>=0) itens[i]={...itens[i], nome, telefone, updatedAt:now};
  }else{
    const tempId="local_"+Math.random().toString(36).slice(2);
    itens.push({_id:tempId, nome, telefone, ativo:true, createdAt:now, updatedAt:now});
  }
  salvarLocal(); preencherLista(); limparForm();

  if(await isOnline()){
    try{
      const body={nome, telefone, ativo:true};
      const method= editId && !String(editId).startsWith("local_") ? "PUT":"POST";
      const url = `${getURLBackend()}/api/erp/vendedores${method==="POST"?"":`/${editId}`}`;
      const resp=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(resp.ok){
        const doc=await resp.json();
        const j=itens.findIndex(x=>x._id===(editId||doc._id));
        if(j>=0){ itens[j]=doc; salvarLocal(); preencherLista(); }
      }
    }catch{}
  }
  editId=null; salvando=false;
}

function editar(id){
  const v=itens.find(x=>x._id===id); if(!v) return; editId=id;
  document.getElementById("v-nome").value=upper(v.nome);
  document.getElementById("v-telefone").value=v.telefone||"";
  window.scrollTo({top:0,behavior:"smooth"});
}

async function remover(id){
  if(!confirm("Remover este vendedor?")) return;
  const i=itens.findIndex(x=>x._id===id);
  if(i>=0){ itens[i]={...itens[i], ativo:false, updatedAt:new Date().toISOString()}; salvarLocal(); preencherLista(); }
  if(!String(id).startsWith("local_") && await isOnline()){
    try{ await fetch(`${getURLBackend()}/api/erp/vendedores/${id}`,{method:"DELETE"}); }catch{}
  }
}

window.editar=editar; window.remover=remover;
