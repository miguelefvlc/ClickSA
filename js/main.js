import { selectEl, queryAll } from './utils.js';
import { fetchDiversitat } from './api.js';
import { inicialitzarDesplegablesIncials, toggleDarkMode, toggleBlock, toggleTransversals } from './ui.js';
import { saveState, restoreState, clearState } from './state.js';
import { setMesures, addDestinatari, makeSequenceSortable, addSequenceStep, addSession, addActivity, toggleEval, showCriteriaDropdown, updateStepNumbers, updateGlobalSessionNumbers, addObjectiveDidactic } from './sequenceBuilder.js';
import { generatePDF, generateJSON, importJSON } from './export.js';
import { recalcularTotaLaCadena, updateCellVisual } from './curriculum.js';

document.addEventListener('DOMContentLoaded', async () => {
    fetchDiversitat();
    inicialitzarDesplegablesIncials();
    setupTooltipListeners();
    makeSequenceSortable();
    await restoreState();

    const addSaveListener = (selector, eventType) => queryAll(selector).forEach(el => el.addEventListener(eventType, saveState));
    addSaveListener('input, textarea', 'input');
    
    // Configurar listeners básicos
    selectEl('btn-dark-mode')?.addEventListener('click', () => { toggleDarkMode(); saveState(); });
    selectEl('btn-toggle-t')?.addEventListener('click', toggleTransversals);
    queryAll('.toggle-section').forEach(btn => btn.addEventListener('click', e => { 
        if(e.target.closest('.btn-toggle-block')) return; 
        toggleBlock(btn.dataset.target); 
    }));

    queryAll('.btn-toggle-block').forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        const blockId = btn.dataset.block;
        const container = btn.closest('.section-container');
        const isDisabling = !container.classList.contains('disabled-block');
        
        container.classList.toggle('disabled-block');
        btn.querySelector('i').className = isDisabling ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        
        const blockContent = document.getElementById(blockId);
        const iconToggle = document.getElementById('icon-' + blockId);
        if (isDisabling) {
            blockContent.style.display = 'none';
            iconToggle.style.transform = 'rotate(0deg)';
        } else {
            blockContent.style.display = 'block';
            iconToggle.style.transform = 'rotate(180deg)';
        }
        saveState();
    }));

    selectEl('btn-mesures-si')?.addEventListener('click', () => setMesures(true));
    selectEl('btn-mesures-no')?.addEventListener('click', () => setMesures(false));
    selectEl('btn-add-destinatari')?.addEventListener('click', addDestinatari);
    
    selectEl('btn-add-step')?.addEventListener('click', addSequenceStep);
    
    selectEl('btn-add-od')?.addEventListener('click', addObjectiveDidactic);
    selectEl('od-criteria-container')?.addEventListener('click', e => {
        const btnAddCritOD = e.target.closest('.btn-add-crit-od');
        if (btnAddCritOD) {
            showCriteriaDropdown(btnAddCritOD, 'od-criteria-container', 'CA');
        }
    });
    
    // Event delegation
    selectEl('temporalitzacio-container')?.addEventListener('click', e => {
        if (e.target.classList.contains('week-box')) {
            e.target.classList.toggle('active');
            saveState();
        }
    });

    selectEl('sequence-container')?.addEventListener('click', e => {
        if (e.target.closest('.criteria-dropdown')) return; 

        const btnRemoveStep = e.target.closest('.btn-remove-step');
        const btnRemoveAct = e.target.closest('.btn-remove-act');
        const btnAddAct = e.target.closest('.btn-add-act');
        const btnAddSess = e.target.closest('.btn-add-sess');
        const btnEval = e.target.closest('.btn-eval');
        const btnAddCrit = e.target.closest('.btn-add-crit');

        if (btnRemoveStep) {
            btnRemoveStep.closest('.sequence-step').remove();
            updateStepNumbers();
            updateGlobalSessionNumbers();
            saveState();
        } else if (btnRemoveAct) {
            btnRemoveAct.closest('.sequence-activity').remove();
            saveState();
        } else if (btnAddAct) {
            addActivity(btnAddAct.closest('.sequence-step').id);
        } else if (btnAddSess) {
            addSession(btnAddSess.closest('.sequence-step').id);
        } else if (btnEval) {
            const actId = btnEval.closest('.sequence-activity').querySelector('[id^="criteria-container-"]').id.replace('criteria-container-', '');
            toggleEval(btnEval, actId);
        } else if (btnAddCrit) {
            const actDOMId = btnAddCrit.closest('[id^="criteria-container-"]').id;
            showCriteriaDropdown(btnAddCrit, actDOMId, 'OD');
        }
    });

    document.addEventListener('click', e => { 
        if (!e.target.closest('.custom-select-wrapper')) {
            queryAll('.custom-options').forEach(el => { 
                el.classList.remove('open'); 
                if(el.parentElement) el.parentElement.style.zIndex = '1'; 
            }); 
        }
    });

    // Export/Import
    selectEl('btn-export-pdf')?.addEventListener('click', generatePDF);
    selectEl('btn-export-json')?.addEventListener('click', generateJSON);
    selectEl('btn-clear')?.addEventListener('click', clearState);
    setupFileManager();
    
    // Modal controls
    selectEl('btn-close-export')?.addEventListener('click', () => selectEl('export-modal').classList.remove('show'));
    selectEl('btn-open-export')?.addEventListener('click', () => selectEl('export-modal').classList.add('show'));
});

