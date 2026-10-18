const HOME="https://iddpmi093.churchcenter.com/home";
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function safeUrl(value){try{const u=new URL(value);if(u.protocol==="https:"&&["iddpmi093.churchcenter.com","registrations.planningcenteronline.com"].includes(u.hostname))return u.href}catch{}return HOME}
async function registrations(){
const target=document.getElementById("reg-list");
try{const response=await fetch("/api/events-page-registrations");if(!response.ok)throw Error("API");
const data=await response.json(),items=data.registrations||[];
if(!items.length){target.innerHTML='<p class="status">No hay inscripciones abiertas en este momento.</p>';return}
target.innerHTML=items.map(item=>{const img=/^https:\/\//i.test(item.image||"")?'<img src="'+escapeHtml(item.image)+'" alt="" loading="lazy">':"";
return '<article class="reg-card">'+img+'<div class="reg-body"><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.description).replace(/<[^>]*>/g,"").slice(0,260)+'</p><a class="action" href="'+escapeHtml(safeUrl(item.url))+'" target="_blank" rel="noopener noreferrer">INSCRIBIRME →</a></div></article>'}).join("");
}catch{target.innerHTML='<p class="status">No pudimos cargar las inscripciones. <a class="fallback" href="'+HOME+'" target="_blank" rel="noopener noreferrer">Ver Church Center →</a></p>'}}
const now=new Date();const easternParts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);const easternValues=Object.fromEntries(easternParts.filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));const {year:y,month:m,day:d}=easternValues;
let shown=new Date(y,m-1,1);const grid=document.getElementById("calendar-grid"),label=document.getElementById("month-label"),status=document.getElementById("calendar-status");
function monthKey(date){return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")}
function render(events){const year=shown.getFullYear(),month=shown.getMonth(),start=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
const byDay=new Map();for(const ev of events){const date=String(ev.startsAt||"").slice(0,10),day=Number(date.slice(8,10));if(date.slice(0,7)!==monthKey(shown)||!day)continue;if(!byDay.has(day))byDay.set(day,[]);byDay.get(day).push(ev)}
let html="";const cells=Math.ceil((start+days)/7)*7;for(let i=0;i<cells;i++){const day=i-start+1;if(day<1||day>days){html+='<div class="day other" aria-hidden="true"></div>';continue}
const today=year===y&&month===m-1&&day===d;html+='<div class="day'+(today?" today":"")+'"><span class="num">'+day+'</span>';
for(const ev of byDay.get(day)||[]){html+='<a class="event-chip" href="'+escapeHtml(safeUrl(ev.url))+'" target="_blank" rel="noopener noreferrer" title="'+escapeHtml(ev.name)+'">'+escapeHtml(ev.name)+'</a>'}html+='</div>'}grid.innerHTML=html}
let requestId=0;
async function loadMonth(){const id=++requestId;label.textContent=new Intl.DateTimeFormat("es-US",{month:"long",year:"numeric"}).format(shown);status.textContent="Cargando eventos publicados...";render([]);
try{const response=await fetch("/api/events-page-calendar?month="+monthKey(shown));if(!response.ok)throw Error("API");const data=await response.json();if(id!==requestId)return;const events=data.events||[];render(events);status.textContent=events.length?events.length+" evento(s) publicado(s) este mes. Selecciona uno para ver detalles.":"No hay eventos publicados para este mes."}
catch{if(id!==requestId)return;status.innerHTML='No pudimos cargar el calendario. <a class="fallback" href="'+HOME+'" target="_blank" rel="noopener noreferrer">Ver Church Center →</a>'}}
document.getElementById("prev").addEventListener("click",()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);loadMonth()});
document.getElementById("next").addEventListener("click",()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);loadMonth()});
document.getElementById("current").addEventListener("click",()=>{shown=new Date(y,m-1,1);loadMonth()});
registrations();loadMonth();
