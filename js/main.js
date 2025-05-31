const anioSelect = document.getElementById("filtro-anio");
const depSelect = document.getElementById("filtro-departamento");
const provSelect = document.getElementById("filtro-provincia");
const distSelect = document.getElementById("filtro-distrito");

// Función para limpiar <select>
function limpiarSelect(select, disabled = false) {
  select.innerHTML = '<option value="">Seleccione</option>';
  select.disabled = disabled;
}

// Crear <option>
function crearOpcion(id, nombre) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = nombre;
  return option;
}

// Cargar datos de ubicación
Promise.all([
  fetch("./assets/departamentos.json").then(r => r.json()),
  fetch("./assets/provincias.json").then(r => r.json()),
  fetch("./assets/distritos.json").then(r => r.json())
]).then(([departamentos, provincias, distritos]) => {
  
  // Llenar departamentos
  limpiarSelect(depSelect, false);
  departamentos.forEach(dep => {
    depSelect.appendChild(crearOpcion(dep.id, dep.name));
  });

  // Evento cascada: Departamento → Provincia
  depSelect.addEventListener("change", () => {
    const depId = depSelect.value;
    limpiarSelect(provSelect, !depId);
    limpiarSelect(distSelect, true);

    if (depId) {
      provincias
        .filter(p => p.department_id === depId)
        .forEach(p => {
          provSelect.appendChild(crearOpcion(p.id, p.name));
        });
    }
  });

  // Evento cascada: Provincia → Distrito
  provSelect.addEventListener("change", () => {
    const provId = provSelect.value;
    limpiarSelect(distSelect, !provId);

    if (provId) {
      distritos
        .filter(d => d.province_id === provId)
        .forEach(d => {
          distSelect.appendChild(crearOpcion(d.id, d.name));
        });
    }
  });

});