function setupTooltipListeners() {
    const tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    document.body.appendChild(tooltip);

    const container = selectEl('perfil-eixida-container');
    if (!container) return;

    container.addEventListener('mouseover', e => {
        const cell = e.target.closest('.cc-cell');
        if (cell && cell.dataset.fulltext) {
            tooltip.innerHTML = `<strong>${cell.dataset.desc}</strong><br><span style="font-weight:normal; font-size:0.8rem; display:block; margin-top:4px;">${cell.dataset.fulltext}</span>`;
            tooltip.classList.add('show');
        }
    });

    container.addEventListener('mousemove', e => {
        if (tooltip.classList.contains('show')) {
            let x = e.pageX + 15, y = e.pageY + 15;
            if (x + 280 > window.innerWidth) x = e.pageX - 295;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        }
    });

    container.addEventListener('mouseout', e => { if (e.target.closest('.cc-cell')) tooltip.classList.remove('show'); });
    
    container.addEventListener('click', e => {
        const cell = e.target.closest('.cc-cell');
        if (cell) { 
            cell.classList.toggle('manual-active'); 
            updateCellVisual(cell); 
            recalcularTotaLaCadena(); 
            saveState();
        }
    });
}


function setupFileManager() {
    const uploadTrigger = document.getElementById('upload-trigger');
    const fileUpload = document.getElementById('file-upload');
    const fileList = document.getElementById('file-list');
    if (!uploadTrigger || !fileUpload || !fileList) return;

    uploadTrigger.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', handleFiles);

    renderSAs();

    function handleFiles(event) {
        const files = event.target.files;
        if (!files.length) return;
        
        let SAs = getSessionSAs();

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = evt => {
                try {
                    const content = JSON.parse(evt.target.result);
                    if (content) {
                        content.filename = file.name;
                        content.saNum = content.inputs?.['input-sa-num'] || '?';
                        const existingIdx = SAs.findIndex(s => s.filename === file.name);
                        if (existingIdx >= 0) SAs[existingIdx] = content;
                        else SAs.push(content);
                        
                        saveSessionSAs(SAs);
                        renderSAs();
                    }
                } catch(e) {}
            };
            reader.readAsText(file);
        });
        event.target.value = '';
    }

    function renderSAs() {
        const SAs = getSessionSAs();
        fileList.innerHTML = '';
        if(SAs.length === 0) return;
        
        SAs.forEach(sa => {
            const square = document.createElement('div');
            square.className = 'file-square';
            square.innerHTML = `
                <div class="file-square-del" title="Eliminar SA"><i class="fa-solid fa-xmark"></i></div>
                <i class="fa-solid fa-file-lines"></i>
                <div class="file-square-text">SA</div>
                <div class="file-square-num">${sa.saNum}</div>
            `;
            
            square.addEventListener('click', (e) => {
                e.stopPropagation();
                loadSAIntoEditor(sa);
            });
            
            square.querySelector('.file-square-del').addEventListener('click', (e) => {
                e.stopPropagation();
                const currentSAs = getSessionSAs();
                saveSessionSAs(currentSAs.filter(s => s.filename !== sa.filename));
                renderSAs();
            });
            
            fileList.appendChild(square);
        });
    }

    function getSessionSAs() {
        const str = sessionStorage.getItem('dashboard_SAs');
        return str ? JSON.parse(str) : [];
    }
    function saveSessionSAs(sas) {
        sessionStorage.setItem('dashboard_SAs', JSON.stringify(sas));
    }
    
    function loadSAIntoEditor(sa) {
        sa.inputs = sa.inputs || {};
        sa.selects = sa.selects || {};
        sa.tags = sa.tags || {};
        sa.destinataris = sa.destinataris || [];
        sa.sequence = sa.sequence || [];
        sa.temporalitzacio = sa.temporalitzacio || [];
        
        localStorage.setItem('clickSA_state', JSON.stringify(sa));
        sessionStorage.setItem('editing_filename', sa.filename);
        window.location.reload();
    }
}
