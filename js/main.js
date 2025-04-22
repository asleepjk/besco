require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/geometry/Point",
    "esri/widgets/BasemapToggle"
  ], function (Map, MapView, Graphic, GraphicsLayer, Point, BasemapToggle) {
    const map = new Map({
      basemap: "streets-navigation-vector"
    });
  
    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-77.03, -12.04],
      zoom: 12
    });

    let basemapToggle = new BasemapToggle({
      view: view,  // The view that provides access to the map's "streets-vector" basemap
      nextBasemap: "hybrid"  // Allows for toggling to the "hybrid" basemap
    });
  

    const featureLayer = new GraphicsLayer();
    map.add(featureLayer);
    view.ui.add(basemapToggle, "bottom-right");
  
    let proyectosData = [];
    let personalData = [];
  
    function cargarDatos() {
      Promise.all([
        fetch("assets/proyectos.json").then((res) => res.json()),
        fetch("assets/personal.json").then((res) => res.json())
      ]).then(([proyectos, personal]) => {
        proyectosData = proyectos;
        personalData = personal;
        agregarGraficos(proyectos);
        crearListaProyectos(proyectos);
      });
    }
  
    function agregarGraficos(proyectos) {
      featureLayer.removeAll();
  
      proyectos.forEach((p) => {
        if (p.Latitud && p.Longitud) {
          const punto = new Point({
            latitude: p.Latitud,
            longitude: p.Longitud
          });
  
          const puntoGrafico = new Graphic({
            geometry: punto,
            attributes: p,
            symbol: {
              type: "simple-marker",
              color: "#007ac2",
              size: 10,
              outline: {
                color: "white",
                width: 1
              }
            },
            popupTemplate: {
              title: "{Proyecto}",
              content: (feature) => {
                const { Direccion, Latitud, Longitud } = feature.graphic.attributes;
                return `
                  <b>Dirección:</b> ${Direccion}<br>
                  <a target="_blank" href="https://www.google.com/maps?q=&layer=c&cbll=${Latitud},${Longitud}&cbp=11,0,0,0,0">
                    Ver en Street View
                  </a>
                `;
              }
            }
          });
  
          featureLayer.add(puntoGrafico);
        }
      });
    }
  
    function crearListaProyectos(proyectos) {
      const lista = document.getElementById("proyecto-listado");
      lista.innerHTML = "";
  
      proyectos.forEach((p, index) => {
        const item = document.createElement("li");
        item.textContent = p.Proyecto;
        item.dataset.index = index;
  
        item.addEventListener("click", () => {
          const point = new Point({
            latitude: p.Latitud,
            longitude: p.Longitud
          });
  
          view.goTo({ target: point, zoom: 17 });
          mostrarPersonal(p.SEDE_COD);
          view.openPopup({
            location: point,
            title: p.Proyecto,
            content: `
              <b>Dirección:</b> ${p.Direccion}<br>
              <a target="_blank" href="https://www.google.com/maps?q=&layer=c&cbll=${p.Latitud},${p.Longitud}&cbp=11,0,0,0,0">
                Ver en Street View
              </a>
            `
          });
        });
  
        lista.appendChild(item);
      });
    }
  
    function mostrarPersonal(SEDE_COD) {
      const contenedor = document.getElementById("personal-panel");
      contenedor.innerHTML = "";
  
      const personalFiltrado = personalData.filter((p) => p.SEDE_COD === SEDE_COD);
  
      if (personalFiltrado.length === 0) {
        contenedor.innerHTML = "<p>No se encontró personal para este proyecto.</p>";
        return;
      }
  
      personalFiltrado.forEach((persona) => {
        const card = document.createElement("div");
        card.classList.add("personal-card");
  
        card.innerHTML = `
          <h3>${persona.NOMBRES} ${persona.APELLIDO_PATERNO} ${persona.APELLIDO_MATERNO}</h3>
          <p><strong>Sexo:</strong> ${persona.SEXO}</p>
          <p><strong>Documento:</strong> ${persona.TIPO_DOCUMENTO} ${persona.NRO_DOCUMENTO}</p>
          <p><strong>Condición:</strong> ${persona.CONDICION}</p>
          <p><strong>Sueldo:</strong>S/. ${persona.SUELDO}</p>
          <p><strong>Ingreso:</strong> ${persona.FEC_INGRESO}</p>
          <p><strong>Cese:</strong> ${persona.FEC_CESC || "—"}</p>
          <p><strong>Cliente:</strong> ${persona.CLIENTE_EXT || "—"}</p>
        `;
  
        contenedor.appendChild(card);
      });
    }
  
    view.when(() => {
      cargarDatos();
  
      view.on("click", (event) => {
        view.hitTest(event).then((response) => {
          const resultado = response.results.find((r) => r.graphic.layer === featureLayer);
          if (resultado) {
            const atributos = resultado.graphic.attributes;
            mostrarPersonal(atributos.SEDE_COD);
          }
        });
      });
    });

    window.togglePanel = function (panel) {
      const body = document.body;
      const izq = document.getElementById("panel-izquierdo");
      const der = document.getElementById("panel-derecho");
    
      const btnProyectos = document.querySelector("button[onclick*='proyectos']");
      const btnPersonal = document.querySelector("button[onclick*='personal']");
    
      // Si ya está activo el panel, desactivamos todo
      const isActive = panel === "proyectos" ? izq.classList.contains("active") : der.classList.contains("active");
    
      if (isActive) {
        izq.classList.remove("active");
        der.classList.remove("active");
        btnProyectos.classList.remove("active");
        btnPersonal.classList.remove("active");
        body.classList.remove("panel-visible");
      } else {
        if (panel === "proyectos") {
          izq.classList.add("active");
          der.classList.remove("active");
          btnProyectos.classList.add("active");
          btnPersonal.classList.remove("active");
        } else {
          der.classList.add("active");
          izq.classList.remove("active");
          btnPersonal.classList.add("active");
          btnProyectos.classList.remove("active");
        }
        body.classList.add("panel-visible");
      }
    };
    

  });
  