import { selectEl, queryAll } from './utils.js';
import { AppState, saveState } from './state.js';
import { buildCustomSelect, addTag } from './ui.js';

export function setMesures(isYes) {
    const c = selectEl('mesures-addicionals-container'), btnNo = selectEl('btn-mesures-no'), btnSi = selectEl('btn-mesures-si');
    btnNo.classList.toggle('active', !isYes); btnSi.classList.toggle('active', isYes);
    c.style.display = isYes ? 'flex' : 'none'; c.style.flexDirection = isYes ? 'column' : '';
    if (isYes && selectEl('destinataris-list').children.length === 0) addDestinatari();
    saveState();
}

export function addDestinatari() {
    const id = 'dest-' + (++AppState.destinatariCount); 
    const div = document.createElement('div'); div.className = 'destinatari-item';
    
    div.innerHTML = `
        <div class="btn-remove-absolute btn-remove-dest" title="Eliminar Destinatari"><i class="fa-solid fa-xmark"></i></div>
        <div style="margin-bottom: 5px; width: 100%;"><span class="sub-label">Destinatari</span><select id="select-dest-${id}"></select><div class="selection-area" id="tags-dest-${id}" style="margin-top: 8px; min-height: 0;"></div></div>
        <div class="nivell-box minimized">
            <i class="fa-solid fa-plus minimize-icon" title="Minimitzar/Maximitzar"></i><span class="sub-label" style="color: var(--accent);">MESURES NIVELL III</span>
            <div class="mesures-grid">
                <div><span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom:6px; display:block;">Accés</span><select id="select-n3-acc-${id}"></select><div class="selection-area" id="tags-n3-acc-${id}"></div></div>
                <div><span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom:6px; display:block;">Aprenentatge</span><select id="select-n3-apr-${id}"></select><div class="selection-area" id="tags-n3-apr-${id}"></div></div>
                <div><span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom:6px; display:block;">Participació</span><select id="select-n3-par-${id}"></select><div class="selection-area" id="tags-n3-par-${id}"></div></div>
            </div>
        </div>
        <div class="nivell-box minimized">
            <i class="fa-solid fa-plus minimize-icon" title="Minimitzar/Maximitzar"></i><span class="sub-label" style="color: var(--accent);">MESURES NIVELL IV</span>
            <div class="mesures-grid-4">
                <div><span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom:6px; display:block;">Recursos Personals</span><select id="select-n4-rec-${id}"></select><div class="selection-area" id="tags-n4-rec-${id}"></div></div>
                <div><span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom:6px; display:block;">Accés</span><select id="select-n4-acc-${id}"></select><div class="selection-area" id="tags-n4-acc-${id}"></div></div>
                <div><span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom:6px; display:block;">Aprenentatge</span><select id="select-n4-apr-${id}"></select><div class="selection-area" id="tags-n4-apr-${id}"></div></div>
                <div><span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom:6px; display:block;">Participació</span><select id="select-n4-par-${id}"></select><div class="selection-area" id="tags-n4-par-${id}"></div></div>
            </div>
        </div>`;
    
    selectEl('destinataris-list').appendChild(div);
    div.querySelector('.btn-remove-dest').addEventListener('click', () => { div.remove(); saveState(); });
    div.querySelectorAll('.minimize-icon').forEach(icon => { 
        icon.addEventListener('click', () => {
            const box = icon.closest('.nivell-box'); box.classList.toggle('minimized');
            icon.classList.toggle('fa-plus', box.classList.contains('minimized')); icon.classList.toggle('fa-minus', !box.classList.contains('minimized'));
        }); 
    });

    const dd = AppState.dadesDiversitat;
    [['dest', dd.destinataris], ['n3-acc', dd.n3_acces], ['n3-apr', dd.n3_apr], ['n3-par', dd.n3_par], ['n4-rec', dd.n4_rec], ['n4-acc', dd.n4_acces], ['n4-apr', dd.n4_apr], ['n4-par', dd.n4_par]]
        .forEach(s => buildCustomSelect(`select-${s[0]}-${id}`, s[1], `tags-${s[0]}-${id}`));
    saveState();
}

