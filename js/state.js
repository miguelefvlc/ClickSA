import { selectEl, queryAll, getSelectedText } from './utils.js';
import { toggleDarkMode, setCustomSelectValue, addTag, actualitzarDesplegablesCurriculars } from './ui.js';
import { fetchCsvData } from './api.js';
import { CONSTANTES_GLOBALES, SELECTS_TO_RESET } from './constants.js';
import { setMesures, addDestinatari, addSequenceStep, addSession, addActivity, toggleEval, addMiniCriteriaTag } from './sequenceBuilder.js';
import { recalcularTotaLaCadena } from './curriculum.js';

export const AppState = {
    cacheDadesCurriculars: {},
    dadesDiversitat: { destinataris: [], n3_acces: [], n3_apr: [], n3_par: [], n4_rec: [], n4_acces: [], n4_apr: [], n4_par: [] },
    mapaCEs: {}, sabersColors: {}, itemsAmbEstrella: new Set(),
    isRestoring: false, destinatariCount: 0,
    lastValidArea: '', lastValidCicle: ''
};

export function getStateObject() {
    const state = { inputs: {}, selects: {}, tags: {}, destinataris: [], sequence: [], darkMode: document.body.classList.contains('dark-mode'), disabledBlocks: [] };
    
    ['input-sa-num', 'input-sa-title', 'input-repte', 'input-tasca', 'input-materials'].forEach(id => state.inputs[id] = selectEl(id)?.value || "");
    ['input-area', 'input-cicle', 'input-curs', 'input-trimestre'].forEach(id => {
        const text = getSelectedText(id);
        state.selects[id] = text !== '-' ? text : '';
    });
    
    const tagContainers = SELECTS_TO_RESET.map(id => id.replace('select-', 'tags-')).filter(id => selectEl(id));
    tagContainers.push('tags-od'); 
    tagContainers.forEach(id => state.tags[id] = Array.from(selectEl(id)?.querySelectorAll('.tag-text') || []).map(t => t.dataset.fulltext || t.innerText));
    
    state.temporalitzacio = Array.from(queryAll('.week-box')).map(box => box.classList.contains('active'));
    state.perfilEixida = Array.from(queryAll('.cc-cell.manual-active')).map(c => c.dataset.desc);
    state.mesuresActives = selectEl('btn-mesures-si')?.classList.contains('active');
    
    queryAll('.destinatari-item').forEach(dest => {
        const destData = { tags: {} };
        ['dest', 'n3-acc', 'n3-apr', 'n3-par', 'n4-rec', 'n4-acc', 'n4-apr', 'n4-par'].forEach(prefix => {
            const tagArea = dest.querySelector(`[id^="tags-${prefix}-"]`);
            if (tagArea) destData.tags[prefix] = Array.from(tagArea.querySelectorAll('.tag-text')).map(t => t.dataset.fulltext || t.innerText);
        });
        state.destinataris.push(destData);
    });
    
    queryAll('.sequence-step').forEach(step => {
        const stepData = { title: step.querySelector('.step-title-input').value, sessions: step.querySelectorAll('.session-item').length, activities: [] };
        step.querySelectorAll('.sequence-activity').forEach(act => {
            stepData.activities.push({
                text: act.querySelector('.activity-textarea').value,
                evalActive: act.querySelector('.btn-eval-a').classList.contains('active'),
                criteria: Array.from(act.querySelectorAll('.mini-criteria-tag')).map(t => t.title || t.querySelector('span').innerText)
            });
        });
        state.sequence.push(stepData);
    });

    state.disabledBlocks = Array.from(queryAll('.section-container.disabled-block')).map(c => c.querySelector('.toggle-section').dataset.target);

    return state;
}

let saveTimeout = null;

