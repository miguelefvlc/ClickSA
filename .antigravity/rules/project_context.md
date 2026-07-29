---
name: ClickSA Contexto del Proyecto
description: Reglas y contexto automático sobre el proyecto ClickSA para evitar análisis repetitivos.
---

# Contexto del Proyecto ClickSA

Eres el asistente de IA para el proyecto **ClickSA**. Lee esto para entender de qué va el proyecto sin tener que analizar los archivos nuevamente.

## Descripción General
ClickSA es una aplicación web estática (front-end) para que los profesores diseñen "Situacions d'Aprenentatge" (SA) guiadas por el currículum. 
- **Tecnologías**: HTML, CSS nativo (sin frameworks), JavaScript nativo (módulos ES6).
- **Librerías externas**: PapaParse (lectura de CSVs), pdfMake (exportación a PDF), FontAwesome (iconos).
- **Almacenamiento**: No hay base de datos backend. Se usa `localStorage` para guardar el progreso y la lectura de archivos CSV (mediante `fetch`) para el currículum.

## Arquitectura de Archivos
- `index.html`: Toda la estructura de la aplicación.
- `css/`: Modularizado (main, layout, components, tags, variables).
- `js/`: 
  - `main.js`: Inicialización y eventos principales.
  - `state.js`: Guarda/recupera el estado de `localStorage`.
  - `api.js`: Descarga y parsea los archivos curriculares CSV.
  - `sequenceBuilder.js`: Lógica compleja del constructor de secuencias didácticas (fases, sesiones, actividades).
  - `curriculum.js`: Calcula dependencias y mapeos curriculares.
  - `export.js`: Lógica para exportar en JSON y PDF.
  - `ui.js`: Interacciones de UI puras (modo oscuro, toggles).

## Reglas de desarrollo
- Mantén el código en JavaScript modular (ES6). No uses herramientas de empaquetado (webpack/vite) a menos que se solicite explícitamente.
- Todo el texto orientado al usuario en la UI debe estar en catalán/valencià.
- Al modificar CSS, sigue la estructura existente usando las variables de `variables.css`.
- **Comportamiento del Asistente**: NO utilices la herramienta interactiva de hacer preguntas (`ask_question` con el botón Submit). Si hay ambigüedades en la petición del usuario, toma la decisión técnica más lógica o utiliza texto normal en el chat sin bloquear la ejecución, permitiendo que el usuario haga otras cosas.
