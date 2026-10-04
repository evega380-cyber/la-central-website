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