export function addSequenceStep() {
    const id = 'step-' + Date.now();
    const div = document.createElement('div'); div.className = 'sequence-step'; div.id = id; div.draggable = true;
    
    div.innerHTML = `
        <div class="btn-remove-absolute btn-remove-step" title="Eliminar Fase"><i class="fa-solid fa-xmark"></i></div>
        <div class="sequence-step-grid">
            <div class="phase-main">
                <div class="step-header"><div class="step-number" title="Arrossega per moure"></div><input type="text" class="step-title-input" placeholder="Nom del pas o fase"></div>
                <div class="step-body"><div class="activities-container" id="activities-${id}"></div><button class="btn-add-activity btn-add-act" title="Afegir nova activitat"><i class="fa-solid fa-plus"></i> Afegir activitat</button></div>
            </div>
            <div class="phase-sessions"><div class="session-title">Sessió</div><div class="sessions-list" id="sessions-${id}"></div><button class="btn-add-session btn-add-sess" title="Afegir Sessió"><i class="fa-solid fa-plus"></i></button></div>
        </div>`;
    
    selectEl('sequence-container').appendChild(div); 
    updateStepNumbers(); 
    
    div.querySelector('.step-title-input').addEventListener('input', saveState);

    if(!AppState.isRestoring) addSession(id); 
    saveState();
}

export function addActivity(stepId) {
    const actId = 'act-' + Date.now() + Math.floor(Math.random()*1000);
    const div = document.createElement('div'); div.className = 'sequence-activity';
    div.innerHTML = `
        <div class="remove-x btn-remove-act" title="Eliminar Activitat"><i class="fa-solid fa-xmark"></i></div><div class="activity-bullet"><i class="fa-solid fa-angle-right"></i></div>
        <div style="flex-grow: 1; display: flex; flex-direction: column;">
            <textarea class="activity-textarea" placeholder="Descripció de l'activitat..." rows="1"></textarea>
            <div class="eval-tools">
                <div class="btn-eval-a btn-eval" title="Marcar com Avaluable">A</div>
                <div id="criteria-container-${actId}" style="display: none; align-items: center; flex-direction: row; gap: 6px; flex-wrap: wrap; position: relative;">
                    <div class="btn-add-criteria btn-add-crit" title="Vincular Objectiu Didàctic (OD)"><i class="fa-solid fa-link"></i></div>
                </div>
            </div>
        </div>`;
    selectEl('activities-' + stepId).appendChild(div);
    div.querySelector('.activity-textarea').addEventListener('input', function() {
        this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';
        saveState();
    });
    saveState();
}

export function addSession(stepId) {
    const div = document.createElement('div'); div.className = 'session-item'; div.title = 'Clic per eliminar sessió'; 
    div.innerHTML = `<span class="session-num-text"></span><div class="session-trash"><i class="fa-solid fa-trash-can"></i></div>`;
    
    div.addEventListener('click', () => {
        div.remove();
        updateGlobalSessionNumbers();
        saveState();
    });

    selectEl('sessions-' + stepId).appendChild(div); 
    updateGlobalSessionNumbers();
    saveState();
}

export function updateGlobalSessionNumbers() { queryAll('.session-num-text').forEach((s, i) => s.innerText = i + 1); }
export function updateStepNumbers() { queryAll('.sequence-step').forEach((s, i) => s.querySelector('.step-number').innerText = i + 1); }

