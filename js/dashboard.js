// =========================================================================
// ClickSA — Mòdul del Dashboard d'Anàlisi Global
// =========================================================================

import { getClient, getCurrentUser } from './cloud.js';

// ==========================================
// ESTAT I CONFIGURACIÓ DE COLORS
// ==========================================
let loadedSAs = [];
let chartInstances = {};
let globalTooltips = {}; 

const ceColorsArray = ['#9D85C0', '#78B5B9', '#789AD1', '#89BA77', '#CCAA54', '#D27979'];
const generalBgColors = ['#6B9596', '#9D85C0', '#78B5B9', '#CCAA54', '#D27979', '#789AD1', '#89BA77'];

// ==========================================
// INICIALITZACIÓ I ESDEVENIMENTS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const darkIcon = document.getElementById('dark-icon');
    if (darkIcon) {
        darkIcon.className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    
    let savedSAs = null;
    try { savedSAs = sessionStorage.getItem('dashboard_SAs'); } catch(e) {}
    
    if (savedSAs) {
        try { 
            const parsed = JSON.parse(savedSAs); 
            if (Array.isArray(parsed)) {
                loadedSAs = parsed.filter(s => s && typeof s === 'object');
            }
        } catch(e) {}
    }
    if (!Array.isArray(loadedSAs)) loadedSAs = [];

    // Comprovar si venim d'editar un arxiu
    let editingFilename = null;
    try { editingFilename = sessionStorage.getItem('editing_filename'); } catch(e) {}
    
    if (editingFilename) {
        let updatedStateRaw = null;
        try { updatedStateRaw = localStorage.getItem('clickSA_state'); } catch(e) {}
        
        if (updatedStateRaw) {
            try {
                const updatedState = JSON.parse(updatedStateRaw);
                if (updatedState && typeof updatedState === 'object') {
                    const idx = loadedSAs.findIndex(s => s && s.filename === editingFilename);
                    if (idx >= 0) {
                        loadedSAs[idx] = updatedState;
                    }
                }
            } catch(e) { console.error("Error aplicant actualització del dashboard", e); }
        }
        try {
            sessionStorage.removeItem('editing_filename');
            sessionStorage.setItem('dashboard_SAs', JSON.stringify(loadedSAs));
        } catch(e) {}
    }

    const btnDarkMode = document.getElementById('btn-dark-mode');
    if (btnDarkMode) {
        btnDarkMode.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            const ico = document.getElementById('dark-icon');
            if (ico) ico.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            try { localStorage.setItem('global_dark_mode', isDark ? 'true' : 'false'); } catch(e) {}
            if (loadedSAs.length > 0) updateDashboard();
        });
    }
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'global_dark_mode') {
            const shouldBeDark = e.newValue === 'true';
            if (shouldBeDark !== document.body.classList.contains('dark-mode')) {
                if (shouldBeDark) document.body.classList.add('dark-mode');
                else document.body.classList.remove('dark-mode');
                const ico = document.getElementById('dark-icon');
                if (ico) ico.className = shouldBeDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
                if (loadedSAs.length > 0) updateDashboard();
            }
        }
    });

    const uploadTrigger = document.getElementById('upload-trigger');
    const fileUpload = document.getElementById('file-upload');
    if (uploadTrigger && fileUpload) {
        uploadTrigger.addEventListener('click', () => fileUpload.click());
        fileUpload.addEventListener('change', handleFileSelect);
    }

    const btnCloudDash = document.getElementById('btn-cloud-import-dashboard');
    if (btnCloudDash) {
        btnCloudDash.addEventListener('click', handleCloudImportDashboard);
    }

    // Botonera de neteja i PDF
    const btnClear = document.getElementById('btn-clear');
    if (btnClear) btnClear.addEventListener('click', clearAllData);
    const btnDownload = document.getElementById('btn-download');
    if (btnDownload) btnDownload.addEventListener('click', generatePDF);

    const fileList = document.getElementById('file-list');
    if (fileList) makeFilesSortable(fileList);
    
    const zoomModal = document.getElementById('zoom-modal');
    if (zoomModal) {
        zoomModal.addEventListener('click', (e) => {
            if (e.target === zoomModal) closeZoomModal();
        });
    }

    if (loadedSAs.length > 0) {
        renderFileList();
        updateDashboard();
    }
});

