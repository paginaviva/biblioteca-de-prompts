/* ============================================================
   Biblioteca de Prompts — Página de presentación
   Aplicación sin dependencias: selector de idioma y traducciones
   ============================================================ */

(function () {
  "use strict";

  var idiomaActual = "es";
  var traducciones = {};
  var idiomaGuardado = null;

  try {
    idiomaGuardado = window.localStorage.getItem("idioma-bprompts");
  } catch (error) {
    idiomaGuardado = null;
  }

  var selector = document.getElementById("idioma");
  var idiomaInicial = idiomaGuardado || "es";

  function cargarTraducciones(idioma) {
    var ruta = "i18n/" + idioma + ".json";
    return fetch(ruta)
      .then(function (respuesta) {
        if (!respuesta.ok) {
          throw new Error("No se pudo cargar el idioma: " + idioma);
        }
        return respuesta.json();
      });
  }

  function obtenerValor(clave) {
    var partes = clave.split(".");
    var valor = traducciones;
    for (var i = 0; i < partes.length; i += 1) {
      if (valor === undefined || valor === null) {
        return null;
      }
      valor = valor[partes[i]];
    }
    return valor;
  }

  function aplicarTraducciones() {
    var elementos = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < elementos.length; i += 1) {
      var elemento = elementos[i];
      var clave = elemento.getAttribute("data-i18n");
      var texto = obtenerValor(clave);
      if (texto !== null && texto !== undefined) {
        if (elemento.tagName === "META") {
          elemento.setAttribute("content", texto);
        } else {
          elemento.textContent = texto;
        }
      }
    }

    var tarjetas = document.querySelectorAll(".tarjeta h3");
    var parrafos = document.querySelectorAll(".tarjeta p");
    var caracteristicas = (traducciones.features && traducciones.features.items) || [];

    for (var j = 0; j < tarjetas.length; j += 1) {
      if (j < caracteristicas.length) {
        tarjetas[j].textContent = caracteristicas[j].title;
        if (parrafos[j]) {
          parrafos[j].textContent = caracteristicas[j].text;
        }
      }
    }

    var requisitos = (traducciones.requirements && traducciones.requirements.items) || [];
    var listaRequisitos = document.querySelectorAll(".lista-requisitos li");
    for (var k = 0; k < listaRequisitos.length; k += 1) {
      if (k < requisitos.length) {
        listaRequisitos[k].textContent = requisitos[k];
      }
    }

    if (traducciones.meta && traducciones.meta.title) {
      document.title = traducciones.meta.title;
    }

    document.documentElement.lang = idiomaActual;
  }

  function aplicarIdioma(idioma) {
    idiomaActual = idioma;
    cargarTraducciones(idioma).then(function (datos) {
      traducciones = datos;
      aplicarTraducciones();
      selector.value = idioma;
      try {
        window.localStorage.setItem("idioma-bprompts", idioma);
      } catch (error) {
        // Sin almacenamiento local disponible; el idioma se aplica igualmente.
      }
    }).catch(function (error) {
      // Si el idioma solicitado no está disponible, se conserva el actual.
      console.error(error);
    });
  }

  selector.addEventListener("change", function () {
    aplicarIdioma(selector.value);
  });

  aplicarIdioma(idiomaInicial);
})();
