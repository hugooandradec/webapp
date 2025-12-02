// public/js/jogos-roi.js
// Tela de ajuste de ROI + OCR para relógios (DI/DS)

const qs  = (s,p=document)=>p.querySelector(s);
const qsa = (s,p=document)=>Array.from(p.querySelectorAll(s));

/* ==========================
   ELEMENTOS & ESTADO
========================== */
const video     = qs('#camera');      // corrigido
const canvasAll = qs('#canvas');      // corrigido
const canvasRoi = document.createElement('canvas'); // oculto, só para ROI
const ctxAll    = canvasAll.getContext('2d');
const ctxRoi    = canvasRoi.getContext('2d');

const btnClose  = qs('#btn-fechar');   // corrigido
const btnShot   = qs('#btn-capturar'); // corrigido
const btnTest   = qs('#btn-testar');   // corrigido
const btnSave   = qs('#btn-salvar');   // corrigido
const statusEl  = qs('#status');

const roiBox    = qs('#roi');
const titleEl   = qs('#titulo');
const jogo      = (new URLSearchParams(location.search).get('jogo')||'—').toLowerCase();

const KEY = `roi_cfg_${jogo}`;

// carrega ROI salva (x,y,w,h relativos 0..1)
let roiCfg = JSON.parse(localStorage.getItem(KEY) || 'null') || { x:0.1, y:0.2, w:0.8, h:0.2 };
applyRoiBox();

/* ==========================
   BOOT DA CÂMERA
========================== */
let stream;

document.addEventListener('DOMContentLoaded', async () => {
  titleEl.textContent = `Ajustar ROI — ${jogo}`;
  paintStatus('Carregando câmera...', 'info');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    video.srcObject = stream;

    await waitVideoReady(video);
    resizeCanvases();

    paintStatus('Pronto para capturar', 'ok');
  } catch (e) {
    console.error(e);
    paintStatus('Não foi possível abrir a câmera.', 'err');
  }
});

window.addEventListener('resize', resizeCanvases);

function resizeCanvases(){
  if (!video.videoWidth || !video.videoHeight) return;
  canvasAll.width  = video.videoWidth;
  canvasAll.height = video.videoHeight;
}

/* Espera vídeo ficar com dimensões válidas */
async function waitVideoReady(vid, tries=20) {
  if (vid.readyState >= 2 && vid.videoWidth > 0) return;
  await new Promise(r => vid.addEventListener('loadedmetadata', r, { once:true }));
  for (let i=0;i<tries;i++){
    if (vid.videoWidth>0) return;
    await new Promise(r => requestAnimationFrame(r));
  }
  if (!vid.videoWidth) throw new Error('Vídeo não ficou pronto (videoWidth=0)');
}

/* ==========================
   ROI DRAG/RESIZE
========================== */
function applyRoiBox(){
  roiBox.style.left   = (roiCfg.x*100)+'%';
  roiBox.style.top    = (roiCfg.y*100)+'%';
  roiBox.style.width  = (roiCfg.w*100)+'%';
  roiBox.style.height = (roiCfg.h*100)+'%';
}

