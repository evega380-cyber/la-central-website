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

  
/* =========================================
   LA CENTRAL - PLANNING CENTER SLIDESHOW
   ========================================= */

(async function initializeRegistrationSlideshow() {
  const container = document.getElementById("registration-slides");
  const controls = document.getElementById("registration-controls");
  const dotsContainer = document.getElementById("registration-dots");
  const prevButton = document.getElementById("registration-prev");
  const nextButton = document.getElementById("registration-next");

  if (!container || !controls || !dotsContainer) return;

  let registrations = [];
  let currentIndex = 0;
  let rotationTimer = null;

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character]));

  function showSlide(index) {
    const slides = container.querySelectorAll(".registration-slide");
    const dots = dotsContainer.querySelectorAll(".registration-dot");

    if (!slides.length) return;

    currentIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      const active = i === currentIndex;
      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", String(!active));
      slide.inert = !active;
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
      dot.setAttribute("aria-label", `Ver evento ${i + 1}`);
      dot.setAttribute("aria-current", i === currentIndex ? "true" : "false");
    });
  }

  function stopRotation() {
    if (rotationTimer) clearInterval(rotationTimer);
    rotationTimer = null;
  }

  function startRotation() {
    stopRotation();

    if (registrations.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    rotationTimer = setInterval(() => {
      showSlide(currentIndex + 1);
    }, 6000);
  }

  function renderSlides() {
    stopRotation();

    if (!registrations.length) {
      container.innerHTML = `
        <p class="registration-empty">
          No hay inscripciones disponibles en este momento.
          ¡Vuelve pronto para conocer nuestros próximos eventos!
        </p>
      `;
      controls.hidden = true;
      return;
    }

    container.innerHTML = registrations.map((event, index) => {
      const title = escapeHtml(event.title);
      const description = escapeHtml(event.description || "");
      const registrationUrl = String(event.url || "");

      let safeUrl = "";
      try {
        const parsed = new URL(registrationUrl);
        if (
          parsed.protocol === "https:" &&
          (
            parsed.hostname === "iddpmi093.churchcenter.com" ||
            parsed.hostname === "registrations.planningcenteronline.com"
          )
        ) {
          safeUrl = parsed.href;
        }
      } catch (_) {}

      const image = String(event.image || "");
      const safeImage = /^https:\/\//i.test(image) ? image : "";

      return `
        <article class="registration-slide ${index === 0 ? "active" : ""}"
                 aria-hidden="${index !== 0}"
                 ${index !== 0 ? "inert" : ""}
                 ${safeImage ? `style="background-image:url('${encodeURI(safeImage).replace(/'/g, "%27")}')"` : ""}>
          <div class="registration-slide-content">
            <span class="registration-slide-label">
              EVENTOS DE LA CENTRAL
            </span>
            <h3>${title}</h3>
            ${description ? `<p>${description}</p>` : ""}
            ${safeUrl ? `
              <a class="btn yellow"
                 href="${escapeHtml(safeUrl)}"
                 target="_blank"
                 rel="noopener noreferrer">
                INSCRÍBETE AQUÍ
              </a>
            ` : ""}
          </div>
        </article>
      `;
    }).join("");

    dotsContainer.innerHTML = registrations.map((_, index) => `
      <button type="button"
              class="registration-dot"
              data-slide="${index}"
              aria-label="Ver evento ${index + 1}">
      </button>
    `).join("");

    controls.hidden = registrations.length < 2;
    showSlide(0);
    startRotation();
  }

  async function loadRegistrations() {
    try {
      const response = await fetch("/api/website-registrations", {
        cache: "no-store"
      });

      if (!response.ok) throw new Error("Planning Center API error");

      const data = await response.json();

      if (!Array.isArray(data.registrations)) {
        throw new Error("Invalid registration data");
      }

      registrations = data.registrations.slice(0, 3);
      renderSlides();
    } catch (error) {
      console.error("Registration slideshow:", error);
      stopRotation();
      container.innerHTML = `
        <p class="registration-empty">
          No pudimos cargar las inscripciones.
          Visita Church Center para ver los eventos disponibles.
        </p>
      `;
      controls.hidden = true;
    }
  }

  prevButton?.addEventListener("click", () => {
    showSlide(currentIndex - 1);
    startRotation();
  });

  nextButton?.addEventListener("click", () => {
    showSlide(currentIndex + 1);
    startRotation();
  });

  dotsContainer.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-slide]");
    if (!dot) return;

    showSlide(Number(dot.dataset.slide));
    startRotation();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopRotation();
    else startRotation();
  });

  await loadRegistrations();

  // Refresh registration availability every 5 minutes.
  setInterval(loadRegistrations, 5 * 60 * 1000);
})();

}
loadPlanningCenter();
