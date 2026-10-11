
/* =========================================
   LA CENTRAL - WEBSITE JAVASCRIPT
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* -----------------------------------------
     1. ROTATING VISION WORDS
     ----------------------------------------- */

  const words = [
    "ANUNCIA.",
    "ALCANZA.",
    "RESTAURA.",
    "DISCIPULA."
  ];

  const word = document.getElementById("word");

  if (word) {
    let wordIndex = 0;

    setInterval(() => {
      word.classList.add("word-out");

      setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        word.textContent = words[wordIndex];
        word.classList.remove("word-out");
      }, 280);

    }, 2200);
  }


  /* -----------------------------------------
     2. HERO BACKGROUND VIDEO
     ----------------------------------------- */

  const heroVideo = document.querySelector(".hero-video");

  if (heroVideo) {
    heroVideo.playbackRate = 0.72;

    heroVideo.addEventListener("loadedmetadata", () => {
      heroVideo.playbackRate = 0.72;
    });
  }


  /* -----------------------------------------
     3. FOOTER YEAR
     ----------------------------------------- */

  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }


  /* -----------------------------------------
     4. MOBILE NAVIGATION
     ----------------------------------------- */

  const menu = document.querySelector(".menu");
  const nav = document.querySelector(".nav nav");

  if (menu && nav) {

    menu.addEventListener("click", () => {
      const open = menu.classList.toggle("open");

      menu.setAttribute("aria-expanded", String(open));
      menu.textContent = open ? "✕" : "☰";
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
        menu.textContent = "☰";
      });
    });

  }


  /* -----------------------------------------
     5. SHARED HTML ESCAPING
     ----------------------------------------- */

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character])
    );
  }


  /* -----------------------------------------
     6. PLANNING CENTER CALENDAR
     Legacy support for pages using event-cards
     ----------------------------------------- */

  async function loadPlanningCenterCalendar() {

    const eventCards = document.getElementById("event-cards");
    const pcoStatus = document.getElementById("pco-status");

    if (!eventCards) return;

    function eventDate(iso) {
      if (!iso) return "PRÓXIMAMENTE";

      const date = new Date(iso);

      if (Number.isNaN(date.getTime())) {
        return "PRÓXIMAMENTE";
      }

      return new Intl.DateTimeFormat("es-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York"
      }).format(date).toUpperCase();
    }

    try {

      const response = await fetch("/api/events");

      if (!response.ok) {
        throw new Error("Planning Center Calendar unavailable");
      }

      const data = await response.json();

      if (pcoStatus) {
        pcoStatus.textContent = "● Planning Center conectado";
        pcoStatus.classList.add("connected");
      }

      if (!data.events?.length) {
        eventCards.innerHTML = `
          <article class="event-empty">
            <span>CHURCH CENTER</span>
            <h3>NO HAY EVENTOS PUBLICADOS TODAVÍA.</h3>
            <p>
              Cuando haya próximos eventos disponibles,
              aparecerán aquí automáticamente.
            </p>
            <a class="btn yellow"
               href="https://iddpmi093.churchcenter.com/home"
               target="_blank"
               rel="noopener">
              VER CHURCH CENTER
            </a>
          </article>
        `;
        return;
      }

      eventCards.innerHTML = data.events.map(event => {

        const image = String(event.image || "");
        const safeImage = /^https:\/\//i.test(image)
          ? image
          : "";

        const background = safeImage
          ? `style="background-image:url('${escapeHtml(safeImage)}')"`
          : "";

        const cardClass = safeImage
          ? "event-card has-image"
          : "event-card";

        return `
          <article class="${cardClass}" ${background}>
            <span class="event-date">
              ${escapeHtml(eventDate(event.startsAt))}
            </span>

            <h3>${escapeHtml(event.name)}</h3>

            ${event.location
              ? `<p class="event-meta">${escapeHtml(event.location)}</p>`
              : ""}

            ${event.description
              ? `<p>${escapeHtml(event.description)}</p>`
              : ""}

            <a class="text-link"
               href="${escapeHtml(event.url || "https://iddpmi093.churchcenter.com/home")}"
               target="_blank"
               rel="noopener">
              DETALLES →
            </a>
          </article>
        `;

      }).join("");

    } catch (error) {

      console.error("Planning Center Calendar:", error);

      if (pcoStatus) {
        pcoStatus.textContent =
          "Planning Center: conexión pendiente";
      }

      eventCards.innerHTML = `
        <article class="event-empty">
          <span>CHURCH CENTER</span>
          <h3>LOS EVENTOS SIGUEN DISPONIBLES.</h3>
          <p>
            Puedes consultar los próximos eventos
            directamente en Church Center.
          </p>
          <a class="btn yellow"
             href="https://iddpmi093.churchcenter.com/home"
             target="_blank"
             rel="noopener">
            ABRIR CHURCH CENTER
          </a>
        </article>
      `;

    }
  }


  /* =========================================
     7. PLANNING CENTER REGISTRATION SLIDESHOW
     ========================================= */

  function initializeRegistrationSlideshow() {

    const container =
      document.getElementById("registration-slides");

    const controls =
      document.getElementById("registration-controls");

    const dotsContainer =
      document.getElementById("registration-dots");

    const prevButton =
      document.getElementById("registration-prev");

    const nextButton =
      document.getElementById("registration-next");

    if (!container || !controls || !dotsContainer) {
      return;
    }

    let registrations = [];
    let currentIndex = 0;
    let rotationTimer = null;

    const rotationSpeed = 6000;
    const refreshSpeed = 5 * 60 * 1000;

    const churchCenterUrl =
      "https://iddpmi093.churchcenter.com/home";


    /* -----------------------------------------
       VALIDATE REGISTRATION LINKS
       ----------------------------------------- */

    function safeRegistrationUrl(value) {

      try {
        const parsed = new URL(String(value || ""));

        const allowedHosts = [
          "iddpmi093.churchcenter.com",
          "registrations.planningcenteronline.com"
        ];

        if (
          parsed.protocol === "https:" &&
          allowedHosts.includes(parsed.hostname)
        ) {
          return parsed.href;
        }

      } catch (error) {
        // Ignore invalid URLs.
      }

      return churchCenterUrl;
    }


    /* -----------------------------------------
       DISPLAY CURRENT SLIDE
       ----------------------------------------- */

    function showSlide(index) {

      const slides =
        container.querySelectorAll(".registration-slide");

      const dots =
        dotsContainer.querySelectorAll(".registration-dot");

      if (!slides.length) return;

      currentIndex =
        (index + slides.length) % slides.length;

      slides.forEach((slide, i) => {

        const active = i === currentIndex;

        slide.classList.toggle("active", active);
        slide.setAttribute(
          "aria-hidden",
          String(!active)
        );

        slide.inert = !active;
      });

      dots.forEach((dot, i) => {

        const active = i === currentIndex;

        dot.classList.toggle("active", active);

        dot.setAttribute(
          "aria-current",
          active ? "true" : "false"
        );

      });
    }


    /* -----------------------------------------
       AUTOMATIC ROTATION
       ----------------------------------------- */

    function stopRotation() {

      if (rotationTimer !== null) {
        clearInterval(rotationTimer);
        rotationTimer = null;
      }

    }

    function startRotation() {

      stopRotation();

      if (registrations.length < 2) return;
      if (document.hidden) return;

      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        return;
      }

      rotationTimer = setInterval(() => {
        showSlide(currentIndex + 1);
      }, rotationSpeed);

    }


    /* -----------------------------------------
       CREATE SLIDES
       ----------------------------------------- */

    function renderSlides() {

      stopRotation();

      if (!registrations.length) {

        container.innerHTML = `
          <p class="registration-empty">
            No hay inscripciones disponibles
            en este momento.
            ¡Vuelve pronto para conocer
            nuestros próximos eventos!
          </p>
        `;

        controls.hidden = true;
        dotsContainer.innerHTML = "";

        return;
      }

      container.innerHTML = registrations.map(
        (event, index) => {

          const title = escapeHtml(event.title);
          const description =
            escapeHtml(event.description || "");

          const url =
            safeRegistrationUrl(event.url);

          const image = String(event.image || "");

          const safeImage =
            /^https:\/\//i.test(image)
              ? image
              : "";

          const background = safeImage
            ? `style="background-image:url('${escapeHtml(
                encodeURI(safeImage).replace(/'/g, "%27")
              )}')"`
            : "";

          return `
            <article
              class="registration-slide ${
                index === 0 ? "active" : ""
              }"
              aria-hidden="${index !== 0}"
              ${index !== 0 ? "inert" : ""}
              ${background}
            >

              <div class="registration-slide-content">

                <span class="registration-slide-label">
                  EVENTOS DE LA CENTRAL
                </span>

                <h3>${title}</h3>

                ${description
                  ? `<p>${description}</p>`
                  : ""}

                <a
                  class="btn yellow"
                  href="${escapeHtml(url)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  INSCRÍBETE AQUÍ
                </a>

              </div>

            </article>
          `;

        }
      ).join("");


      /* Navigation dots */

      dotsContainer.innerHTML = registrations.map(
        (_, index) => `
          <button
            type="button"
            class="registration-dot"
            data-slide="${index}"
            aria-label="Ver evento ${index + 1}"
          ></button>
        `
      ).join("");


      controls.hidden = registrations.length < 2;

      showSlide(0);
      startRotation();

    }


    /* -----------------------------------------
       LOAD REGISTRATIONS FROM PLANNING CENTER
       ----------------------------------------- */

    async function loadRegistrations() {

      try {

        const response = await fetch(
          "/api/website-registrations",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            `Planning Center returned ${response.status}`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.registrations)) {
          throw new Error(
            "Invalid registration response"
          );
        }

        registrations =
          data.registrations.slice(0, 3);

        renderSlides();

      } catch (error) {

        console.error(
          "Registration slideshow:",
          error
        );

        // Keep previously loaded slides if a refresh fails.
        if (registrations.length) return;

        stopRotation();

        container.innerHTML = `
          <p class="registration-empty">
            No pudimos cargar las inscripciones.
            Visita Church Center para ver
            los eventos disponibles.
          </p>
        `;

        controls.hidden = true;

      }
    }


    /* -----------------------------------------
       PREVIOUS / NEXT BUTTONS
       ----------------------------------------- */

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        showSlide(currentIndex - 1);
        startRotation();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        showSlide(currentIndex + 1);
        startRotation();
      });
    }


    /* -----------------------------------------
       DOT NAVIGATION
       ----------------------------------------- */

    dotsContainer.addEventListener("click", event => {

      const dot =
        event.target.closest("[data-slide]");

      if (!dot) return;

      const index = Number(dot.dataset.slide);

      if (!Number.isInteger(index)) return;

      showSlide(index);
      startRotation();

    });


    /* -----------------------------------------
       PAUSE WHEN TAB IS HIDDEN
       ----------------------------------------- */

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          stopRotation();
        } else {
          startRotation();
        }
      }
    );


    /* -----------------------------------------
       START AND REFRESH
       ----------------------------------------- */

    loadRegistrations();

    setInterval(
      loadRegistrations,
      refreshSpeed
    );

  }


  /* =========================================
     8. INITIALIZE WEBSITE FEATURES
     ========================================= */

  loadPlanningCenterCalendar();

  initializeRegistrationSlideshow();

});