export function makeSequenceSortable() {
    const c = selectEl('sequence-container'); if (c.dataset.sortableInitialized) return; c.dataset.sortableInitialized = "true"; 
    let drg = null;
    c.addEventListener('dragstart', e => { if(e.target.classList.contains('sequence-step')) { drg = e.target; e.target.classList.add('dragging-step'); e.dataTransfer.effectAllowed='move'; } });
    c.addEventListener('dragend', e => { if(e.target.classList.contains('sequence-step')) { e.target.classList.remove('dragging-step'); drg = null; updateStepNumbers(); updateGlobalSessionNumbers(); saveState(); } });
    c.addEventListener('dragover', e => {
        e.preventDefault(); if(!drg || !drg.classList.contains('sequence-step')) return;
        const after = [...c.querySelectorAll('.sequence-step:not(.dragging-step)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect(), offset = e.clientY - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        if (drg.nextElementSibling !== after) {
            after == null ? c.appendChild(drg) : c.insertBefore(drg, after);
        }
    });
}

export function toggleEval(btn, actId) {
    const isActive = btn.classList.toggle('active');
    selectEl('criteria-container-' + actId).style.display = isActive ? 'flex' : 'none';
    saveState();
}

export function showCriteriaDropdown(btn, containerId, targetType) {
    let old = document.querySelector('.criteria-dropdown'); if (old) old.remove();
    
    const sourceTagsId = targetType === 'CA' ? 'tags-criteris' : 'tags-od';
    const sourceEl = selectEl(sourceTagsId);
    let tags = [];
    if (sourceEl) {
        tags = Array.from(sourceEl.querySelectorAll('.tag-text')).map(t => t.dataset.fulltext || t.innerText);
    }
    
    const drop = document.createElement('div'); drop.className = 'criteria-dropdown';
    if (tags.length === 0) {
        let errMsg = targetType === 'CA' 
            ? "No has seleccionat cap Criteri d'Avaluació." 
            : "No has seleccionat cap Objectiu Didàctic a l'apartat 2.";
        drop.innerHTML = `<div class="criteria-dropdown-empty">${errMsg}</div>`;
    } else {
        tags.forEach(t => {
            const opt = document.createElement('div'); opt.className = 'custom-option'; opt.innerText = t;
            opt.onclick = () => { addMiniCriteriaTag(t, containerId, targetType); drop.remove(); saveState(); };
            drop.appendChild(opt);
        });
    }
    btn.parentElement.appendChild(drop);
    
    setTimeout(() => { document.addEventListener('click', function closeDrop(e) { if(!e.target.closest('.criteria-dropdown')) { drop.remove(); document.removeEventListener('click', closeDrop); } }); }, 10);
}

export function addMiniCriteriaTag(val, targetContainerId, sourceType) {
    const c = typeof targetContainerId === 'string' ? selectEl(targetContainerId) : targetContainerId;
    const tag = document.createElement('div'); tag.className = 'mini-criteria-tag'; tag.title = val;
    
    let shortLabel = val;
    let colorMatch = null;

    if (sourceType === 'CA') {
        let m1 = val.match(/^CA\s*\d+(?:\.\d+)?/i);
        if (m1) shortLabel = m1[0];
        colorMatch = val.match(/^CA\s*(\d+)/i);
    } else if (sourceType === 'OD') {
        let m1 = val.match(/^(.*?)\s+-/);
        if (m1) shortLabel = m1[1];
        else {
            let mCA = val.match(/^CA\s*\d+(?:\.\d+)?/i);
            if (mCA) shortLabel = mCA[0]; 
            else shortLabel = val.substring(0, 15) + '...';
        }
        colorMatch = val.match(/CA\s*(\d+)/i);
    }
    
    if(colorMatch) tag.classList.add(`mini-tag-ce${colorMatch[1]}`);
    else tag.style.cssText = 'background:var(--tag-bg);color:var(--tag-text);border-color:var(--tag-border);';
    
    tag.innerHTML = `<span>${shortLabel}</span> <i class="fa-solid fa-xmark"></i>`; 
    tag.onclick = () => { tag.remove(); saveState(); };
    c.insertBefore(tag, c.querySelector('.btn-add-criteria'));
}

export function addObjectiveDidactic() {
    const codeInput = selectEl('input-od-code');
    const descInput = selectEl('input-od-desc');
    if (!codeInput || !descInput) return;
    
    const code = codeInput.value.trim();
    const desc = descInput.value.trim();
    if (!code || !desc) {
        alert("Has de posar un codi i una descripció per a l'Objectiu Didàctic.");
        return;
    }
    
    const container = selectEl('od-criteria-container');
    const criteriaTags = Array.from(container.querySelectorAll('.mini-criteria-tag span')).map(t => t.innerText);
    
    let finalVal = `${code} - ${desc}`;
    if (criteriaTags.length > 0) {
        finalVal += ` (${criteriaTags.join(', ')})`;
    }
    
    addTag(finalVal, 'tags-od');
    
    codeInput.value = '';
    descInput.value = '';
    
    container.querySelectorAll('.mini-criteria-tag').forEach(tag => tag.remove());
    
    saveState();
}