// ==========================================
// BOTONERA: NETEJAR I EXPORTAR PDF
// ==========================================
function clearAllData() {
    if (confirm("Estàs segur que vols esborrar totes les dades i gràfiques analitzades?")) {
        loadedSAs = [];
        saveSAsToStorage();
        renderFileList();
        updateDashboard();
    }
}

async function generatePDF() {
    if (loadedSAs.length === 0) return;
    const btn = document.getElementById('btn-download');
    if (!btn) return;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const isDark = document.body.classList.contains('dark-mode');
    const prevAnim = Chart.defaults.animation;
    
    // Preparem per al PDF (Mode clar, sense animacions per fer fotos ràpides i estables)
    if (isDark) document.body.classList.remove('dark-mode');
    Chart.defaults.animation = false;
    
    updateDashboard(); 
    
    // Esperem un instant per assegurar que el canvas s'ha redibuixat
    await new Promise(r => setTimeout(r, 200));

    // Helper per crear les "targetes" de les seccions del PDF
    const buildSectionHeader = (title) => {
        return {
            table: { widths: ['*'], body: [ [ { text: title, style: 'sectionTitle', fillColor: '#6B9596', border: [false, false, false, false] } ] ] },
            margin: [0, 15, 0, 15]
        };
    };

    // Helper per encapsular les imatges de les gràfiques dins de taules amb vores
    const getChartBlock = (title, id) => {
        const imgData = chartInstances[id] ? chartInstances[id].toBase64Image() : null;
        if (!imgData) {
            return {
                table: { 
                    widths: ['*'], 
                    body: [ 
                        [ {text: title.toUpperCase(), style: 'cardTitle', fillColor: '#F2F5F5', borderColor: ['#D5E0E0', '#D5E0E0', '#D5E0E0', '#D5E0E0']} ], 
                        [ {text: 'Sense dades', alignment: 'center', margin: [0, 30, 0, 30], color: '#788F90', borderColor: ['#D5E0E0', '#D5E0E0', '#D5E0E0', '#D5E0E0']} ] 
                    ] 
                },
                layout: { defaultBorder: false, hLineWidth: ()=>1, vLineWidth: ()=>1, hLineColor: ()=>'#D5E0E0', vLineColor: ()=>'#D5E0E0' },
                margin: [0, 0, 0, 0]
            };
        }
        return {
            table: {
                widths: ['*'],
                body: [
                    [ {text: title.toUpperCase(), style: 'cardTitle', fillColor: '#F2F5F5', borderColor: ['#D5E0E0', '#D5E0E0', '#D5E0E0', '#D5E0E0']} ],
                    [ {image: imgData, width: 345, alignment: 'center', margin: [0, 10, 0, 10], borderColor: ['#D5E0E0', '#D5E0E0', '#D5E0E0', '#D5E0E0']} ]
                ]
            },
            layout: { defaultBorder: false, hLineWidth: ()=>1, vLineWidth: ()=>1, hLineColor: ()=>'#D5E0E0', vLineColor: ()=>'#D5E0E0' },
            margin: [0, 0, 0, 0]
        };
    };

    // Helper per posar dos gràfiques en una fila "unbreakable" (Que no es trenquen entre pàgines)
    const buildChartRow = (block1, block2) => {
        return {
            unbreakable: true,
            columns: [ block1, block2 ],
            columnGap: 15,
            margin: [0, 0, 0, 15]
        };
    };

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 40],
        styles: {
            header: { fontSize: 22, bold: true, color: '#2B3A3B', alignment: 'center' },
            subheader: { fontSize: 10, bold: true, color: '#6B9596', alignment: 'center', margin: [0, 5, 0, 25] },
            sectionTitle: { fontSize: 11, bold: true, color: '#FFFFFF', margin: [10, 6, 10, 6] },
            cardTitle: { fontSize: 9, bold: true, color: '#2B3A3B', margin: [5, 6, 5, 6], alignment: 'center' },
            tableLabel: { fontSize: 8, bold: true, color: '#788F90', alignment: 'center', margin: [2, 4, 2, 4] },
            tableValue: { fontSize: 10, bold: true, color: '#2B3A3B', alignment: 'center', margin: [2, 6, 2, 6] }
        },
        content: [
            { text: "PANELL D'ANÀLISI GLOBAL", style: 'header' },
            { text: "RESUM DE LES SITUACIONS D'APRENENTATGE IMPORTADES", style: 'subheader' },
            
            // Taula resum global
            {
                table: {
                    widths: ['*', '*', '*', 'auto', 'auto'],
                    body: [
                        [ {text: 'ÀREA', style: 'tableLabel', fillColor: '#E6EDED'}, {text: 'CICLE', style: 'tableLabel', fillColor: '#E6EDED'}, {text: 'NIVELL', style: 'tableLabel', fillColor: '#E6EDED'}, {text: 'TOTAL S.A.', style: 'tableLabel', fillColor: '#E6EDED'}, {text: 'SESSIONS', style: 'tableLabel', fillColor: '#E6EDED'} ],
                        [
                            {text: document.getElementById('sum-area')?.innerText || '-', style: 'tableValue'},
                            {text: document.getElementById('sum-cicle')?.innerText || '-', style: 'tableValue'},
                            {text: document.getElementById('sum-nivell')?.innerText || '-', style: 'tableValue'},
                            {text: document.getElementById('sum-sa')?.innerText || '0', style: 'tableValue', color: '#6B9596'},
                            {text: document.getElementById('sum-sessions')?.innerText || '0', style: 'tableValue', color: '#6B9596'}
                        ]
                    ]
                },
                layout: { hLineWidth: ()=>1, vLineWidth: ()=>1, hLineColor: ()=>'#D5E0E0', vLineColor: ()=>'#D5E0E0' },
                margin: [0, 0, 0, 20]
            },

            // Generació dels blocs utilitzant les funcions ajudades
            buildSectionHeader('1. IDENTIFICACIÓ I CONTEXT'),
            buildChartRow(
                getChartBlock('Objectius de Desenvolupament Sostenible (ODS)', 'chart-ods'),
                { text: '', width: '*' }
            ),

            buildSectionHeader('2. CONCRECIÓ CURRICULAR'),
            buildChartRow(getChartBlock('Objectius Generals d\'Etapa', 'chart-obj'), getChartBlock('Perfil d\'Eixida', 'chart-perfil')),
            buildChartRow(getChartBlock('Competències Específiques (CE)', 'chart-ce'), getChartBlock('Criteris d\'Avaluació (CA)', 'chart-ca')),
            buildChartRow(getChartBlock('Blocs de Continguts', 'chart-blocs'), { text: '', width: '*' }),

            buildSectionHeader('3. METODOLOGIA I ORGANITZACIÓ'),
            buildChartRow(getChartBlock('Metodologies', 'chart-metodologia'), getChartBlock('Agrupaments', 'chart-agrupaments')),

            buildSectionHeader('4. AVALUACIÓ'),
            buildChartRow(getChartBlock('Instruments d\'Avaluació', 'chart-instruments'), getChartBlock('Tipus d\'Avaluació', 'chart-tipus'))
        ]
    };

    pdfMake.createPdf(docDefinition).download("Analisi_Global_SA.pdf");

    // Restaurar l'estat original (Tema i animacions)
    if (isDark) document.body.classList.add('dark-mode');
    Chart.defaults.animation = prevAnim;
    updateDashboard();

    btn.innerHTML = '<i class="fa-solid fa-download"></i>';
}