export function saveState() {
    if (AppState.isRestoring || !selectEl('input-cicle')) return;
    
    const ind = selectEl('inline-save-indicator');
    const icon = selectEl('save-icon');
    const text = selectEl('save-text');
    
    if (ind && icon && text) {
        ind.classList.add('visible', 'saving');
        icon.className = 'fa-solid fa-arrows-rotate fa-spin';
        text.innerText = 'Desant...';
    }
    
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(() => {
        localStorage.setItem('clickSA_state', JSON.stringify(getStateObject()));
        
        if (ind && icon && text) {
            ind.classList.remove('saving');
            icon.className = 'fa-solid fa-floppy-disk';
            text.innerText = 'Desat ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        saveTimeout = null;
    }, 300);
}

export async function restoreState() {
    const savedStr = localStorage.getItem('clickSA_state');
    if (!savedStr) return;
    
    try {
        AppState.isRestoring = true;
        const state = JSON.parse(savedStr);
        if (state.darkMode && !document.body.classList.contains('dark-mode')) toggleDarkMode();
        
        Object.keys(state.inputs).forEach(id => { if (selectEl(id)) selectEl(id).value = state.inputs[id]; });
        
        const [savedArea, savedCicle] = [state.selects['input-area'], state.selects['input-cicle']];
        if (savedArea) setCustomSelectValue('input-area', savedArea);
        if (savedCicle) setCustomSelectValue('input-cicle', savedCicle);
        
        if (savedArea && savedCicle) {
            if (!AppState.cacheDadesCurriculars[savedArea]) AppState.cacheDadesCurriculars[savedArea] = {};
            if (!AppState.cacheDadesCurriculars[savedArea][savedCicle]) {
                const url = CONSTANTES_GLOBALES.urlsData[savedArea]?.[savedCicle];
                if (url) {
                    selectEl('loading-msg').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connectant amb la base de dades.';
                    await fetchCsvData(savedArea, savedCicle, url);
                    selectEl('loading-msg').innerHTML = '';
                }
            }
            if (AppState.cacheDadesCurriculars[savedArea][savedCicle]) {
                AppState.lastValidArea = savedArea;
                AppState.lastValidCicle = savedCicle;
                actualitzarDesplegablesCurriculars(savedArea, savedCicle);
            }
        }
        
        if (state.selects['input-curs']) setCustomSelectValue('input-curs', state.selects['input-curs']);
        if (state.selects['input-trimestre']) setCustomSelectValue('input-trimestre', state.selects['input-trimestre']);
        
        Object.keys(state.tags).forEach(id => state.tags[id]?.forEach(val => addTag(val, id)));
        
        if (state.temporalitzacio?.length === 40) queryAll('.week-box').forEach((box, index) => box.classList.toggle('active', !!state.temporalitzacio[index]));

        state.perfilEixida?.forEach(desc => {
            const cell = document.querySelector(`.cc-cell[data-desc="${desc}"]`);
            if (cell) { cell.classList.add('manual-active'); cell.classList.add('active'); }
        });

        if (state.mesuresActives) {
            setMesures(true);
            selectEl('destinataris-list').innerHTML = ''; 
            state.destinataris.forEach(dest => {
                addDestinatari();
                const destId = `dest-${AppState.destinatariCount}`;
                Object.keys(dest.tags).forEach(prefix => dest.tags[prefix].forEach(val => addTag(val, `tags-${prefix}-${destId}`)));
            });
        }
        
        if (state.sequence?.length > 0) {
            selectEl('sequence-container').innerHTML = '';
            state.sequence.forEach(stepData => {
                addSequenceStep();
                const newStep = queryAll('.sequence-step')[queryAll('.sequence-step').length - 1];
                const stepId = newStep.id;
                
                newStep.querySelector('.step-title-input').value = stepData.title || '';
                selectEl('sessions-' + stepId).innerHTML = ''; 
                for(let i=0; i<stepData.sessions; i++) addSession(stepId);
                
                stepData.activities.forEach(actData => {
                    addActivity(stepId);
                    const acts = newStep.querySelectorAll('.sequence-activity');
                    const newAct = acts[acts.length - 1];
                    newAct.querySelector('.activity-textarea').value = actData.text || '';
                    
                    if (actData.evalActive) {
                        const evalBtn = newAct.querySelector('.btn-eval-a');
                        const actDOMId = newAct.querySelector('.btn-add-criteria').closest('[id^="criteria-container-"]').id;
                        toggleEval(evalBtn, actDOMId.replace('criteria-container-', ''));
                        actData.criteria.forEach(crit => addMiniCriteriaTag(crit, actDOMId, 'OD'));
                    }
                });
            });
        }

        if (state.disabledBlocks) {
            state.disabledBlocks.forEach(blockId => {
                const btn = document.querySelector(`.btn-toggle-block[data-block="${blockId}"]`);
                if (btn) {
                    const container = btn.closest('.section-container');
                    container.classList.add('disabled-block');
                    btn.querySelector('i').className = 'fa-solid fa-eye-slash';
                    document.getElementById(blockId).style.display = 'none';
                    document.getElementById('icon-' + blockId).style.transform = 'rotate(0deg)';
                }
            });
        }

        recalcularTotaLaCadena(); 
        
        const ind = selectEl('inline-save-indicator');
        if (ind) {
            ind.classList.add('visible');
            selectEl('save-icon').className = 'fa-solid fa-floppy-disk';
            selectEl('save-text').innerText = 'Recuperat';
        }
        
    } catch (e) {
        console.error("Error restoring state", e);
    } finally {
        AppState.isRestoring = false;
    }
}

export function clearState() {
    if(confirm("Estàs segur que vols esborrar totes les dades y començar una nova Situació d'Aprenentatge? Aquesta acció no es pot desfer.")) {
        localStorage.removeItem('clickSA_state');
        location.reload();
    }
}
