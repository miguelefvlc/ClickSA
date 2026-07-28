import { AppState } from './state.js';
import { queryAll, normalizeTextForKeys, getSelectedText } from './utils.js';
import { addTag } from './ui.js';

export function getAreaActiva() {
    return getSelectedText('input-area');
}

export function getCicleActiu() {
    return getSelectedText('input-cicle');
}

export function establecerConexionesSaber(textSaber) {
    if (AppState.isRestoring) return; 
    const dades = AppState.cacheDadesCurriculars[getAreaActiva()]?.[getCicleActiu()]; if (!dades) return;
    
    [...textSaber.matchAll(/CA\s*(\d+)\.(\d+)/gi)].forEach(m => {
        const fCA = dades.criterisAvaluacio.find(c => new RegExp(`^CA\\s*${m[1]}\\.${m[2]}\\b`, 'i').test(c)); if (fCA) addTag(fCA, 'tags-criteris');
        const fCE = dades.competenciesEspecifiques.find(c => new RegExp(`^CE\\s*${m[1]}\\b`, 'i').test(c)); if (fCE) addTag(fCE, 'tags-comp-espec');
    });
    [...textSaber.matchAll(/BL\s*(\d+)/gi)].forEach(m => {
        const fBL = dades.blocsContinguts.find(b => new RegExp(`^BL\\s*${m[1]}\\b`, 'i').test(b)); if (fBL) addTag(fBL, 'tags-blocs');
    });
}

export function establecerConexionesCA(textCA) {
    if (AppState.isRestoring) return;
    const dades = AppState.cacheDadesCurriculars[getAreaActiva()]?.[getCicleActiu()]; if (!dades) return;
    const m = textCA.match(/^CA\s*(\d+)/i);
    if (m) {
        const fCE = dades.competenciesEspecifiques.find(c => new RegExp(`^CE\\s*${m[1]}\\b`, 'i').test(c));
        if (fCE) addTag(fCE, 'tags-comp-espec');
    }
}

export function establecerConexionesCE() { 
    if (!AppState.isRestoring) recalcularTotaLaCadena(); 
}

export function recalcularTotaLaCadena() {
    if (!AppState.cacheDadesCurriculars[getAreaActiva()]?.[getCicleActiu()]) return;
    let reqCC = new Set();
    
    queryAll('#tags-comp-espec .tag-text').forEach(s => {
        let txt = s.dataset.fulltext || s.innerText;
        (AppState.mapaCEs[normalizeTextForKeys(txt)] || []).forEach(cc => reqCC.add(cc.replace(/[\s-]/g, '').toUpperCase()));
    });
    
    queryAll('.cc-cell').forEach(cell => { 
        cell.classList.toggle('auto-active', reqCC.has(cell.dataset.desc)); 
        updateCellVisual(cell); 
    });
}

export function updateCellVisual(cell) { 
    cell.classList.toggle('active', cell.classList.contains('auto-active') || cell.classList.contains('manual-active')); 
}