require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/geometry/Point",
    "esri/widgets/BasemapToggle",
    "esri/layers/MapImageLayer",
    "esri/layers/FeatureLayer",
    "esri/rest/support/Query",
    "esri/widgets/Expand",
    "esri/widgets/LayerList",
    "esri/core/reactiveUtils"
  ], function (Map, MapView, Graphic, GraphicsLayer, Point, BasemapToggle, MapImageLayer, FeatureLayer, Query, Expand, LayerList, reactiveUtils) {
    const map = new Map({
      basemap: "streets-navigation-vector"
    });
  
    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-77.03, -12.04],
      zoom: 12
    });

    view.popup.defaultPopupTemplateEnabled = true;

    let basemapToggle = new BasemapToggle({
      view: view,  // The view that provides access to the map's "streets-vector" basemap
      nextBasemap: "hybrid"  // Allows for toggling to the "hybrid" basemap
    });
  

    const featureLayer = new GraphicsLayer();
    featureLayer.title = "PROYECTOS BESCO";
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
                const { Gerente, NroGerente, Direccion, Latitud, Longitud } = feature.graphic.attributes;
                return `
                  <b>Gerente:</b> ${Gerente}<br>
                  <b>Telf:</b> ${NroGerente}<br>  
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
        item.innerHTML = `
        <strong>${p.Proyecto}</strong><br>
        <em>${p.Gerente}</em><br>
        <small>Telf: ${p.NroGerente}</small>
      `;
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
              <b>Gerente:</b> ${p.Gerente}<br>
              <b>Telf:</b> ${p.NroGerente}<br> 
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
        <h3 class="persona-header" style="cursor:pointer; color:#007bff;">
          ${persona.NOMBRES} ${persona.APELLIDO_PATERNO} ${persona.APELLIDO_MATERNO}
        </h3>
        <div class="persona-detalle" style="display: none; margin-left: 15px;">
          <p><strong>Sexo:</strong> ${persona.SEXO}</p>
          <p><strong>Documento:</strong> ${persona.TIPO_DOCUMENTO} ${persona.NRO_DOCUMENTO}</p>
          <p><strong>Condición:</strong> ${persona.CONDICION}</p>
          <p><strong>Sueldo:</strong> S/. ${persona.SUELDO}</p>
          <p><strong>Ingreso:</strong> ${persona.FEC_INGRESO}</p>
          <p><strong>Cese:</strong> ${persona.FEC_CESC || "—"}</p>
          <p><strong>Cliente:</strong> ${persona.CLIENTE_EXT || "—"}</p>
        </div>
      `;

      // Evento para el toggle del contenido
      const header = card.querySelector(".persona-header");
      const detalle = card.querySelector(".persona-detalle");

      header.addEventListener("click", () => {
        const visible = detalle.style.display === "block";
        detalle.style.display = visible ? "none" : "block";
      });
  
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


    const layer = new FeatureLayer({
      url: "https://seguridadciudadana.mininter.gob.pe/arcgis/rest/services/servicios_ogc/denuncias/MapServer/0"
    });
  
    // Acción al presionar el botón
    document.getElementById("btn-filtrar").addEventListener("click", () => {
      const anio = anioSelect.value;
      const distrito = distSelect.value;
  
      const whereParts = [];
      if (anio) whereParts.push(`año_hecho = ${anio}`);
      if (distrito) whereParts.push(`id_dist_hecho = '${distrito}'`); // Ajusta si el campo se llama diferente
  
      const whereClause = whereParts.length > 0 ? whereParts.join(" AND ") : "1=1";
  
      layer.definitionExpression = whereClause;
      console.log("Filtro aplicado:", whereClause);
      map.add(layer);
    });

    document.getElementById("btn-filtrar").addEventListener("click", () => {
      const distritoId = distSelect.value;
      if (!distritoId) return;
    
      const query = layer.createQuery();
      query.where = `id_dist_hecho = '${distritoId}'`;
      query.returnGeometry = true;
      query.outSpatialReference = view.spatialReference;
    
      layer.queryFeatures(query).then((results) => {
        if (results.features.length) {
          const geometry = results.features[0].geometry;
          view.goTo({ target: geometry, zoom: 13 });
        } else {
          console.warn("No se encontró geometría para ese distrito.");
        }
      });
    });
    

    //map.add(layer); 
    
    const comisarias = new FeatureLayer({
      url: "https://seguridadciudadana.mininter.gob.pe/arcgis/rest/services/servicios_ogc/policia_nacional_peru/MapServer/5",
      outFields: ["*"],
      visible: false,
      popupTemplate: {
        title: "{comisaria}", // ajusta según campos disponibles
        content: (feature) => {
          const geom = feature.graphic.geometry;
          const lon = geom.longitude || geom.x;
          const lat = geom.latitude || geom.y;
    
          const link = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    
          return `
            <p><strong>Comisaría:</strong> ${feature.graphic.attributes.comisaria}</p>
            <p><strong>Departamento:</strong> ${feature.graphic.attributes.departamento}</p>
            <p><strong>Provincia:</strong> ${feature.graphic.attributes.provincia}</p>
            <p><strong>Distrito:</strong> ${feature.graphic.attributes.distrito}</p>
            <p><a href="${link}" target="_blank">📍 Ver en Google Maps</a></p>
          `;
        }
      }
    });

    map.add(comisarias);

    const filtroExpand = new Expand({
      view: view,
      content: document.getElementById("filtro-panel"),
      expandIconClass: "esri-icon-filter",
      group: "top-left",
      expanded: false
    });
  
    view.ui.add(filtroExpand, "top-left");
  
    // Mostrar el panel solo cuando se expande
    filtroExpand.watch("expanded", (val) => {
      document.getElementById("filtro-panel").hidden = !val;
    });

    const layerList = new LayerList({
      view: view, // tu MapView
      selectionEnabled: true,
      listItemCreatedFunction: function (event) {
        // Personaliza si deseas, por ahora lo dejamos básico
      }
    });
  
    // Expand para mostrar el LayerList
    const layerListExpand = new Expand({
      view: view,
      content: layerList,
      expandIconClass: "esri-icon-layer-list",
      group: "top-left",
      expanded: false,
      mode: "floating"
    });
  
    // Agregarlo a la vista
    view.ui.add(layerListExpand, "top-left");

    // Referencia al elemento
const mobileControls = document.getElementById("mobile-controls");

// Escuchar cambios en el estado del expand
filtroExpand.watch("expanded", function (isExpanded) {
  if (mobileControls) {
    mobileControls.style.zIndex = isExpanded ? "0" : "15";
  }
});

function actualizarMobileControls() {
  const expanded = filtroExpand?.expanded;
  const popupVisible = view.popup.visible;

  if (!mobileControls) return;

  if (popupVisible) {
    mobileControls.style.display = "none";
  } else if (expanded) {
    mobileControls.style.display = "flex";
    mobileControls.style.zIndex = "0";
  } else {
    mobileControls.style.display = "flex";
    mobileControls.style.zIndex = "15";
  }
}

// Reactivos
reactiveUtils.watch(() => filtroExpand?.expanded, actualizarMobileControls);
reactiveUtils.watch(() => view.popup.visible, actualizarMobileControls);


  });
  