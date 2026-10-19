// Add approved photos from @_chosen_youth_ as local files (recommended)
// or stable HTTPS image URLs. Example:
// { src: "/jovenes/fotos/campamento-2026.jpg", alt: "Jóvenes en campamento", caption: "Campamento" }
// Instagram profile/post URLs are NOT direct image URLs; do not paste those here.
const youthPhotos = [];
const track=document.getElementById("gallery-track");
const prev=document.getElementById("gallery-prev");
const next=document.getElementById("gallery-next");
const count=document.getElementById("gallery-count");
if(track&&youthPhotos.length){
  const safe=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const valid=youthPhotos.filter(p=>typeof p.src==="string"&&(p.src.startsWith("/jovenes/fotos/")||/^https:\/\//.test(p.src)));
  if(valid.length){
    track.innerHTML=valid.map(p=>'<div class="gallery-slide"><img loading="lazy" src="'+safe(p.src)+'" alt="'+safe(p.alt||"Momento de Jóvenes Escogidos")+'">'+(p.caption?'<div class="gallery-caption">'+safe(p.caption)+'</div>':"")+'</div>').join("");
    let index=0;
    const render=()=>{track.style.transform="translateX(-"+index*100+"%)";count.textContent=(index+1)+" / "+valid.length;prev.disabled=valid.length<2;next.disabled=valid.length<2};
    const move=delta=>{index=(index+delta+valid.length)%valid.length;render()};
    prev.addEventListener("click",()=>move(-1));next.addEventListener("click",()=>move(1));render();
    if(valid.length>1&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      let timer=setInterval(()=>move(1),5200);
      const shell=track.closest(".gallery-shell");
      shell.addEventListener("mouseenter",()=>clearInterval(timer));
      shell.addEventListener("mouseleave",()=>{clearInterval(timer);timer=setInterval(()=>move(1),5200)});
      document.addEventListener("visibilitychange",()=>{if(document.hidden)clearInterval(timer);else{clearInterval(timer);timer=setInterval(()=>move(1),5200)}});
    }
  }
}