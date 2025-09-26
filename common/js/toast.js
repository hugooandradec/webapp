
// toast.js
(function () {
  function onReady(fn){
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else { fn(); }
  }

  onReady(() => {
    // ======== estilos ========
    const style = document.createElement("style");
    style.textContent = `
      .toast-fixed {
  position:fixed; 
  top:10px; /* topo em vez de bottom */
  left:50%; 
  transform:translateX(-50%);
  min-width:220px; 
  max-width:340px;
  padding:10px 14px; 
  border-radius:8px;
  font-size:14px; 
  font-weight:600; 
  color:#fff;
  box-shadow:0 8px 24px rgba(0,0,0,.18);
  opacity:0; 
  transition:opacity .2s ease-in-out;
  text-align:center; 
  z-index:9999;
}
      .toast-fixed.show { opacity:1; }
      .toast-fixed.info    { background:#2563eb; }
      .toast-fixed.success { background:#16a34a; }
      .toast-fixed.error   { background:#dc2626; }
      .toast-fixed.warn    { background:#d97706; }
    `;
    document.head.appendChild(style);

    // ======== elemento único ========
    let el = document.querySelector(".toast-fixed");
    if (!el){
      el = document.createElement("div");
      el.className = "toast-fixed";
      document.body.appendChild(el);
    }

    let hideTimer = null;
    function showToast(message, type="info", duration=3000){
      if (!message) return;
      el.textContent = message;
      el.className = `toast-fixed show ${type}`;
      if (hideTimer) clearTimeout(hideTimer);
      if (duration > 0) {
        hideTimer = setTimeout(()=>hideToast(), duration);
      }
    }
    function hideToast(){
      el.classList.remove("show");
    }

    // API pública
    window.toast = {
      info:(m,t=0)=>showToast(m,"info",t),     // duração 0 = fica até mudar
      ok:(m,t=2000)=>showToast(m,"success",t),
      warn:(m,t=3000)=>showToast(m,"warn",t),
      err:(m,t=0)=>showToast(m,"error",t),    // erro fica até ser trocado
      set:(m,type="info")=>showToast(m,type,0),
      hide:hideToast
    };

    // ======== eventos de sync ========
    window.addEventListener("sync:pull:start", ()=>toast.set("🔄 Atualizando...", "info"));
    window.addEventListener("sync:pull:ok",    ()=>toast.ok("✅ Finalizado"));
    window.addEventListener("sync:pull:error", e=>toast.err(`❌ Erro ao atualizar: ${e.detail?.error||''}`));

    window.addEventListener("sync:push:start", ()=>toast.set("⤴️ Enviando...", "info"));
    window.addEventListener("sync:push:ok",    ()=>toast.ok("✅ Finalizado"));
    window.addEventListener("sync:push:error", e=>toast.err(`❌ Erro ao enviar: ${e.detail?.error||''}`));
  });
})();
