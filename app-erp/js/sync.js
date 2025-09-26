import { getURLBackend, isOnline } from "../../common/js/navegacao.js";

const KEYS = {
  produtos:     "erp_produtos_cache_v1",
  fornecedores: "erp_fornecedores_cache_v1",
  vendedores:   "erp_vendedores_cache_v1",
  entradas:     "erp_entradas_cache_v1",
  vendas:       "erp_vendas_cache_v1"
};
const LAST_SYNC_KEY = "__erp_last_sync_iso_v1";
const SYNC_BROADCAST_KEY = "__erp_last_sync_broadcast";

function readCache(key){ try{return JSON.parse(localStorage.getItem(key))||[]}catch{return[]} }
function writeCache(key,value){ localStorage.setItem(key, JSON.stringify(value)) }
function isNewer(aISO,bISO){ if(!aISO&&bISO)return true; if(!bISO)return false; return bISO>aISO }
function mergeById(localArr,incomingArr){
  if(!Array.isArray(localArr)) localArr=[];
  if(!Array.isArray(incomingArr)||incomingArr.length===0) return localArr;
  const map=new Map(localArr.map(d=>[d._id,d]));
  for(const doc of incomingArr){
    const cur=map.get(doc._id);
    if(!cur){ map.set(doc._id,doc); continue; }
    if(isNewer(cur.updatedAt,doc.updatedAt)){ map.set(doc._id,doc); }
    else if(doc.ativo===false && cur.ativo!==false){
      map.set(doc._id,{...cur,ativo:false,updatedAt:doc.updatedAt||cur.updatedAt});
    }
  }
  return [...map.values()];
}
function persistAll(all){
  writeCache(KEYS.produtos,all.produtos);
  writeCache(KEYS.fornecedores,all.fornecedores);
  writeCache(KEYS.vendedores,all.vendedores);
  writeCache(KEYS.entradas,all.entradas);
  writeCache(KEYS.vendas,all.vendas);
  localStorage.setItem(SYNC_BROADCAST_KEY,String(Date.now()));
}
function readAll(){
  return {
    produtos:readCache(KEYS.produtos),
    fornecedores:readCache(KEYS.fornecedores),
    vendedores:readCache(KEYS.vendedores),
    entradas:readCache(KEYS.entradas),
    vendas:readCache(KEYS.vendas),
  };
}

export default async function pullAndMergeIncremental(){
  if(!(await isOnline())) return;
  const base=getURLBackend();
  const since=localStorage.getItem(LAST_SYNC_KEY)||"";
  const url=`${base}/api/erp/sync${since?`?since=${encodeURIComponent(since)}`:""}`;
  let payload;
  try{
    const resp=await fetch(url,{method:"GET",cache:"no-store"});
    if(!resp.ok) return;
    payload=await resp.json();
  }catch{ return; }
  const local=readAll();
  const merged={
    produtos:mergeById(local.produtos,payload.produtos||[]),
    fornecedores:mergeById(local.fornecedores,payload.fornecedores||[]),
    vendedores:mergeById(local.vendedores,payload.vendedores||[]),
    entradas:mergeById(local.entradas,payload.entradas||[]),
    vendas:mergeById(local.vendas,payload.vendas||[]),
  };
  persistAll(merged);
  const now=typeof payload?.now==="string"&&payload.now?payload.now:new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY,now);
}

export const __erpSyncInternals={KEYS,LAST_SYNC_KEY,readCache,writeCache,mergeById};