let dragging = false, startX=0, startY=0, startRect=null, mode='move';
roiBox.addEventListener('pointerdown', (ev)=>{
  const t = ev.target;
  dragging = true;
  startX = ev.clientX; startY = ev.clientY;
  startRect = roiBox.getBoundingClientRect();
  mode = t.classList.contains('handle') ? t.classList[1] : 'move'; // tl/tr/bl/br
  roiBox.setPointerCapture(ev.pointerId);
});
roiBox.addEventListener('pointermove', (ev)=>{
  if (!dragging) return;
  const stage = qs('#roi-layer').getBoundingClientRect();
  const dx = ev.clientX - startX;
  const dy = ev.clientY - startY;

  let l = startRect.left, t = startRect.top;
  let r = startRect.right, b = startRect.bottom;

  if (mode==='move'){
    l += dx; t += dy; r += dx; b += dy;
  } else {
    if (mode.includes('l')) l += dx;
    if (mode.includes('r')) r += dx;
    if (mode.includes('t')) t += dy;
    if (mode.includes('b')) b += dy;
  }

  // limites
  l = Math.max(stage.left, Math.min(l, stage.right-10));
  t = Math.max(stage.top , Math.min(t, stage.bottom-10));
  r = Math.max(l+20, Math.min(r, stage.right));
  b = Math.max(t+20, Math.min(b, stage.bottom));

  const w = r - l, h = b - t;
  roiBox.style.left = (l - stage.left) + 'px';
  roiBox.style.top  = (t - stage.top ) + 'px';
  roiBox.style.width  = w + 'px';
  roiBox.style.height = h + 'px';

  roiCfg.x = (l - stage.left) / stage.width;
  roiCfg.y = (t - stage.top ) / stage.height;
  roiCfg.w = w / stage.width;
  roiCfg.h = h / stage.height;
});
roiBox.addEventListener('pointerup', (ev)=>{
  dragging = false;
  roiBox.releasePointerCapture(ev.pointerId);
  localStorage.setItem(KEY, JSON.stringify(roiCfg));
});

/* ==========================
   CAPTURA + OCR
========================== */
btnShot?.addEventListener('click', async ()=>{
  try{
    await ensureVideoFrame();
    ctxAll.drawImage(video, 0, 0, canvasAll.width, canvasAll.height);
    paintStatus('Foto capturada. Ajuste a ROI e clique em Testar OCR.', 'ok');
  }catch(e){
    console.error(e);
    paintStatus('Falha ao capturar foto', 'err');
  }
});

async function ensureVideoFrame(){
  if (!video.videoWidth) await waitVideoReady(video);
  const rvfc = video.requestVideoFrameCallback?.bind(video);
  if (rvfc) {
    await new Promise(resolve => rvfc(()=>resolve()));
  } else {
    await new Promise(r=>requestAnimationFrame(r));
  }
}

function buildRoiImage(){
  if (!canvasAll.width || !canvasAll.height){
    throw new Error('Canvas full vazio – capture antes.');
  }
  const rx = roiCfg.x * canvasAll.width;
  const ry = roiCfg.y * canvasAll.height;
  const rw = roiCfg.w * canvasAll.width;
  const rh = roiCfg.h * canvasAll.height;

  const SCALE = 2;
  canvasRoi.width  = Math.max(80, Math.floor(rw*SCALE));
  canvasRoi.height = Math.max(40, Math.floor(rh*SCALE));

  ctxRoi.imageSmoothingEnabled = true;
  ctxRoi.imageSmoothingQuality = 'high';
  ctxRoi.drawImage(canvasAll, rx, ry, rw, rh, 0, 0, canvasRoi.width, canvasRoi.height);

  return canvasRoi;
}

/* ==========================
   OCR
========================== */
btnTest?.addEventListener('click', async ()=>{
  try{
    paintStatus('Rodando OCR...', 'info');
    const img = buildRoiImage();
    const res = await Tesseract.recognize(img, 'por', {
      logger: m => m.status && typeof m.progress==='number' ? 
        console.log(`${m.status}: ${(m.progress*100).toFixed(0)}%`) : null,
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: 6,
      preserve_interword_spaces: '1'
    });

    const rawText = res?.data?.text || '';
    console.log('OCR bruto:', rawText);
    paintStatus(`Resultado OCR: ${rawText.trim()}`, rawText ? 'ok' : 'err');
  } catch(e){
    console.error(e);
    paintStatus('Falha no OCR', 'err');
  }
});

btnSave?.addEventListener('click', ()=>{
  localStorage.setItem(KEY, JSON.stringify(roiCfg));
  paintStatus('ROI salva para o jogo ✓', 'ok');
});

btnClose?.addEventListener('click', ()=> history.back());

/* ==========================
   UI helpers
========================== */
function paintStatus(msg, type){
  const t = type || 'info';
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  statusEl.className = 'status ' + t;
}
