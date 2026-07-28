import { AppState } from './state.js';
import { CONSTANTES_GLOBALES } from './constants.js';
import { normalizeTextForKeys } from './utils.js';

export async function fetchCsvData(area, nomCicle, url) {
    const response = await fetch(url); 
    const csvText = await response.text();
    
    return new Promise(resolve => {
        Papa.parse(csvText, {
            header: true, skipEmptyLines: true,
            complete: results => {
                if (!AppState.cacheDadesCurriculars[area]) AppState.cacheDadesCurriculars[area] = {};
                const d = { descriptoresMap: {}, curs: [], trimestre: [], objectiusGenerals: [], ods: [], competenciesEspecifiques: [], criterisAvaluacio: [], blocsContinguts: [], sabersBasics: [], sabersTransversals: [], metodologia: [], agrupaments: [], instrumentsAvaluacio: [], tipusAvaluacio: [], representacio: [], motivacio: [], accio: [] };
                const addUnic = (arr, val) => { if (val && !arr.includes(val)) arr.push(val); };
                
                results.data.forEach(row => {
                    let r = {}; 
                    for (let k in row) r[k.trim().toUpperCase()] = row[k] ? row[k].trim() : "";
                    
                    addUnic(d.curs, r['NIVELL']); addUnic(d.trimestre, r['TRIMESTRE']);
                    
                    const processStarred = (text, targetArr) => {
                        if (!text) return;
                        const isStarred = text.trim().endsWith('*'); 
                        const cleanText = isStarred ? text.replace(/\*$/, '').trim() : text.trim(); 
                        addUnic(targetArr, cleanText); 
                        if (isStarred) AppState.itemsAmbEstrella.add(cleanText);
                    };
                    processStarred(r['OBJ. GENERALS'], d.objectiusGenerals);
                    processStarred(r['ODS'], d.ods);
                    
                    let textCC = r['COMPETÈNCIES CLAU'] || r["PERFIL D'EIXIDA"] || r["PERFIL DE SORTIDA"] || r["PERFIL D'EIXIDA (DESCRIPTORS OPERATIUS)"] || r["DESCRIPTORS OPERATIUS"];
                    if (!textCC) for (let k in r) if (k.includes('PERFIL') || k.includes('DESCRIPTOR') || k.includes('CLAU')) { textCC = r[k]; break; }
                    if (textCC) textCC.split('\n').forEach(line => {
                        let match = line.match(/\b(CCL|CP|STEM|CD|CPSAA|CC|CE|CCEC)\s*(\d+)\b/i);
                        if (match) d.descriptoresMap[match[1].toUpperCase() + match[2]] = line.trim();
                    });

                    if (r['COMPETÈNCIES ESPECÍFIQUES']) {
                        let match = r['COMPETÈNCIES ESPECÍFIQUES'].match(/\s*[\(\[](.*?)[\)\]][.\s]*$/);
                        let textCENet = match ? r['COMPETÈNCIES ESPECÍFIQUES'].replace(match[0], '').trim() : r['COMPETÈNCIES ESPECÍFIQUES'];
                        addUnic(d.competenciesEspecifiques, textCENet); 
                        if (match) AppState.mapaCEs[normalizeTextForKeys(textCENet)] = match[1].split(/[\/,]/).map(c => c.trim().toUpperCase());
                    }

                    addUnic(d.criterisAvaluacio, r["CRITERIS D'AVALUACIÓ"] || r["CRITERIS D’AVALUACIÓ"] || r["CRITERIS D´AVALUACIÓ"]);
                    addUnic(d.blocsContinguts, r['BLOCS']);
                    
                    if (r['SABERS BÀSICS']) { 
                        let rawSaber = r['SABERS BÀSICS'];
                        let isTransversal = /\(T\)/i.test(rawSaber);
                        let cleanSaber = rawSaber.replace(/\s*\(T\)/i, '').trim();
                        
                        addUnic(d.sabersBasics, cleanSaber); 
                        
                        let fullyClean = cleanSaber.replace(/\s*\([^)]*(?:1ER|2ON|3ER)[^)]*\)/gi, '').trim();
                        if (isTransversal) addUnic(d.sabersTransversals, fullyClean);
                    
                        let m = cleanSaber.match(/CA\s*(\d+)/i);
                        if (m) AppState.sabersColors[fullyClean] = m[1]; 
                    }
                    
                    addUnic(d.metodologia, r['MODEL, METODOLOGIA, ESTIL'] || r['METODOLOGIA, MODEL, ESTIL']); 
                    addUnic(d.agrupaments, r['AGRUPAMENTS']);
                    addUnic(d.instrumentsAvaluacio, r["INSTRUMENTS D'AVALUACIÓ"] || r["INSTRUMENTS D’AVALUACIÓ"] || r["INSTRUMENTS D´AVALUACIÓ"] || r["INSSTRUMENTS D'AVALUACIÓ"]);
                    addUnic(d.tipusAvaluacio, r["TIPUS D'AVALUACIÓ"] || r["TIPUS D’AVALUACIÓ"] || r["TIPUS D´AVALUACIÓ"]);
                    addUnic(d.representacio, r['DUA REPRESENTACIÓ']); addUnic(d.motivacio, r['DUA MOTIVACIÓ']); addUnic(d.accio, r['DUA ACCIÓ']);
                });
                
                AppState.cacheDadesCurriculars[area][nomCicle] = d;
                resolve();
            }
        });
    });
}

export async function fetchDiversitat() {
    const response = await fetch(CONSTANTES_GLOBALES.urlDiversitat); 
    const csvText = await response.text();
    return new Promise(resolve => {
        Papa.parse(csvText, {
            header: true, skipEmptyLines: true,
            complete: results => {
                const addUnic = (arr, val) => { if(val && !arr.includes(val)) arr.push(val); };
                results.data.forEach(row => {
                    for (let k in row) {
                        let val = row[k]?.trim(); if (!val) continue; 
                        let key = k.toUpperCase();
                        if (key.includes('DESTINATARI')) addUnic(AppState.dadesDiversitat.destinataris, val);
                        else if (key.includes('3') && (key.includes('ACC') || key.includes('ACCESS') || key.includes('ACCÉS'))) addUnic(AppState.dadesDiversitat.n3_acces, val);
                        else if (key.includes('3') && (key.includes('APRE') || key.includes('APRENENTATGE'))) addUnic(AppState.dadesDiversitat.n3_apr, val);
                        else if (key.includes('3') && (key.includes('PART') || key.includes('PARTICIPACIÓ'))) addUnic(AppState.dadesDiversitat.n3_par, val);
                        else if (key.includes('REC') || key.includes('PERSONAL') || key.includes('RECURSOS')) addUnic(AppState.dadesDiversitat.n4_rec, val);
                        else if (key.includes('4') && (key.includes('ACC') || key.includes('ACCESS') || key.includes('ACCÉS'))) addUnic(AppState.dadesDiversitat.n4_acces, val);
                        else if (key.includes('4') && (key.includes('APRE') || key.includes('APRENENTATGE'))) addUnic(AppState.dadesDiversitat.n4_apr, val);
                        else if (key.includes('4') && (key.includes('PART') || key.includes('PARTICIPACIÓ'))) addUnic(AppState.dadesDiversitat.n4_par, val);
                    }
                });
                resolve();
            }
        });
    });
}