// ==========================================
// GESTIÓ DEL MODAL DE ZOOM
// ==========================================
export function openZoomModal(chartId, title) {
    const zoomTitle = document.getElementById('zoom-title');
    if (zoomTitle) zoomTitle.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> ${title}`;
    const modal = document.getElementById('zoom-modal');
    const body = document.getElementById('zoom-body');
    
    const chart = chartInstances['chart-' + chartId];
    if (!chart || !body || !modal) return;

    const labels = chart.data.labels;
    const vals = chart.data.datasets[0].data;
    
    let items = labels.map((l, i) => ({ label: l, count: vals[i], tooltip: globalTooltips[l] }));
    items.sort((a, b) => b.count - a.count);

    let html = '';
    items.forEach(item => {
        let extraDesc = (item.tooltip && item.tooltip !== item.label) ? `<div class="zoom-item-desc">${item.tooltip}</div>` : '';
        html += `
            <div class="zoom-item">
                <div class="zoom-item-count">${item.count}</div>
                <div class="zoom-item-text">
                    <div class="zoom-item-title">${item.label}</div>
                    ${extraDesc}
                </div>
            </div>`;
    });

    body.innerHTML = html || '<p style="color:var(--text-muted); text-align:center;">No hi ha dades disponibles.</p>';
    modal.classList.add('show');
}

export function closeZoomModal() {
    const modal = document.getElementById('zoom-modal');
    if (modal) modal.classList.remove('show');
}

window.openZoomModal = openZoomModal;
window.closeZoomModal = closeZoomModal;

// ==========================================
// GESTIÓ DE L'EDICIÓ
// ==========================================
function openEditModal(filename) {
    const sa = loadedSAs.find(s => s.filename === filename);
    if (!sa) return;
    
    try {
        sa.inputs = sa.inputs || {};
        sa.selects = sa.selects || {};
        sa.tags = sa.tags || {};
        sa.destinataris = sa.destinataris || [];
        sa.sequence = sa.sequence || [];
        sa.temporalitzacio = sa.temporalitzacio || [];
        
        try {
            localStorage.setItem('clickSA_state', JSON.stringify(sa));
            sessionStorage.setItem('editing_filename', filename);
        } catch(e) {}
        window.location.href = 'index.html';
    } catch(e) {
        alert("No s'ha pogut obrir l'editor per restriccions de privacitat del navegador. Comprova si has bloquejat l'emmagatzematge local.");
        console.error(e);
    }
}

// ==========================================
// GESTIÓ DE FITXERS LOCALS
// ==========================================
function handleFileSelect(event) {
    const files = event.target.files;
    if (!files.length) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                if (jsonData) {
                    jsonData.filename = file.name;
                    jsonData.saNum = (jsonData.inputs && jsonData.inputs['input-sa-num']) ? jsonData.inputs['input-sa-num'] : '?';
                    
                    const existingIdx = loadedSAs.findIndex(s => s && s.filename === file.name);
                    if (existingIdx >= 0) loadedSAs[existingIdx] = jsonData;
                    else loadedSAs.push(jsonData);
                    
                    loadedSAs.sort((a, b) => {
                        let numA = parseInt(a && a.saNum, 10);
                        let numB = parseInt(b && b.saNum, 10);
                        if (isNaN(numA)) numA = 9999;
                        if (isNaN(numB)) numB = 9999;
                        return numA - numB;
                    });
                    
                    saveSAsToStorage();
                    renderFileList();
                    updateDashboard();
                }
            } catch (err) { console.error("Error llegint JSON", err); }
        };
        reader.readAsText(file);
    });
    event.target.value = '';
}

// ==========================================
// GESTIÓ DE SITUACIONS AL NÚVOL (SUPABASE)
// ==========================================
async function handleCloudImportDashboard() {
    const sb = getClient();
    if (!sb) {
        alert("No s'ha trobat la configuració de Supabase.");
        return;
    }

    const user = await getCurrentUser();
    if (!user) {
        alert("Has d'iniciar sessió primer per carregar les teues SA des del núvol. Pots iniciar sessió des del Dissenyador (index.html).");
        return;
    }

    const btn = document.getElementById('btn-cloud-import-dashboard');
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: #5B8FB9;"></i> <span style="color: #5B8FB9;">Carregant del núvol...</span>';

    try {
        const { data: rows, error } = await sb
            .from('situacions_aprenentatge')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        if (!rows || rows.length === 0) {
            alert("No tens cap Situació d'Aprenentatge guardada al teu compte de Supabase.");
            return;
        }

        let addedCount = 0;
        rows.forEach(row => {
            if (row.data) {
                const saItem = row.data;
                saItem.filename = row.id;
                saItem.saNum = row.sa_num || (saItem.inputs && saItem.inputs['input-sa-num']) || '?';

                const existingIdx = loadedSAs.findIndex(s => s && (s.filename === row.id || (s.inputs && s.inputs['input-sa-num'] === saItem.saNum && s.inputs['input-sa-title'] === saItem.inputs?.['input-sa-title'])));
                if (existingIdx >= 0) {
                    loadedSAs[existingIdx] = saItem;
                } else {
                    loadedSAs.push(saItem);
                    addedCount++;
                }
            }
        });

        loadedSAs.sort((a, b) => {
            let numA = parseInt(a && a.saNum, 10);
            let numB = parseInt(b && b.saNum, 10);
            if (isNaN(numA)) numA = 9999;
            if (isNaN(numB)) numB = 9999;
            return numA - numB;
        });

        saveSAsToStorage();
        renderFileList();
        updateDashboard();

        alert(`S'han sincronitzat ${rows.length} Situacions d'Aprenentatge des del núvol (${addedCount} noves).`);
    } catch (err) {
        console.error("Error carregant del núvol al dashboard", err);
        alert("Error carregant del núvol: " + err.message);
    } finally {
        btn.innerHTML = origHtml;
    }
}

function removeSA(filename) {
    loadedSAs = loadedSAs.filter(sa => sa && sa.filename !== filename);
    saveSAsToStorage();
    renderFileList();
    updateDashboard();
}

function renderFileList() {
    const container = document.getElementById('file-list');
    if (!container) return;
    container.innerHTML = '';
    loadedSAs.forEach(sa => {
        const el = document.createElement('div');
        el.className = 'file-square'; 
        el.dataset.filename = sa.filename;
        el.innerHTML = `
            <div class="file-square-del" title="Eliminar SA"><i class="fa-solid fa-xmark"></i></div>
            <i class="fa-solid fa-file-lines"></i>
            <div class="file-square-text">SA</div>
            <div class="file-square-num">${sa.saNum}</div>
        `;
        
        el.addEventListener('click', () => {
            openEditModal(sa.filename);
        });
        
        el.querySelector('.file-square-del').addEventListener('click', (e) => {
            e.stopPropagation();
            removeSA(sa.filename);
        });
        container.appendChild(el);
    });
}

// DRAG & DROP PER ORDENAR SA
function makeFilesSortable(container) {
    let drg = null;
    container.addEventListener('dragstart', e => { 
        const target = e.target.closest('.file-square');
        if (target) { drg = target; target.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; } 
    });
    container.addEventListener('dragend', e => { 
        const target = e.target.closest('.file-square');
        if (target) { target.classList.remove('dragging'); drg = null; syncArrayOrder(); } 
    });
    container.addEventListener('dragover', e => {
        e.preventDefault(); if (!drg) return;
        const after = [...container.querySelectorAll('.file-square:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect(), offset = e.clientX - box.left - box.width / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        if (drg.nextElementSibling !== after) {
            after == null ? container.appendChild(drg) : container.insertBefore(drg, after);
        }
    });
}

function syncArrayOrder() {
    const newOrder = [];
    document.querySelectorAll('.file-square').forEach(el => {
        const sa = loadedSAs.find(s => s.filename === el.dataset.filename);
        if (sa) newOrder.push(sa);
    });
    loadedSAs = newOrder;
    saveSAsToStorage();
    updateDashboard();
}

// ==========================================
// LÒGICA DE DADES I GRÀFIQUES 
// ==========================================
function sortDataDict(dict) {
    const sortedKeys = Object.keys(dict).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const newDict = {};
    sortedKeys.forEach(k => newDict[k] = dict[k]);
    return newDict;
}

function saveSAsToStorage() {
    try { sessionStorage.setItem('dashboard_SAs', JSON.stringify(loadedSAs)); } catch(e) {}
}

function updateDashboard() {
    const bottomActions = document.getElementById('bottom-actions');
    const dashboardContent = document.getElementById('dashboard-content');
    const emptyState = document.getElementById('empty-state');

    if (loadedSAs.length === 0) {
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (bottomActions) bottomActions.style.display = 'none';
        return;
    }
    if (dashboardContent) dashboardContent.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    if (bottomActions) bottomActions.style.display = 'flex'; 

    const isDark = document.body.classList.contains('dark-mode');
    Chart.defaults.color = isDark ? '#E8EEEE' : '#3A4B4C';
    Chart.defaults.font.family = "'Inter', sans-serif";
    const gridColor = isDark ? '#374849' : '#D5E0E0';

    let data = { ods: {}, obj: {}, perfil: {}, ce: {}, ca: {}, blocs: {}, met: {}, agr: {}, inst: {}, tipus: {} };
    globalTooltips = {};

    let setAreas = new Set();
    let setCicles = new Set();
    let setNivells = new Set();
    let countSessions = 0;

    const parseTags = (tagArray, regex, dict, limitStr = false) => {
        if (!tagArray) return;
        tagArray.forEach(text => {
            let match = regex ? text.match(regex) : null;
            let rawLabel = match ? match[0].trim() : text.split(' - ')[0].trim();
            let label = (limitStr && rawLabel.length > 25) ? rawLabel.substring(0, 25) + '...' : rawLabel;
            
            if (label.toUpperCase().startsWith('ODS')) label = label.toUpperCase();

            dict[label] = (dict[label] || 0) + 1;
            globalTooltips[label] = text; 
        });
    };

    loadedSAs.forEach(sa => {
        if (sa.selects && sa.selects['input-area'] && sa.selects['input-area'] !== '-') setAreas.add(sa.selects['input-area']);
        if (sa.selects && sa.selects['input-cicle'] && sa.selects['input-cicle'] !== '-') setCicles.add(sa.selects['input-cicle']);
        if (sa.selects && sa.selects['input-curs'] && sa.selects['input-curs'] !== '-') setNivells.add(sa.selects['input-curs']);
        
        if (sa.sequence && Array.isArray(sa.sequence)) {
            sa.sequence.forEach(step => countSessions += (step.sessions || 0));
        }

        if (sa.perfilEixida) {
            sa.perfilEixida.forEach(desc => {
                data.perfil[desc] = (data.perfil[desc] || 0) + 1;
                globalTooltips[desc] = `Descriptor Operatiu: ${desc}`;
            });
        }

        parseTags(sa.tags ? sa.tags['tags-ods'] : null, /ODS\s*\d+/i, data.ods);
        parseTags(sa.tags ? sa.tags['tags-obj-gen'] : null, /^[a-z]\)/i, data.obj);
        parseTags(sa.tags ? sa.tags['tags-comp-espec'] : null, /CE\s*\d+/i, data.ce);
        parseTags(sa.tags ? sa.tags['tags-criteris'] : null, /CA\s*\d+(?:\.\d+)?/i, data.ca);
        parseTags(sa.tags ? sa.tags['tags-blocs'] : null, /BL\s*\d+/i, data.blocs);
        
        parseTags(sa.tags ? sa.tags['tags-metodologia'] : null, null, data.met, true);
        parseTags(sa.tags ? sa.tags['tags-agrupaments'] : null, null, data.agr, true);
        parseTags(sa.tags ? sa.tags['tags-instruments'] : null, null, data.inst, true);
        parseTags(sa.tags ? sa.tags['tags-tipus-avaluacio'] : null, null, data.tipus, true);
    });

    const sumArea = document.getElementById('sum-area');
    if (sumArea) sumArea.innerText = setAreas.size > 0 ? Array.from(setAreas).join(', ') : '-';
    const sumCicle = document.getElementById('sum-cicle');
    if (sumCicle) sumCicle.innerText = setCicles.size > 0 ? Array.from(setCicles).join(', ') : '-';
    const sumNivell = document.getElementById('sum-nivell');
    if (sumNivell) sumNivell.innerText = setNivells.size > 0 ? Array.from(setNivells).join(', ') : '-';
    const sumSa = document.getElementById('sum-sa');
    if (sumSa) sumSa.innerText = loadedSAs.length;
    const sumSessions = document.getElementById('sum-sessions');
    if (sumSessions) sumSessions.innerText = countSessions;

    data.ods = sortDataDict(data.ods);
    data.obj = sortDataDict(data.obj);
    data.perfil = sortDataDict(data.perfil);
    data.ce = sortDataDict(data.ce);
    data.ca = sortDataDict(data.ca);
    data.blocs = sortDataDict(data.blocs);

    const buildChart = (id, type, dataDict, extraOpts = {}) => {
        if (chartInstances[id]) chartInstances[id].destroy();
        
        const labels = Object.keys(dataDict);
        const vals = Object.values(dataDict);
        let dataset = { data: vals, borderWidth: 1 };
        
        if (id === 'chart-ce' || id === 'chart-ca') {
            dataset.backgroundColor = labels.map(label => {
                let m = label.match(/(?:CE|CA)\s*(\d+)/i);
                if (m) {
                    let idx = (parseInt(m[1]) - 1) % ceColorsArray.length;
                    return type === 'polarArea' ? ceColorsArray[idx] + 'CC' : ceColorsArray[idx];
                }
                return '#9CA3AF';
            });
        } else {
            dataset.backgroundColor = labels.map((_, i) => generalBgColors[i % generalBgColors.length]);
        }

        if (type === 'doughnut' || type === 'polarArea') {
            dataset.borderColor = isDark ? '#263031' : '#FFFFFF';
            dataset.borderWidth = 2;
        } else if (type === 'bar') {
            dataset.borderRadius = 4;
        }

        const config = {
            type: type,
            data: { labels: labels, datasets: [dataset] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        display: (type === 'doughnut' || type === 'polarArea'), 
                        position: 'right',
                        labels: { boxWidth: 10, font: { size: 10 }, padding: 8 }
                    },
                    tooltip: {
                        callbacks: {
                            title: (ctx) => globalTooltips[ctx[0].label] || ctx[0].label,
                            label: (ctx) => ` Freqüència d'ús: ${ctx.raw}`
                        }
                    }
                }
            }
        };

        if (type === 'polarArea') {
            config.options.scales = { r: { ticks: { stepSize: 1, display: false }, grid: { color: gridColor } } };
        } else if (type === 'bar') {
            if (extraOpts.indexAxis === 'y') {
                config.options.scales = { 
                    x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: gridColor } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } }
                };
            } else {
                config.options.scales = { 
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: gridColor } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                };
            }
        }
        
        Object.assign(config.options, extraOpts);
        const canvas = document.getElementById(id);
        if (canvas) {
            chartInstances[id] = new Chart(canvas, config);
        }
    };

    buildChart('chart-ods', 'doughnut', data.ods);
    buildChart('chart-obj', 'doughnut', data.obj);
    buildChart('chart-perfil', 'bar', data.perfil); 
    buildChart('chart-ce', 'doughnut', data.ce); 
    buildChart('chart-ca', 'bar', data.ca);       
    buildChart('chart-blocs', 'doughnut', data.blocs);
    buildChart('chart-metodologia', 'doughnut', data.met);
    buildChart('chart-agrupaments', 'doughnut', data.agr);
    buildChart('chart-instruments', 'bar', data.inst, { indexAxis: 'y' });
    buildChart('chart-tipus', 'bar', data.tipus, { indexAxis: 'y' });
}
