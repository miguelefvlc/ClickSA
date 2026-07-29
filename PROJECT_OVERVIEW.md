# ClickSA - Resum del Projecte (Dissenyador de Situacions d'Aprenentatge)

Aquest document ha estat generat per proporcionar un context ràpid sobre el projecte **ClickSA** en futures converses.

## Descripció General
ClickSA és una aplicació web estàtica i interactiva dissenyada per ajudar els docents a crear, estructurar i descarregar **Situacions d'Aprenentatge (SA)** d'acord amb el currículum educatiu. Està completament desenvolupada amb tecnologies web front-end natives (Vanilla HTML, CSS, i JavaScript) sense necessitat d'un servidor backend (sense base de dades pròpia més enllà de fitxers CSV o l'emmagatzematge local).

L'idioma principal de la interfície és el **català/valencià**.

## Estructura Tècnica
- **HTML**: `index.html` conté tota l'estructura visual, dividida en diferents seccions (identificació, currículum, seqüència, etc.).
- **CSS**: Situat a la carpeta `css/` de forma modularitzada:
  - `variables.css` (Colors, mides, variables globals i temes clar/fosc).
  - `layout.css` (Disposició en grid, flexbox, marges i el contenidor principal).
  - `components.css` (Targetes, botons, formularis, modals).
  - `tags.css` (Estils de les etiquetes o "tags" usades per als sabers bàsics, criteris, etc.).
  - `main.css` (Punt d'entrada que importa els altres).
- **JavaScript (ES6 Modules)**: Situat a la carpeta `js/`:
  - `main.js`: L'arrel. Configura els *event listeners* i inicialitza l'aplicació.
  - `state.js`: Gestiona l'estat de l'aplicació. S'encarrega del desat automàtic a `localStorage` (clau `clickSA_state`) i de la càrrega/neteja de dades.
  - `api.js`: Llegeix i processa els arxius CSV externs (amb dades curriculars i mesures de diversitat) utilitzant *PapaParse*.
  - `ui.js`: Controla la interfície gràfica (Desplegables, Mode Fosc, inserció d'etiquetes).
  - `curriculum.js`: Calcula quins elements del currículum (Descriptors operatius, Criteris, etc.) es relacionen i pinta o filtra en conseqüència.
  - `sequenceBuilder.js`: Gestiona la secció de "Seqüència Didàctica" on s'afegeixen fases, sessions i activitats avaluables dinàmicament.
  - `export.js`: Implementa l'exportació a JSON, l'exportació a PDF (amb *pdfMake*) i la importació d'arxius JSON.
  - `constants.js`: URL dels CSV i selectores a netejar.
  - `utils.js`: Funcions auxiliars genèriques.

## Llibreries de tercers usades (Carregades via CDN)
- **PapaParse**: Per convertir els fitxers CSV amb els currículums oficials en dades que el codi pot entendre.
- **pdfMake**: Per generar en client l'arxiu PDF d'exportació amb el resultat de la Situació d'Aprenentatge.
- **FontAwesome**: Pels icones.
- **Google Fonts (Inter)**: Per a la tipografia.

## Funcionalitats i Lògica de Negoci
L'aplicació es divideix en 6 blocs principals o "pestanyes":
1. **Identificació i Context**: Permet escollir Àrea, Cicle, Nivell, establir la temporalització en un calendari anual, posar títol, ODS, repte i producte final.
2. **Concreció Curricular**: Permet escollir objectius, perfil d'eixida, competències específiques, criteris d'avaluació, blocs de continguts i sabers bàsics. Aquesta secció interactua amb `api.js` per carregar contingut i amb `curriculum.js` per fer mapatges o enllaços de sabers (colors depenent de l'element). Permet definir Indicadors d'Assoliment.
3. **Metodologia i Organització**: Agrupaments, espais, i models metodològics.
4. **Avaluació**: Instruments i tipus d'avaluació.
5. **Mesures per a l'atenció educativa**: Inclou el DUA (Disseny Universal per a l'Aprenentatge) en Representació, Acció i Motivació, a més de permetre afegir destinataris particulars (alumnes NESE).
6. **Seqüència Didàctica**: Un creador seqüencial on l'usuari pot afegir Fases, dins de les fases Sessions, i dins d'aquestes Activitats. Permet associar criteris d'avaluació (o indicadors d'assoliment) a activitats específiques.

Tota la interacció queda automàticament desada al `localStorage` de manera transparent al navegador.
Finalment, la SA es pot exportar en format **PDF** o com un **JSON** (per guardar una còpia de seguretat o moure-la d'ordinador).
