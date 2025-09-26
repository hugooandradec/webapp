import { inicializarPagina, getURLBackend, isOnline } from "../../common/js/navegacao.js";
import pullAndMergeIncremental, { __erpSyncInternals as SY } from "./sync.js";

const KEY = SY.KEYS.fornecedores;
let itens = [];
let editId = null;
let salvando = false;

document.addEventListener("DOMContentLoaded", async () => {
  await inicializarPagina("ERP – Fornecedores", "erp");
  carregarLocal();
  await tentarSync();
  carregarLocal();
  preencherLista();
  document.getElementById("btn-salvar").addEventListener("click", salvar);
  document.getElementById("busca").addEventListener("input", preencherLista);
  window.addEventListener("storage",(e)=>{ if([KEY,"__erp_last_sync_broadcast"].includes(e.key)){ carregarLocal(); preencherLista(); } });
});

function carregarLocal(){ try{itens=JSON.parse(localStorage.getItem(KEY))||[]}catch{itens=[]} itens=itens.filter(x=>x.ativo!==false); }
function salvarLocal(){ localStorage.setItem(KEY, JSON.stringify(itens)); }
async function tentarSync(){ try{ await pullAndMergeIncremental(); }catch{} }
const upper=s=>(s||"").toUpperCase();

function limparForm(){ document.getElementById("f-nome").value=""; document.getElementById("f-telefone").value=""; editId=null; }

function preencherLista(){
  const q=(document.getElementById("busca").value||"").trim().toUpperCase();
  const tbody=document.getElementById("lista"); tbody.innerHTML="";
  const arr=[...itens].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"))
    .filter(f=>!q || upper(f.nome).includes(q) || (f.telefone||"").includes(q));
  for(const f of arr){
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${upper(f.nome)}</td>
      <td>${f.telefone||""}</td>
      <td class="acoes-linha" style="text-align:right">
        <button title="Editar" onclick="editar('${f._id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button title="Remover" onclick="remover('${f._id}')"><i class="fa-solid fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
}

async function salvar(){
  if(salvando) return;
  const nome=upper(document.getElementById("f-nome").value.trim());
  const telefone=(document.getElementById("f-telefone").value||"").trim();
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
      const method= editId && !String(editId).startsWith("local_") ? "PUT" : "POST";
      const url = `${getURLBackend()}/api/erp/fornecedores${method==="POST"?"":`/${editId}`}`;
      const resp=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(resp.ok){
        const doc=await resp.json();
        const j=itens.findIndex(x=>x._id=== (editId || doc._id));
        if(j>=0){ itens[j]=doc; salvarLocal(); preencherLista(); }
      }
    }catch{}
  }
  editId=null; salvando=false;
}

function editar(id){
  const f=itens.find(x=>x._id===id); if(!f) return; editId=id;
  document.getElementById("f-nome").value=upper(f.nome);
  document.getElementById("f-telefone").value=f.telefone||"";
  window.scrollTo({top:0,behavior:"smooth"});
}

async function remover(id){
  if(!confirm("Remover este fornecedor?")) return;
  const i=itens.findIndex(x=>x._id===id);
  if(i>=0){ itens[i]={...itens[i], ativo:false, updatedAt:new Date().toISOString()}; salvarLocal(); preencherLista(); }
  if(!String(id).startsWith("local_") && await isOnline()){
    try{ await fetch(`${getURLBackend()}/api/erp/fornecedores/${id}`,{method:"DELETE"}); }catch{}
  }
}

window.editar=editar; window.remover=remover;
