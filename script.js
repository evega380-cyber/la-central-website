const words=["ANUNCIA.","ALCANZA.","RESTAURA.","DISCIPULA."];
let i=0;
const word=document.getElementById("word");
setInterval(()=>{
  word.classList.add("word-out");
  setTimeout(()=>{i=(i+1)%words.length;word.textContent=words[i];word.classList.remove("word-out")},280);
},2200);

const heroVideo=document.querySelector('.hero-video');
if(heroVideo){
  heroVideo.playbackRate=0.72;
  heroVideo.addEventListener('loadedmetadata',()=>{heroVideo.playbackRate=0.72});
}

document.getElementById("year").textContent=new Date().getFullYear();
const menu=document.querySelector('.menu');
const nav=document.querySelector('.nav nav');
menu.addEventListener('click',()=>{const open=menu.classList.toggle('open');menu.setAttribute('aria-expanded',open);menu.textContent=open?'✕':'☰'});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰'}));

// V5: server-side Planning Center Calendar integration.
const eventCards = document.getElementById('event-cards');
const pcoStatus = document.getElementById('pco-status');
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function eventDate(iso){
  if(!iso) return 'PRÓXIMAMENTE';
  return new Intl.DateTimeFormat('es-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(new Date(iso)).toUpperCase();
}
async function loadPlanningCenter(){
  if(!eventCards) return;
  try{
    const r = await fetch('/api/events');
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || 'No disponible');
    pcoStatus.textContent = '● Planning Center conectado';
    pcoStatus.classList.add('connected');
    if(!data.events?.length){
      eventCards.innerHTML = `<article class="event-empty"><span>CHURCH CENTER</span><h3>NO HAY EVENTOS PUBLICADOS TODAVÍA.</h3><p>Cuando haya próximos eventos disponibles en Planning Center, aparecerán aquí automáticamente.</p><a class="btn yellow" href="https://iddpmi093.churchcenter.com/home" target="_blank" rel="noopener">VER CHURCH CENTER</a></article>`;
      return;
    }
    eventCards.innerHTML = data.events.map(e => {
      const bg = e.image ? ` style="background-image:url('${esc(e.image)}')"` : '';
      const cls = e.image ? 'event-card has-image' : 'event-card';
      return `<article class="${cls}"${bg}><span class="event-date">${esc(eventDate(e.startsAt))}</span><h3>${esc(e.name)}</h3>${e.location?`<p class="event-meta">${esc(e.location)}</p>`:''}${e.description?`<p>${esc(e.description)}</p>`:''}<a class="text-link" href="${esc(e.url)}" target="_blank" rel="noopener">DETALLES →</a></article>`;
    }).join('');
  }catch(err){
    pcoStatus.textContent = 'Planning Center: conexión pendiente';
    eventCards.innerHTML = `<article class="event-empty"><span>CHURCH CENTER</span><h3>LOS EVENTOS SIGUEN DISPONIBLES.</h3><p>La conexión automática no respondió todavía. Puedes ver los eventos directamente en Church Center.</p><a class="btn yellow" href="https://iddpmi093.churchcenter.com/home" target="_blank" rel="noopener">ABRIR CHURCH CENTER</a></article>`;
  }
}
loadPlanningCenter();
