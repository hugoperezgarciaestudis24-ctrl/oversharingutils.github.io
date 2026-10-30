// Preferències locals i simulador de galetes.
function getPref(k,d) {
  try {
    return localStorage.getItem(k)||d
  } catch(e) {
    return d
  }
}
function setPref(k,v) {
  try {
    localStorage.setItem(k,v)
  } catch(e) {
  }
}
// Lumen Button expose l'estat desactivat mitjançant l'atribut accessible.
function setDisabled(button, disabled) {
  button.toggleAttribute('disabled', disabled)
}
let demoCookieId=null;
const buttons=document.querySelectorAll('.switches button');
buttons.forEach(b=>b.addEventListener('click',()=> {
  buttons.forEach(x=>x.classList.remove('active')); b.classList.add('active'); const out=document.getElementById('cookieOutput'),chips=document.getElementById('cookieChips'); if(b.dataset.mode==='basic') {
    out.textContent='El sitio guarda una cookie para recordar que has iniciado sesión. No necesita seguirte por otras webs.'; chips.innerHTML='<span class="chip ok">sesión: activa</span><span class="chip ok">preferencia: idioma ES</span><span class="chip">rastreo externo: no simulado</span>'
  } else {
    out.textContent='Además de la sesión, una red publicitaria presente en varios sitios puede leer su propio identificador y asociar visitas para inferir intereses. Es una simulación simplificada.'; chips.innerHTML='<span class="chip ok">sesión: activa</span><span class="chip warn">ID publicitario: 8F2A…</span><span class="chip warn">visita: tienda de deporte</span><span class="chip warn">visita: revista de fitness</span><span class="chip danger">perfil inferido: interés en running</span>'
  }
}));
const imageInput=document.getElementById('imageInput'),dropZone=document.getElementById('dropZone'),imagePreview=document.getElementById('imagePreview'),previewPlaceholder=document.getElementById('previewPlaceholder'),metadataOutput=document.getElementById('metadataOutput'),stripButton=document.getElementById('stripButton');
let selectedImage=null,previewUrl=null,currentMetadata={},visualResult=null;
let localClassifierPromise=null,localScenePromise=null,localOcrWorkerPromise=null,localHumanPromise=null,exifrPromise=null;
// Llegeix alguns camps EXIF d’un JPEG sense pujar la imatge.
function readExif(bytes) {
  let pos=2;
  if(bytes[0]!==0xff||bytes[1]!==0xd8)return null;
  while(pos+4<bytes.length) {
    if(bytes[pos]!==0xff)break;
    const marker=bytes[pos+1],
    len=(bytes[pos+2]<<8)|bytes[pos+3];
    if(marker===0xe1&&bytes[pos+4]===0x45&&bytes[pos+5]===0x78) {
      const t=pos+10,
      little=bytes[t]===0x49,
      view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),
      u16=o=>view.getUint16(o,little),
      u32=o=>view.getUint32(o,little),
      base=t+u32(t+4),
      count=u16(base),
      tags= {
      };
      let gpsOffset=null;
      const names= {
        0x010f:'Fabricante',
        0x0110:'Modelo de cámara',
        0x0132:'Fecha de modificación',
        0x9003:'Fecha de captura',
        0x9286:'Comentario',
        0x8827:'ISO',
        0x829a:'Exposición',
        0x920a:'Distancia focal',
        0x010e:'Descripción'
      };
      for(let i=0; i<count; i++) {
        const q=base+2+i*12,
        id=u16(q),
        type=u16(q+2),
        n=u32(q+4);
        if(id===0x8825&&type===4)gpsOffset=t+u32(q+8);
        if(!names[id])continue;
        const off=n<=4?q+8:t+u32(q+8);
        if(type===2&&off<bytes.length) {
          let v='';
          for(let j=0; j<Math.min(n,100); j++) {
            const c=bytes[off+j];
            if(!c)break;
            v+=String.fromCharCode(c)
          }
          if(v.trim())tags[names[id]]=v.trim()
        } else if(type===3)tags[names[id]]=String(u16(off));
        else if(type===4)tags[names[id]]=String(u32(off));
      }
      if(gpsOffset!==null) {
        try {
          const gc=u16(gpsOffset),
          gt= {
          };
          for(let j=0; j<gc; j++) {
            const q=gpsOffset+2+j*12,
            id=u16(q),
            type=u16(q+2),
            n=u32(q+4),
            off=n<=4?q+8:t+u32(q+8);
            if(type===2&&n<=4) {
              let z='';
              for(let k=0; k<n; k++)z+=String.fromCharCode(bytes[off+k]);
              gt[id]=z.replace(/\0/g,'')
            }
            if(type===5&&n===3) {
              const vals=[];
              for(let k=0; k<3; k++) {
                const z=off+k*8,
                den=u32(z+4);
                vals.push(den?u32(z)/den:0)
              }
              gt[id]=vals
            }
          }
          const dec=v=>v[0]+v[1]/60+v[2]/3600;
          if(gt[2]&&gt[4]) {
            const lat=dec(gt[2])*(gt[1]==='S'?-1:1),
            lon=dec(gt[4])*(gt[3]==='W'?-1:1);
            tags['GPS: coordenadas']=lat.toFixed(5)+', '+lon.toFixed(5)
          } else tags['GPS']='La imagen contiene datos GPS'
        } catch(e) {
          tags['GPS']='Hay datos GPS; no se pudieron leer las coordenadas'
        }
      }
      return tags
    }
    pos+=2+len;
  }
  return null
}
function esc(s) {
  return s.replace(/[&<>"]/g,c=>( {
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  }
  [c]))
}
// Exifr busca GPS y otros metadatos en más formatos de imagen que el lector básico JPEG.
function getExifParser() {
  if(!exifrPromise) {
    exifrPromise=import('https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.esm.js')
      .then(module=>module.default||module)
      .catch(error=>{exifrPromise=null;throw error});
  }
  return exifrPromise
}
async function readImageMetadata(file) {
  try {
    const exifr=await getExifParser();
    const [allTags,gps]=await Promise.all([exifr.parse(file,true),exifr.gps(file)]);
    const tags={};
    const displayNames={
      Make:'Fabricante',Model:'Modelo de cámara',LensModel:'Modelo de lente',
      DateTimeOriginal:'Fecha y hora de captura',CreateDate:'Fecha de creación',
      ModifyDate:'Fecha de modificación',GPSDateStamp:'Fecha GPS',GPSTimeStamp:'Hora GPS',
      GPSAltitude:'Altitud GPS (m)',GPSAltitudeRef:'Referencia de altitud GPS',
      GPSImgDirection:'Dirección GPS de la cámara',Software:'Programa de edición o captura',
      Artist:'Autor indicado',Copyright:'Copyright',ImageDescription:'Descripción',
      OwnerName:'Propietario indicado',City:'Ciudad indicada',State:'Región indicada',
      Country:'País indicado',Location:'Lugar indicado'
    };
    for(const [key,label] of Object.entries(displayNames)) {
      const value=allTags?.[key];
      if(value!==undefined&&value!==null&&String(value).trim())tags[label]=String(value);
    }
    // Include other short, readable metadata fields without dumping binary or nested values.
    let extraCount=0;
    for(const [key,value] of Object.entries(allTags||{})) {
      if(displayNames[key]||/^GPSLatitude|^GPSLongitude|^GPSAltitude/.test(key))continue;
      if(['string','number','boolean'].includes(typeof value)&&String(value).trim()&&String(value).length<=240&&extraCount<20) {
        tags[`EXIF · ${key}`]=String(value);
        extraCount++;
      }
    }
    if(gps&&Number.isFinite(gps.latitude)&&Number.isFinite(gps.longitude)) {
      tags['GPS: coordenadas']=`${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`;
    }
    // Some files expose GPS tags in the full parse even if the shortcut could not decode them.
    if(!tags['GPS: coordenadas']&&allTags?.GPSLatitude!==undefined&&allTags?.GPSLongitude!==undefined) {
      tags['GPS']='Hay etiquetas GPS, pero no se pudieron convertir en coordenadas.';
    }
    // Exifr currently documents GPS parsing for JPEG and PNG; do not claim a WebP was checked.
    return {tags,gpsChecked:file.type==='image/jpeg'||file.type==='image/png'};
  } catch(error) {
    // Keep the existing small JPEG reader as a fallback if the optional library cannot load.
    if(file.type==='image/jpeg') {
      try { return {tags:readExif(new Uint8Array(await file.arrayBuffer()))||{},gpsChecked:true}; }
      catch(fallbackError) { return {tags:{},gpsChecked:false}; }
    }
    return {tags:{},gpsChecked:false};
  }
}
// Cerca indicis de privacitat amb les API que ofereix aquest navegador.
async function scanVisibleContent(meta,cloud=null) {
  const signals=[],
  notes=[],reviewHints=[];
  let score=0;
  let supported=false;
  // The filename is user supplied and can accidentally expose names, dates, or places.
  const filename=selectedImage?.name||'';
  const filenameSignals=[];
  if(/\b\d{4}[-_]\d{2}[-_]\d{2}\b/.test(filename))filenameSignals.push('fecha');
  if(/\b(?:home|casa|school|colegio|address|direcci[oó]n|passport|dni|medical|m[eé]dico)\b/i.test(filename))filenameSignals.push('posible contexto personal');
  if(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(filename))filenameSignals.push('correo electrónico');
  if(filenameSignals.length){signals.push('El nombre del archivo incluye '+filenameSignals.join(', ')+'.');score+=Math.min(2,filenameSignals.length)}
  const gps=Boolean(meta?.['GPS: coordenadas']);
  const gpsTags=meta&&Object.keys(meta).some(k=>k.toLowerCase().includes('gps'));
  if(gps) {
    signals.push('La imagen contiene datos de ubicación GPS.');
    score+=3
  } else if(gpsTags) signals.push('Se encontraron etiquetas GPS, pero no se pudieron leer coordenadas completas.');
  if(meta&&Object.keys(meta).some(k=>/Fecha de captura|Fecha de modificación/.test(k))) {
    signals.push('La imagen incluye fecha de captura o modificación.');
    score++
  }
  if(meta&&Object.keys(meta).some(k=>/Fabricante|Modelo de cámara/.test(k))) {
    signals.push('La imagen informa del dispositivo o cámara usados.');
    score++
  }
  if(cloud) {
    supported=true;
    const text=(cloud.ocrText||'').replace(/\s+/g,' ').trim(),
    detections=(cloud.objects||[]).filter(item=>item&&item.label&&Number(item.score)>=0.55);
    if(detections.length)signals.push('Objetos detectados: '+detections.slice(0,12).map(item=>`${item.label} (${Math.round(item.score*100)}%)`).join(', ')+'.');
    const labels=new Set(detections.map(item=>String(item.label).toLowerCase().replace(/[_-]/g,' ').trim()));
    if(labels.has('person')) {
      reviewHints.push('Persona visible: comprueba si se la puede reconocer y si está de acuerdo con que compartas la imagen.');
      score++
    }
    if(['cell phone','laptop','tv','computer','monitor'].some(label=>labels.has(label))) {
      reviewHints.push('Dispositivo con pantalla: revisa manualmente si aparecen mensajes, cuentas o datos personales. La detección solo reconoce el objeto, no su contenido.');
      score++
    }
    if(['car','bus','truck','motorcycle'].some(label=>labels.has(label))) {
      reviewHints.push('Vehículo visible: comprueba si la matrícula o el entorno permiten identificar a alguien o su ubicación. El modelo no ha confirmado esos datos.');
    }
    if(text) {
      const findings=[];
      if(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text))findings.push('correo electrónico');
      if(/\b(?:\+?\d[\d ()-]{7,}\d)\b/.test(text))findings.push('teléfono');
      if(/\b(?:calle|avenida|av\.?|carrer|street|road|número|nº|c\.?p\.?|código postal|postcode)\b/i.test(text))findings.push('posible dirección');
      if(/\b(?:plaza|paseo|carretera|autovía|autopista|urbanización|bloque|portal|municipio|provincia|postal code|zip code)\b/i.test(text)&&!findings.includes('posible dirección'))findings.push('posible dirección o zona');
      if(/\b[-+]?\d{1,2}\.\d{3,}\s*[,;]\s*[-+]?\d{1,3}\.\d{3,}\b/.test(text))findings.push('posibles coordenadas geográficas escritas en la imagen');
      if(/\b(?:DNI|NIE|pasaporte|passport|IBAN|cuenta bancaria|tarjeta|card number|contraseña|password|usuario|username)\b/i.test(text))findings.push('posible documento o credencial');
      if(/\b(?:expediente|historial médico|diagnóstico|nómina|saldo|paciente|confidencial|privado|informe|resultado)\b/i.test(text))findings.push('posibles datos privados en documento o pantalla');
      if(findings.length) {
        signals.push('El OCR encontró '+findings.join(', ')+'. Revisa el texto visible antes de compartir.');
        score+=Math.min(4,findings.length+1)
      }
    } else notes.push('El OCR no encontró texto legible con suficiente confianza; no se atribuyen datos a la imagen.');
  }
  try {
    let faceCount=null;
    if(cloud&&Array.isArray(cloud.faces)) {
      supported=true;
      faceCount=cloud.faces.length
    }
    if(faceCount===null)notes.push('No hay un detector de rostros disponible en este navegador.')
    else if(faceCount) {
      signals.push(`Se detectaron ${faceCount} posible${faceCount===1?' rostro':'s rostros'}.`);
      reviewHints.push('Comprueba si las personas de la imagen pueden reconocerse y si están de acuerdo con que la compartas.');
      score+=faceCount>1?2:1
    } else notes.push('No se detectaron rostros.')
  } catch(e) {
    notes.push('El detector de rostros no está disponible aquí.')
  }
  try {
    if(!cloud) {
      if('TextDetector'in window) {
        supported=true;
        const blocks=await new TextDetector().detect(imagePreview);
        if(blocks.length) {
          const txt=blocks.map(x=>x.rawValue||'').join(' '),
          sensitive=/(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b\+?\d[\d ()-]{7,}\d\b|\b(?:calle|avenida|carrer|street|número|nº|postal)\b)/i.test(txt);
          signals.push(sensitive?'El texto de la imagen podría mostrar un correo, teléfono o dirección.':'Se detectó texto visible en la imagen.');
          score+=sensitive?2:1
        }
      } else notes.push('Este navegador no ofrece detector automático de texto.')
      }
  } catch(e) {
    notes.push('El detector de texto no está disponible aquí.')
  }
  try {
    if('BarcodeDetector'in window) {
      supported=true;
      const codes=await new BarcodeDetector().detect(imagePreview);
      if(codes.length) {
        signals.push('Se detectó un código QR o de barras que podría contener un enlace o datos.');
        score++
      }
    } else notes.push('Este navegador no ofrece detector automático de códigos QR.')
  } catch(e) {
    notes.push('El detector de códigos no está disponible aquí.')
  }
  const result=document.getElementById('imageResult');
  const preliminary=!cloud;
  let label=preliminary?'REVISIÓN PRELIMINAR':score>=3?'REVISAR ANTES DE COMPARTIR':score>0||reviewHints.length?'HAY ELEMENTOS QUE REVISAR':'NO HAY INDICIOS CLAROS';
  const cls=score>=3?'danger':score>0||reviewHints.length?'caution':'safe';
  const summary=preliminary?'Solo se revisaron metadatos y detectores integrados disponibles. Ejecuta el análisis con IA local para obtener resultados visuales específicos de esta imagen.':score>=3?'Se encontraron varias señales observables que conviene revisar antes de compartir.':score>0?'El análisis encontró elementos que merecen una revisión manual.':detectionsSummary(cloud,signals);
  const locationNote={
    es:'La ubicación se comprueba buscando GPS en los metadatos y direcciones o coordenadas legibles en la imagen. El sistema no puede identificar un lugar exacto solo por el paisaje.',
    ca:'La ubicació es comprova buscant GPS a les metadades i adreces o coordenades llegibles a la imatge. El sistema no pot identificar un lloc exacte només pel paisatge.',
    en:'Location is checked by looking for GPS in the metadata and readable addresses or coordinates in the image. The system cannot identify an exact place from scenery alone.'
  }[document.getElementById('languageSelect')?.value||'es'];
  result.innerHTML=`<div class="analysis-summary"><h3 class="${cls}">${label}</h3><p class="score">${esc(summary)}</p>${signals.length?'<ul>'+signals.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>No se identificaron señales sensibles en los datos analizados. Esto no garantiza que la imagen no contenga información privada.</p>'}${reviewHints.length?'<h4>Qué revisar antes de compartir</h4><ul>'+reviewHints.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':''}</div>${renderImageAnalysisPanels(meta,cloud,signals)}<p class="mini-note">${cloud?'Análisis local combinado: rostros, escena, objetos, texto y metadatos.':supported?'Se usaron detectores disponibles en este navegador.':'Solo se han revisado los metadatos.'} ${notes.map(esc).join(' ')}</p><p class="mini-note">${locationNote} Human no identifica a las personas. Las coincidencias de escena son orientativas y no identifican direcciones ni sitios exactos.</p>`
}
function detectionsSummary(cloud,signals) {
  if(cloud?.objects?.length) return 'Se analizaron objetos visibles, pero no aparecieron señales directas de texto privado o metadatos sensibles. Revisa los objetos listados antes de compartir.';
  if(cloud?.ocrText) return 'El OCR encontró texto, pero no detectó patrones comunes de datos personales. Comprueba el texto manualmente.';
  return 'No se detectaron indicios claros en el análisis automático. Esto no garantiza que la imagen no contenga información privada.';
}
function renderImageAnalysisPanels(meta,cloud,signals) {
  const lang=document.getElementById('languageSelect')?.value||'es';
  const labels=sceneNames[lang]||sceneNames.es;
  const faces=cloud?.faces;
  const faceMarkup=Array.isArray(faces)
    ?faces.length?`<strong>${faces.length} ${lang==='en'?'face(s) detected':lang==='ca'?'rostre(s) detectat(s)':'rostro(s) detectado(s)'}</strong><ul>${faces.map((face,index)=>{
      const confidence=Number(face.boxScore)||0;
      return `<li>${lang==='en'?'Face':lang==='ca'?'Rostre':'Rostro'} ${index+1} · ${Math.round(confidence*100)}% ${lang==='en'?'detector score':lang==='ca'?'confiança del detector':'confianza del detector'}</li>`
    }).join('')}</ul>`:`<strong>${lang==='en'?'No faces detected':lang==='ca'?'No s’han detectat rostres':'No se han detectado rostros'}</strong><p>${lang==='en'?'No face passed the confidence and size filters.':lang==='ca'?'Cap detecció no ha superat els filtres de confiança i mida.':'Ninguna detección superó los filtros de confianza y tamaño.'}</p>`
    :`<p>${lang==='en'?'Face detection could not complete.':lang==='ca'?'No s’ha pogut completar la detecció de rostres.':'No se pudo completar la detección de rostros.'}</p>`;

  const ranked=cloud?.scene||[];
  const top=ranked[0],next=ranked[1];
  const clearScene=top&&top.score>=0.20&&(!next||top.score-next.score>=0.025);
  const sceneMarkup=clearScene
    ?`<strong>${lang==='en'?'Likely scene type':lang==='ca'?'Tipus d’escena probable':'Tipo de escena probable'}: ${esc(labels[top.id]||labels.other)}</strong><p>${lang==='en'?'Relative match':lang==='ca'?'Coincidència relativa':'Coincidencia relativa'}: ${Math.round(top.score*100)}%. ${lang==='en'?'This is not a calibrated probability or an exact place name.':lang==='ca'?'No és una probabilitat calibrada ni el nom d’un lloc concret.':'No es una probabilidad calibrada ni el nombre de un lugar concreto.'}</p>`
    :ranked.length?`<p>${lang==='en'?'The scene model could not confidently choose a place type. Best match':lang==='ca'?'El model no ha pogut triar amb prou confiança un tipus de lloc. Millor coincidència':'El modelo no pudo elegir con suficiente confianza un tipo de lugar. Mejor coincidencia'}: ${esc(labels[top.id]||labels.other)} (${Math.round(top.score*100)}%).</p>`:`<p>${lang==='en'?'The scene classifier is unavailable.':lang==='ca'?'El classificador d’escenes no està disponible.':'El clasificador de escenas no está disponible.'}</p>`;
  const objects=(cloud?.objects||[]).filter(item=>item&&item.label&&Number(item.score)>=0.55);
  const objectMarkup=objects.length
    ?`<ul>${objects.slice(0,10).map(item=>`<li>${esc(String(item.label))} · ${Math.round(Number(item.score)*100)}%</li>`).join('')}</ul>`
    :`<p>${lang==='en'?'No clear supported objects were detected.':lang==='ca'?'No s’han detectat objectes clars amb prou confiança.':'No se detectaron objetos claros con suficiente confianza.'}</p>`;
  const clues=signals.filter(signal=>/direcci[oó]n|coordenadas|zona/i.test(signal));
  const clueMarkup=clues.length?`<p>${clues.map(esc).join(' ')}</p>`:`<p>${lang==='en'?'No readable address or coordinates were found in the text scan.':lang==='ca'?'L’escaneig de text no ha trobat cap adreça o coordenada llegible.':'El escaneo de texto no encontró direcciones ni coordenadas legibles.'}</p>`;

  const gpsEntry=Object.entries(meta||{}).find(([key])=>key.toLowerCase().includes('gps: coordenadas'));
  const gpsMetadata=Object.entries(meta||{}).filter(([key])=>key.toLowerCase().includes('gps'));
  const coordinateMatch=String(gpsEntry?.[1]||'').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  const mapLink=coordinateMatch&&Math.abs(Number(coordinateMatch[1]))<=90&&Math.abs(Number(coordinateMatch[2]))<=180
    ?`<p><a href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(coordinateMatch[1])}&mlon=${encodeURIComponent(coordinateMatch[2])}#map=16/${encodeURIComponent(coordinateMatch[1])}/${encodeURIComponent(coordinateMatch[2])}" target="_blank" rel="noopener">${lang==='en'?'Open coordinates in OpenStreetMap ↗':lang==='ca'?'Obre les coordenades a OpenStreetMap ↗':'Abrir coordenadas en OpenStreetMap ↗'}</a><br><small>${lang==='en'?'Opening the map sends these coordinates to OpenStreetMap.':lang==='ca'?'En obrir el mapa, aquestes coordenades s’envien a OpenStreetMap.':'Al abrir el mapa, estas coordenadas se envían a OpenStreetMap.'}</small></p>`:'';
  const metadataRows=Object.entries(meta||{}).map(([key,value])=>`<div class="meta-row"><b>${esc(key)}</b><span>${esc(String(value))}</span></div>`).join('');
  const gpsStatus=gpsEntry?`<strong>${esc(gpsEntry[1])}</strong>${mapLink}`:gpsMetadata.length?`<strong>${lang==='en'?'GPS metadata found, coordinates could not be decoded':lang==='ca'?'S’han trobat metadades GPS, però no s’han pogut llegir les coordenades':'Se encontraron metadatos GPS, pero no se pudieron leer las coordenadas'}</strong>`:`<strong>${lang==='en'?'No GPS coordinates found':lang==='ca'?'No s’han trobat coordenades GPS':'No se encontraron coordenadas GPS'}</strong><p>${lang==='en'?'No exact location is inferred without GPS data.':lang==='ca'?'No s’infereix cap ubicació exacta sense dades GPS.':'No se infiere una ubicación exacta sin datos GPS.'}</p>`;
  const metadataMarkup=`${gpsStatus}${metadataRows||`<p>${lang==='en'?'No other readable metadata was found.':lang==='ca'?'No s’han trobat altres metadades llegibles.':'No se encontraron otros metadatos legibles.'}</p>`}`;
  return `<div class="analysis-panels"><section class="analysis-card"><h4>A · ${lang==='en'?'Face analysis':lang==='ca'?'Anàlisi de rostres':'Análisis de rostros'}</h4>${faceMarkup}</section><section class="analysis-card"><h4>B · ${lang==='en'?'Visual place analysis':lang==='ca'?'Anàlisi visual del lloc':'Análisis visual del lugar'}</h4>${sceneMarkup}<h5>${lang==='en'?'Recognized elements':lang==='ca'?'Elements identificats':'Elementos identificados'}</h5>${objectMarkup}<h5>${lang==='en'?'Location clues in readable text':lang==='ca'?'Pistes d’ubicació al text llegible':'Pistas de ubicación en el texto legible'}</h5>${clueMarkup}<p class="mini-note">${lang==='en'?'A scene category is not an exact geolocation. No address is guessed.':lang==='ca'?'La categoria d’escena no és una geolocalització exacta. No s’endevina cap adreça.':'La categoría de escena no es una geolocalización exacta. No se adivina ninguna dirección.'}</p></section><section class="analysis-card"><h4>C · ${lang==='en'?'Photo metadata':lang==='ca'?'Metadades de la foto':'Metadatos de la foto'}</h4>${metadataMarkup}</section></div>`
}
// Carrega una imatge local, en mostra la vista prèvia i n’inicia la revisió.
function loadImage(file) {
  if(!file)return;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    metadataOutput.textContent='Formato no compatible. Selecciona JPG, PNG o WebP.';
    return
  }
  selectedImage=file;
  updateLocalAiButton();
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(file);
  imagePreview.hidden=false;
  previewPlaceholder.hidden=true;
  setDisabled(stripButton,false);
  metadataOutput.textContent='Leyendo metadatos…';
  const imageResult=document.getElementById('imageResult');
  imageResult.classList.remove('is-done');
  imageResult.innerHTML='<h3>ANALIZANDO IMAGEN…</h3><p>La imagen se queda en tu navegador.</p><div class="scan-bar"><i></i></div>';
  const metadataTask=readImageMetadata(file);
  imagePreview.onload=async()=> {
    document.getElementById('fileInfo').textContent=`${file.name} · ${imagePreview.naturalWidth} × ${imagePreview.naturalHeight} px · ${(file.size/1024).toFixed(1)} KB`;
    const metadataScan=await metadataTask;
    const meta=metadataScan.tags||{};
    const hasGpsCoordinates=Boolean(meta?.['GPS: coordenadas']);
    const hasGpsTags=Object.keys(meta||{}).some(key=>key.toLowerCase().includes('gps'));
    const lang=document.getElementById('languageSelect')?.value||'es';
    const locationCopy={
      es:hasGpsCoordinates?['COORDENADAS GPS ENCONTRADAS','Este archivo contiene coordenadas GPS. Revísalas antes de publicar.']:hasGpsTags?['ETIQUETAS GPS, SIN COORDENADAS LEGIBLES','Hay campos GPS, pero no se pudo leer una pareja de coordenadas.']:metadataScan.gpsChecked?['NO SE ENCONTRÓ GPS','No aparecen coordenadas GPS en los metadatos revisados. Aun así, la foto puede mostrar calles, letreros o lugares reconocibles.']:['NO SE PUDO COMPROBAR EL GPS','No se pudo leer el formato de metadatos de esta imagen. Revisa también el texto y los detalles visibles.'],
      ca:hasGpsCoordinates?['COORDENADES GPS TROBADES','Aquest fitxer conté coordenades GPS. Revisa-les abans de publicar-lo.']:hasGpsTags?['ETIQUETES GPS, SENSE COORDENADES LLEGIBLES','Hi ha camps GPS, però no s’ha pogut llegir una parella de coordenades.']:metadataScan.gpsChecked?['NO S’HA TROBAT GPS','No hi ha coordenades GPS a les metadades revisades. Tot i així, la foto pot mostrar carrers, rètols o llocs reconeixibles.']:['NO S’HA POGUT COMPROVAR EL GPS','No s’han pogut llegir les metadades d’aquest format. Revisa també el text i els detalls visibles.'],
      en:hasGpsCoordinates?['GPS COORDINATES FOUND','This file contains GPS coordinates. Review them before posting.']:hasGpsTags?['GPS TAGS, NO READABLE COORDINATES','GPS fields exist, but a coordinate pair could not be read.']:metadataScan.gpsChecked?['NO GPS FOUND','No GPS coordinates were found in the metadata checked. The photo may still show streets, signs, or recognizable places.']:['COULD NOT CHECK GPS','The metadata format could not be read. Also check text and visible details.']
    }[lang]||[];
    const locationNote=`<div class="location-status ${hasGpsCoordinates||hasGpsTags?'caution':''}"><b>${locationCopy[0]}</b><br>${locationCopy[1]}</div>`;
    metadataOutput.innerHTML=(meta&&Object.keys(meta).length?Object.entries(meta).map(([k,v])=>`<div class="meta-row"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join(''):'<span class="none">No se encontraron otros metadatos habituales.</span>')+locationNote;
    currentMetadata=meta||{}; visualResult=null;
    updateLocalAiButton();
    scanVisibleContent(currentMetadata,visualResult).finally(()=> {
      imageResult.classList.remove('is-scanning'); imageResult.classList.add('is-done')
    }).then(()=>{
      // Start the optional on-device model after the fast metadata and browser checks.
      // Model files are fetched from public CDNs once and cached by the browser.
      if(selectedImage===file&&!localAiButton.hasAttribute('disabled')) runLocalImageAnalysis();
    })
  };
  imagePreview.onerror=()=> {
    document.getElementById('imageResult').innerHTML='<h3 class="danger">NO SE PUDO LEER</h3><p>Prueba con otra imagen JPG, PNG o WebP.</p>'
  }
  // Registra los eventos antes de asignar el blob para no perder una carga rápida.
  imagePreview.src=previewUrl;
}
imageInput.addEventListener('change',e=>loadImage(e.target.files[0]));
dropZone.addEventListener('dragover',e=> {
  e.preventDefault(); dropZone.classList.add('dragover')
});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop',e=> {
  e.preventDefault(); dropZone.classList.remove('dragover'); loadImage(e.dataTransfer.files[0])
});
stripButton.addEventListener('click',()=> {
  if(!selectedImage)return; const img=new Image(); img.onload=()=> {
    const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight; c.getContext('2d').drawImage(img,0,0); const mime=selectedImage.type==='image/png'?'image/png':selectedImage.type==='image/webp'?'image/webp':'image/jpeg'; c.toBlob(blob=> {
      if(!blob) {
        metadataOutput.insertAdjacentHTML('beforeend','<p>No se pudo crear la copia.</p>'); return
      }
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'; a.download=selectedImage.name.replace(/\.[^.]+$/,'')+'-sin-metadata.'+ext; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000)
    },mime,.94)
  }; img.src=previewUrl
});
const localAiButton=document.getElementById('localAiButton'),localAiStatus=document.getElementById('localAiStatus');
let localAnalysisBusy=false;
function updateLocalAiButton() {setDisabled(localAiButton,!selectedImage)}
function getLocalClassifier() {
  if(!localClassifierPromise) {
    localClassifierPromise=(async()=> {
      const {pipeline}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');
      return pipeline('object-detection','Xenova/detr-resnet-50');
    })().catch(error=> {localClassifierPromise=null;throw error});
  }
  return localClassifierPromise
}
// CLIP compara la foto con tipos generales de escenas; no busca una dirección exacta.
function getLocalSceneClassifier() {
  if(!localScenePromise) {
    localScenePromise=(async()=> {
      const {pipeline}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');
      return pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32');
    })().catch(error=>{localScenePromise=null;throw error});
  }
  return localScenePromise
}
const sceneOptions=[
  {id:'street',prompt:'a street, road, or city intersection'},
  {id:'building',prompt:'the exterior of a building or a building facade'},
  {id:'park',prompt:'a public park or garden'},
  {id:'beach',prompt:'a beach or coastline'},
  {id:'landscape',prompt:'a mountain, countryside, or natural landscape'},
  {id:'monument',prompt:'a monument, famous landmark, or historic site'},
  {id:'commercial',prompt:'a shop, storefront, or commercial area'},
  {id:'bridge',prompt:'a bridge or large transport structure'},
  {id:'station',prompt:'a train station, airport, or transport terminal'},
  {id:'indoor',prompt:'an indoor room or interior'},
  {id:'portrait',prompt:'a close-up portrait of one person'},
  {id:'group',prompt:'a group photo of several people'},
  {id:'object',prompt:'a close-up photo of an object'},
  {id:'document',prompt:'a document or a text-heavy screen'},
  {id:'other',prompt:'something else, not a recognizable place'}
];
const sceneNames={
  es:{street:'calle o carretera',building:'edificio',park:'parque o jardín',beach:'playa o costa',landscape:'paisaje natural o de montaña',monument:'monumento o lugar histórico',commercial:'comercio o zona comercial',bridge:'puente o infraestructura',station:'estación o terminal',indoor:'interior',portrait:'retrato de una persona',group:'grupo de personas',object:'objeto en primer plano',document:'documento o pantalla con texto',other:'otro tipo de imagen'},
  ca:{street:'carrer o carretera',building:'edifici',park:'parc o jardí',beach:'platja o costa',landscape:'paisatge natural o de muntanya',monument:'monument o lloc històric',commercial:'comerç o zona comercial',bridge:'pont o infraestructura',station:'estació o terminal',indoor:'interior',portrait:'retrat d’una persona',group:'grup de persones',object:'objecte en primer pla',document:'document o pantalla amb text',other:'un altre tipus d’imatge'},
  en:{street:'street or road',building:'building',park:'park or garden',beach:'beach or coast',landscape:'natural or mountain landscape',monument:'monument or historic site',commercial:'shop or commercial area',bridge:'bridge or infrastructure',station:'station or terminal',indoor:'indoor scene',portrait:'single-person portrait',group:'group of people',object:'close-up object',document:'document or text-heavy screen',other:'another kind of image'}
};
// Human és un detector de rostres del projecte vladmandic/human, publicat a GitHub.
function getGithubFaceDetector() {
  if(!localHumanPromise) {
    localHumanPromise=(async()=> {
      const {Human}=await import('https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/human.esm.js');
      const human=new Human({
        backend:'webgl',
        modelBasePath:'https://vladmandic.github.io/human-models/models/',
        cacheModels:true,
        debug:false,
        face:{
          enabled:true,
          detector:{enabled:true,maxDetected:10,rotation:false,minConfidence:0.82,minSize:22,iouThreshold:0.35},
          mesh:{enabled:true,keepInvalid:false},attention:{enabled:false},iris:{enabled:false},
          description:{enabled:false},emotion:{enabled:false},antispoof:{enabled:false},
          liveness:{enabled:false},gear:{enabled:false}
        },
        body:{enabled:false},hand:{enabled:false},object:{enabled:false},
        gesture:{enabled:false},segmentation:{enabled:false}
      });
      await human.load();
      return human
    })().catch(error=> {localHumanPromise=null;throw error});
  }
  return localHumanPromise
}
function getLocalOcrWorker(onProgress) {
  if(!localOcrWorkerPromise) {
    localOcrWorkerPromise=(async()=> {
      const {createWorker}=await import('https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/+esm');
      return createWorker('eng+spa',1,{logger:message=> {
        if(message.status==='loading language traineddata')onProgress('Descargando datos OCR…');
        else if(message.status==='recognizing text')onProgress('Leyendo texto de la imagen…');
      }});
    })().catch(error=> {localOcrWorkerPromise=null;throw error});
  }
  return localOcrWorkerPromise
}
function makeAnalysisCanvas(image) {
  const scale=Math.min(1,512/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas
}
localAiButton.addEventListener('click',runLocalImageAnalysis);
async function runLocalImageAnalysis() {
  if(!selectedImage||localAnalysisBusy||!imagePreview.complete||!imagePreview.naturalWidth)return;
  localAnalysisBusy=true;
  setDisabled(localAiButton,true);
  const result=document.getElementById('imageResult');
  result.innerHTML='<h3>PREPARANDO REVISIONES LOCALES…</h3><p>La primera carga de cada detector puede tardar. La imagen sigue en este dispositivo.</p><div class="scan-bar"><i></i></div>';
  try {
    const canvas=makeAnalysisCanvas(imagePreview);
    let objects=[],faces=null,scene=null,ocrText='';
    const notes=[],engines=[];
    // Cada motor se ejecuta por separado: un modelo que no carga no bloquea a los demás.
    try {
      localAiStatus.textContent='Cargando detector de objetos…';
      const classifier=await getLocalClassifier();
      localAiStatus.textContent='Buscando objetos visibles…';
      objects=(await classifier(canvas,{threshold:0.45})).filter(item=>item.score>=0.45);
      engines.push('objetos');
    } catch(error) { notes.push('El detector de objetos no se pudo cargar.'); }
    try {
      localAiStatus.textContent='Cargando detector de rostros desde GitHub…';
      const human=await getGithubFaceDetector();
      localAiStatus.textContent='Buscando rostros…';
      const faceResult=await human.detect(canvas);
      // A high detector score and minimum box size reduce window/facade false positives.
      faces=(faceResult.face||[]).filter(face=>{
        const boxConfidence=Number(face.boxScore)||0;
        const meshConfidence=Number(face.faceScore)||0;
        const width=Number(face.size?.[0]??face.box?.[2])||0;
        const height=Number(face.size?.[1]??face.box?.[3])||0;
        return boxConfidence>=0.82&&meshConfidence>=0.72&&width>=22&&height>=22;
      });
      engines.push('rostros');
    } catch(error) {
      notes.push('No se pudo cargar el detector Human de rostros.');
    }
    try {
      localAiStatus.textContent='Clasificando el tipo de escena…';
      const sceneClassifier=await getLocalSceneClassifier();
      const classified=await sceneClassifier(canvas,sceneOptions.map(item=>item.prompt),{top_k:5});
      scene=classified.map(item=>({id:sceneOptions.find(option=>option.prompt===item.label)?.id||'other',score:Number(item.score)||0})).sort((a,b)=>b.score-a.score);
      engines.push('tipo de escena');
    } catch(error) { notes.push('No se pudo cargar el clasificador local de escenas.'); }
    try {
      const worker=await getLocalOcrWorker(status=>{localAiStatus.textContent=status});
      const recognized=await worker.recognize(imagePreview);
      const candidateText=(recognized.data.text||'').replace(/\s+/g,' ').trim();
      const confidence=Number(recognized.data.confidence)||0;
      // Ignora fragmentos con poca confianza para reducir falsas alertas.
      if(confidence>=35&&/[\p{L}\p{N}]{3}/u.test(candidateText))ocrText=candidateText;
      engines.push('OCR');
    } catch(error) { notes.push('El lector de texto (OCR) no se pudo cargar.'); }
    if(!engines.length) {
      result.innerHTML='<h3 class="caution">NO SE PUDIERON CARGAR LOS DETECTORES</h3><p>Comprueba tu conexión e inténtalo de nuevo. Las comprobaciones de metadatos siguen disponibles y la imagen no se ha enviado.</p>';
      localAiStatus.textContent='No se cargó ningún detector. Hace falta conexión para descargar los modelos la primera vez.';
    } else {
      visualResult={objects,ocrText,faces,scene};
      await scanVisibleContent(currentMetadata,visualResult);
      if(notes.length)result.insertAdjacentHTML('beforeend','<p class="mini-note">'+notes.map(esc).join(' ')+'</p>');
      localAiStatus.textContent='Revisión terminada. Comprobaciones completadas: '+engines.join(', ')+'.';
    }
  } catch(error) {
    result.innerHTML='<h3 class="caution">LA REVISIÓN SE INTERRUMPIÓ</h3><p>'+esc(error.message||'No se pudo preparar la imagen para el análisis.')+'</p><p>Los metadatos siguen disponibles y la imagen no se ha enviado.</p>';
    localAiStatus.textContent='La revisión no terminó. Puedes volver a intentarlo.';
  } finally {
    localAnalysisBusy=false;
    updateLocalAiButton();
  }
}
// Analizador de metadatos web: las conclusiones se derivan solo del HTML recibido.
const pageMetadataForm=document.getElementById('pageMetadataForm'),pageMetadataButton=document.getElementById('pageMetadataButton'),pageMetadataStatus=document.getElementById('pageMetadataStatus'),pageMetadataResults=document.getElementById('pageMetadataResults');
let pageMetadataBusy=false;
function renderPageMetadata(result) {
  const m=result.metadata,groups=[];
  const group=(title,description,items)=>groups.push({title,description,items});
  group('Metadatos básicos','Ayudan a identificar y resumir el contenido de la página.',[
    ['Título de la página',m.title,'Texto que aparece normalmente en la pestaña y en resultados de búsqueda.'],['Descripción',m.description,'Resumen que buscadores pueden mostrar en sus resultados.'],['Autor',m.author,'Crédito indicado por la propia página; no verifica quién la publicó realmente.']
  ]);
  const knownOg=['og:title','og:description','og:type','og:url','og:image','og:image:alt','og:site_name'];
  const knownTwitter=['twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt','twitter:site','twitter:creator'];
  const listItems=(values,known)=>{const map=new Map(values.map(x=>[x.name.toLowerCase(),x.value]));return [...new Set([...known,...map.keys()])].map(key=>[key,map.get(key)||'',key.startsWith('og:')?'Dato Open Graph para vistas previas al compartir.':'Dato Twitter Card para vistas previas al compartir en X.']);};
  group('Open Graph','Campos usados por servicios compatibles al crear una vista previa al compartir.',listItems(m.openGraph,knownOg));
  group('Twitter Cards','Campos para tarjetas de enlace en X y otros clientes compatibles.',listItems(m.twitter,knownTwitter));
  group('Metadatos técnicos','Aportan instrucciones de interpretación, visualización e indexación.',[
    ['Codificación (charset)',m.charset,'Indica cómo se codifica el texto HTML.'],['Idioma (lang)',m.language,'Declara el idioma principal del documento.'],['Viewport',m.viewport,'Ayuda a adaptar el diseño a pantallas móviles.'],['URL canónica',m.canonical,'Sugiere la URL preferida para identificar esta página.'],['Robots',m.robots,'Puede dar instrucciones de indexación a algunos buscadores.']
  ]);
  const imageItems=m.images.map((x,i)=>[`${x.name}${x.src?' · '+x.src:''}`,x.value||'(sin descripción)',x.name==='alt de imagen'?'Texto alternativo asociado a una imagen; mejora accesibilidad y aporta contexto.':'Imagen o texto alternativo declarado para vistas previas al compartir.']);
  group('Metadatos de imágenes','Incluye imágenes de vista previa y atributos alt encontrados en etiquetas img.',imageItems.length?imageItems:[['Imágenes / texto alternativo','','Se revisan referencias de imagen en metaetiquetas y etiquetas img del HTML.']]);
  const structured=m.jsonLd.map((raw,index)=>{let value=raw,type='JSON-LD';try{const data=JSON.parse(raw),entries=Array.isArray(data)?data:[data];type=entries.map(x=>x&&typeof x==='object'?(Array.isArray(x['@type'])?x['@type'].join(', '):x['@type']||'JSON-LD'):'JSON-LD').join(', ');value=JSON.stringify(data);}catch{}return [`JSON-LD ${index+1} · ${type}`,value,'Datos estructurados declarados en formato JSON-LD; pueden describir contenido según Schema.org u otros vocabularios.'];});
  (m.microdata||[]).forEach((item,index)=>structured.push([`${item.name} · ${index+1}`,item.value,'Atributos de microdatos detectados en el HTML. La detección no valida que estén completos o sean correctos.']));
  group('Datos estructurados','Se busca JSON-LD incrustado; el contenido se muestra como fue declarado y no se valida semánticamente.',structured.length?structured:[['JSON-LD','','No se encontró ningún bloque JSON-LD en el HTML analizado.']]);
  const items=groups.flatMap(g=>g.items),found=items.filter(x=>String(x[1]||'').trim()&&String(x[1]).trim()!=='(sin descripción)').length,missing=items.length-found;
  const cards=groups.map(g=>`<section class="metadata-group"><h4>${esc(g.title)}</h4><p>${esc(g.description)}</p><div class="metadata-fields">${g.items.map(([name,value,about])=>{const present=Boolean(String(value||'').trim());return `<div class="metadata-field ${present?'is-found':'is-missing'}"><div class="metadata-field-heading"><strong>${esc(name)}</strong><span class="metadata-state">${present?'Encontrado':'No encontrado'}</span></div><div class="metadata-value">${present?esc(String(value).slice(0,5000)):'—'}</div><small>${esc(about)}</small></div>`}).join('')}</div></section>`).join('');
  const disclosures=[];
  if(m.author)disclosures.push('La página declara un autor. Ese dato puede revelar un nombre o seudónimo, pero no confirma su identidad ni responsabilidad.');
  if(m.canonical)disclosures.push('La URL canónica declara una dirección preferida y puede revelar la estructura de URLs del sitio.');
  if(m.jsonLd.length||(m.microdata||[]).length)disclosures.push('Los datos estructurados pueden declarar nombres, organizaciones u otros detalles sobre el contenido; revísalos antes de publicar.');
  pageMetadataResults.innerHTML=`<div class="metadata-summary"><strong>${found} campos con valor</strong><span>${missing} campos ausentes o vacíos</span><p>La página respondió correctamente: HTTP ${Number(result.status)||'—'}. Los valores proceden del HTML de <b>${esc(result.url)}</b>; un campo vacío no se ha inferido.</p></div>${cards}<section class="metadata-advice"><h4>Lectura del resultado</h4><p>${missing?`Faltan ${missing} de los campos revisados. Si quieres mejorar cómo se presenta la página, considera añadir título, descripción, idioma y los campos de vista previa que correspondan a su contenido.`:'Los campos revisados tienen valores. Comprueba que describan fielmente la página y que las vistas previas sean adecuadas.'}</p><p>${disclosures.length?disclosures.map(esc).join(' '):'No se encontraron en estos campos datos de autor o declaraciones estructuradas que permitan describir a responsables. Esto no demuestra que no haya información identificativa en otras partes de la página.'}</p><p class="mini-note">Análisis automático del HTML inicial: no ejecuta JavaScript, no revisa recursos externos ni confirma la exactitud de lo declarado. Una ausencia significa que el campo no apareció en el HTML recibido.</p></section>`;
}
async function analyzePageMetadata(event) {
  event?.preventDefault(); if(pageMetadataBusy)return;
  const url=document.getElementById('pageUrl').value.trim();
  if(!url){document.getElementById('pageUrl').reportValidity();return}
  pageMetadataBusy=true; pageMetadataResults.replaceChildren(); pageMetadataStatus.textContent='Descargando y revisando el HTML de la página…'; setDisabled(pageMetadataButton,true);
  try {
    const response=await fetch('/api/analyze-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    let data;try{data=await response.json()}catch{throw new Error('El servidor devolvió una respuesta que no se pudo interpretar.');}
    if(!response.ok)throw new Error(data.error||`No se pudo analizar la página (HTTP ${response.status}).`);
    renderPageMetadata(data); pageMetadataStatus.textContent='Análisis terminado. Los resultados solo incluyen datos encontrados en el HTML.';
  } catch(error) {
    const disconnected=error instanceof TypeError||/failed to fetch|fetch failed|networkerror/i.test(error.message||'');
    const message=disconnected?'No se pudo conectar con el analizador. Abre esta web desde su servidor Node (pnpm start) y comprueba que siga activo. Si usas un alojamiento estático, también debe publicar POST /api/analyze-page.':error.message||'Comprueba la dirección y vuelve a intentarlo.';
    pageMetadataResults.innerHTML=`<div class="metadata-error"><strong>No se pudo analizar esta página</strong><p>${esc(message)}</p><p>El navegador no recibió un resultado. Comprueba que el servidor esté activo y tenga acceso a Internet.</p></div>`;pageMetadataStatus.textContent='El análisis no terminó correctamente.';
  }
  finally {pageMetadataBusy=false;setDisabled(pageMetadataButton,false)}
}
pageMetadataForm.addEventListener('submit',analyzePageMetadata);
// lumen-button no siempre activa el envío nativo del formulario al hacer clic.
pageMetadataButton.addEventListener('click',event=>{event.preventDefault();pageMetadataForm.requestSubmit()});
// Demostració del navegador i consulta de la IP amb permís explícit.
const trackingOutput=document.getElementById('trackingOutput'),ipConsent=document.getElementById('ipConsent'),showRealIp=document.getElementById('showRealIp'),realIpOutput=document.getElementById('realIpOutput');
ipConsent.addEventListener('change',()=> {
  setDisabled(showRealIp,!ipConsent.checked); if(!ipConsent.checked)realIpOutput.textContent=''
});
showRealIp.addEventListener('click',async()=> {
  if(!ipConsent.checked)return; setDisabled(showRealIp,true); realIpOutput.textContent='Consultando ipify…'; try {
    const response=await fetch('https://api.ipify.org?format=json', {
      mode:'cors',cache:'no-store'
    }); if(!response.ok)throw new Error('Respuesta no disponible'); const data=await response.json(); if(!data.ip)throw new Error('Respuesta sin IP'); realIpOutput.textContent='Tu IP pública: '+data.ip+' · recibida de api.ipify.org';
  } catch(e) {
    realIpOutput.textContent='No se pudo consultar el servicio. La simulación local sigue disponible.'
  } finally {
    setDisabled(showRealIp,!ipConsent.checked)
  }
});
document.getElementById('runTracking').addEventListener('click',()=> {
  let id=getPref('filtro-demo-cookie',''); if(!id) {
    id=demoCookieId||Math.random().toString(16).slice(2,10).toUpperCase(); demoCookieId=id; setPref('filtro-demo-cookie',id)
  }
  const started=performance.now(),rows=[['IP que vería un servidor','203.0.113.42 (EJEMPLO FICTICIO)'],['Cookie simulada','visitor_id='+id],['Navegador',navigator.userAgent],['Idioma',navigator.language],['Sistema informado',navigator.platform||'No informado'],['Pantalla',screen.width+' × '+screen.height],['Zona horaria',Intl.DateTimeFormat().resolvedOptions().timeZone]]; trackingOutput.innerHTML=rows.map(([k,v])=>`<div class="meta-row"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')+'<p>Lectura local completada en '+(performance.now()-started).toFixed(2)+' ms. No se envió ninguna petición.</p>'
});
// Textos i controls d’idioma, tema i color.
const langSelect=document.getElementById('languageSelect'),themeToggle=document.getElementById('themeToggle'),accentColor=document.getElementById('accentColor');
// Traduccions dels elements identificats amb data-i18n.
const i18n= {
  brand: {
    ca:'OversharingUtils <b>// privacitat augmentada</b>',
    en:'OversharingUtils <b>// privacy awareness</b>'
  },
  localAiIntro:{ca:'La revisió comença automàticament en triar una imatge i es processa en aquest dispositiu.',en:'The review starts automatically when you choose an image and runs on this device.'},
  localAiButton:{ca:'[ Torna a analitzar amb IA local ]',en:'[ Run local AI analysis again ]'},
  localAiDisclosure:{ca:'La imatge no s’envia. La primera vegada es descarreguen Exifr per a les metadades, Human per als rostres, DETR per als objectes, CLIP per classificar escenes generals i les dades OCR. Pot trigar i consumir dades; els models es desen a la memòria cau del navegador. CLIP no identifica adreces ni llocs exactes.',en:'The image is not uploaded. Exifr for metadata, Human for faces, DETR for objects, CLIP for broad scene categories, and OCR data download on first use. This may take time and data; models are cached in your browser. CLIP does not identify exact addresses or places.'},
  githubHumanSource:{ca:'Detector de rostres: <a href="https://github.com/vladmandic/human" target="_blank" rel="noopener">Human a GitHub · llicència MIT ↗</a>',en:'Face detector: <a href="https://github.com/vladmandic/human" target="_blank" rel="noopener">Human on GitHub · MIT license ↗</a>'},
  project: {
    ca:'[ projecte de síntesi · Sergi + Hugo ]',
    en:'[ synthesis project · Sergi + Hugo ]'
  },
  heroTitle: {
    ca:'Abans de publicar,<br><span>atura’t un moment.</span>',
    en:'Before you post,<br><span>take a moment.</span>'
  },
  heroDesc: {
    ca:'Aprèn quina informació comparteixes, què guarden les galetes i què pot veure una pàgina web del teu navegador.',
    en:'Learn what information you share, what cookies store, and what a website can see about your browser.'
  },
  tryFilter: {
    ca:'Prova el filtre →',
    en:'Try the checker →'
  },
  learnCookies: {
    ca:'Veure les galetes',
    en:'Explore cookies'
  },
  nav: {
    ca:'NAVEGACIÓ',
    en:'NAVIGATION'
  },
  oversharingTitle: {
    ca:'Què vol dir compartir massa?',
    en:'What does oversharing mean?'
  },
  oversharingSub: {
    ca:'Explicar o mostrar més informació personal de la que volies.',
    en:'Sharing more personal information than you meant to.'
  },
  casesTitle: {
    ca:'Quan algú fa servir la informació',
    en:'When someone misuses information'
  },
  cookiesTitle: {
    ca:'Galetes: què són i com funcionen',
    en:'Cookies: what they are and how they work'
  },
  cookiesSub: {
    ca:'Són petites dades que un lloc web desa al navegador.',
    en:'Small pieces of data a website stores in your browser.'
  },
  imageTitle: {
    ca:'Revisa la privacitat de la imatge',
    en:'Check your image privacy'
  },
  sourcesTitle: {
    ca:'Fonts i enllaços',
    en:'Sources and links'
  },
  sourcesDesc: {
    ca:'Documentació institucional i periodisme de primera mà consultats per a aquesta pàgina.',
    en:'Institutional sources and first-hand journalism consulted for this page.'
  },
  tryFilter: {
    ca:'Prova el filtre →',
    en:'Try the checker →'
  },
  learnCookies: {
    ca:'Veure les galetes',
    en:'Explore cookies'
  },
  imageTitle: {
    ca:'Revisió de privacitat // revisa la imatge',
    en:'Privacy check // review your image'
  },
  kidsIntro: {
    ca:'Consells senzills per navegar amb més seguretat. No ho has de resoldre tot sol o sola.',
    en:'Simple tips for using the internet more safely. You do not have to figure everything out alone.'
  },
  kidsWelcomeTitle: {
    ca:'La teva privacitat és important',
    en:'Your privacy matters'
  },
  kidsWelcomeText: {
    ca:'Internet pot ser divertit. Si alguna cosa et fa sentir estrany o incòmode, atura’t i explica-ho a una persona adulta de confiança.',
    en:'The internet can be fun. If something feels strange or uncomfortable, stop and tell a trusted adult.'
  },
  kidsCard1Title: {
    ca:'Protegeix les teves dades',
    en:'Keep your details private'
  },
  kidsCard1Text: {
    ca:'No publiquis la teva adreça, telèfon, escola, contrasenyes ni on ets ara.',
    en:'Do not post your address, phone number, school, passwords, or where you are right now.'
  },
  kidsCard2Title: {
    ca:'Pensa abans d’enviar',
    en:'Think before you send'
  },
  kidsCard2Text: {
    ca:'Una foto o un missatge es pot copiar. Si no vols que altres persones el vegin, no el comparteixis.',
    en:'A photo or message can be copied. If you do not want others to see it, do not share it.'
  },
  kidsCard3Title: {
    ca:'Pots dir que no',
    en:'You can say no'
  },
  kidsCard3Text: {
    ca:'No has de respondre a qui et demani secrets, fotos o dades personals.',
    en:'You do not have to answer anyone asking for secrets, photos, or personal details.'
  },
  kidsQuizLabel: {
    ca:'✦ PETIT QÜESTIONARI',
    en:'✦ QUICK CHECK'
  },
  kidsQuizTitle: {
    ca:'Abans de compartir, revisa això',
    en:'Before you share, check this'
  },
  kidsQuizQuestion: {
    ca:'Respon quatre preguntes. No hi escriguis cap dada personal.',
    en:'Answer four questions. Do not enter any personal details.'
  },
  kidsQuizPrivacyNote: {
    ca:'No hi posis dades personals. Les respostes no es desen.',
    en:'Do not enter personal details. Your answers are not saved.'
  },
  kidsReminder: {
    ca:'Si algú t’espanta, et pressiona o et demana guardar un secret que et fa sentir incòmode: tanca la conversa i demana ajuda. No és culpa teva.',
    en:'If someone scares or pressures you, or asks you to keep a secret that feels wrong, close the chat and ask for help. It is not your fault.'
  },
  consoleBadge: {
    ca:'DEMO · LOCAL',
    en:'DEMO · LOCAL'
  },
  consoleHeading: {
    ca:'CONSOLA DE PRIVACITAT',
    en:'PRIVACY CONSOLE'
  },
  consoleTabSummary: {
    ca:'RESUM',
    en:'SUMMARY'
  },
  consoleTabBrowser: {
    ca:'NAVEGADOR',
    en:'BROWSER'
  },
  consoleTabCookies: {
    ca:'GALETES',
    en:'COOKIES'
  },
  consoleRun: {
    ca:'[ INICIA LA PROVA LOCAL ]',
    en:'[ RUN LOCAL DEMO ]'
  },
  consoleFootnote: {
    ca:'Les dades del navegador es llegeixen localment. La consulta de la IP és opcional.',
    en:'Browser details are read locally. Checking your IP is optional.'
  },
  consoleIpDisclosure: {
    ca:'Si la consultes, api.ipify.org rebrà la teva IP pública.',
    en:'If you check it, api.ipify.org will receive your public IP.'
  },
  consoleIpButton: {
    ca:'[ CONSULTA LA IP PÚBLICA ]',
    en:'[ CHECK PUBLIC IP ]'
  }
};
const transNodes=[...document.querySelectorAll('[data-i18n]')].map(el=>[el,el.innerHTML]);
// Traduccions de textos senzills que no tenen una clau data-i18n.
const plainDict= {
  'Al elegir una imagen, se revisan sus metadatos GPS y pistas de ubicación que puedan leerse, como direcciones o coordenadas.':['En triar una imatge, es revisen les metadades GPS i les pistes d’ubicació que es puguin llegir, com ara adreces o coordenades.','When you choose an image, its GPS metadata and readable location clues, such as addresses or coordinates, are checked.'],
  '06 / Kids Mode':['06 / Kids Mode',
    '06 / Kids Mode'],
  '02 / Casos reales':['02 / Casos reals',
    '02 / Real cases'],
  '03 / Cookies':['03 / Galetes',
    '03 / Cookies'],
  '04 / Filtro IA':['04 / Filtre de privacitat',
    '04 / Privacy check'],
  '05 / Fuentes':['05 / Fonts',
    '05 / Sources'],
  'Compartir de más es publicar información personal para más gente o durante más tiempo del que querías. Una foto o un comentario pueden parecer inofensivos, pero varios juntos pueden mostrar dónde estás, qué haces o quiénes son tus amigos.':['Compartir massa és publicar dades personals per a més gent o durant més temps del que volies. Una foto o un comentari poden semblar inofensius, però junts poden mostrar on ets, què fas o qui són els teus amics.',
    'Oversharing means sharing personal details with more people or for longer than you meant to. A photo or comment may seem harmless, but several can show where you are, what you do, or who your friends are.'],
  'Compartir no es malo por sí mismo. El problema es que otros pueden guardar y volver a compartir lo que publicas. Una foto puede enseñar tu escuela, tu casa o dónde estás ahora.':['Compartir no és dolent per si mateix. El problema és que altres persones poden desar i tornar a compartir el que publiques. Una foto pot mostrar la teva escola, casa o on ets ara.',
    'Sharing is not bad by itself. The problem is that others can save and reshare your posts. A photo may show your school, home, or current location.'],
  'UBICACIÓN':['UBICACIÓ',
    'LOCATION'],
  'IDENTIDAD':['IDENTITAT',
    'IDENTITY'],
  'CONTEXTO':['CONTEXT',
    'CONTEXT'],
  'Las fotos y rutinas pueden mostrar dónde estás o dónde sueles ir.':['Les fotos i rutines poden mostrar on ets o on acostumes a anar.',
    'Photos and routines can show where you are or where you often go.'],
  'Tu cumpleaños, escuela o familia pueden ayudar a alguien a hacerse pasar por ti.':['El teu aniversari, escola o família poden ajudar algú a fer-se passar per tu.',
    'Your birthday, school, or family details could help someone impersonate you.'],
  'Puede verla gente que no conoces, y alguien puede guardarla aunque la borres.':['La pot veure gent que no coneixes, i algú pot desar-la encara que l’esborris.',
    'People you do not know may see it, and someone can save it even if you delete it.'],
  'Dos ejemplos que aparecen en documentos oficiales de España.':['Dos exemples que apareixen en documents oficials d’Espanya.',
    'Two examples recorded in official Spanish documents.'],
  'Caso registrado por la AEPD · España':['Cas registrat per l’AEPD · Espanya',
    'Case recorded by the AEPD · Spain'],
  'Una menor suplantada en Facebook':['Suplantació d’una menor a Facebook',
    'A minor impersonated on Facebook'],
  'La memoria de la AEPD de 2012 recoge un caso en el que se investigó la suplantación de una menor en Facebook. Sirve para recordar que los datos y fotos que compartimos pueden ser copiados para crear perfiles falsos. La responsabilidad es de quien suplanta a otra persona.':['La memòria de l’AEPD del 2012 recull la investigació de la suplantació d’una menor a Facebook. Les dades i fotos compartides es poden copiar per crear perfils falsos. La responsabilitat és de qui suplanta una altra persona.',
    'The AEPD’s 2012 report records an investigation into the impersonation of a minor on Facebook. Shared details and photos can be copied to create fake profiles. The person doing the impersonation is responsible.'],
  'Fotos de familia publicadas sin permiso':['Fotos familiars publicades sense permís',
    'Family photos posted without permission'],
  'La misma memoria de la AEPD recoge el caso de un fotógrafo que publicó en su web fotos encargadas por una pareja, incluidas imágenes de su bebé. Las fotos identificables también son datos personales. El caso recuerda que publicar una imagen requiere cuidado y, según la situación, permiso.':['La mateixa memòria explica el cas d’un fotògraf que va publicar al seu web fotos encarregades per una parella, incloses imatges del seu nadó. Les fotos que identifiquen algú també són dades personals. Cal tenir cura i, segons el cas, demanar permís.',
    'The same report records a photographer who posted photos commissioned by a couple, including pictures of their baby. Photos that identify someone are personal data. Posting them requires care and, depending on the situation, permission.'],
  'Ver memoria oficial de la AEPD ↗':['Veure la memòria oficial de l’AEPD ↗',
    'Read the AEPD report ↗'],
  'Idea clave:':['Idea clau:',
    'Key point:'],
  'Compartir una foto no hace culpable a quien aparece en ella. La responsabilidad es de quien suplanta, acosa o publica sin permiso.':['Compartir una foto no fa culpable qui hi apareix. La responsabilitat és de qui suplanta, assetja o publica sense permís.',
    'Appearing in a photo does not make someone responsible for its misuse. The person who impersonates, harasses, or shares it without permission is responsible.'],
  'Cuando visitas una web, puede guardar un pequeño identificador en tu navegador. Al volver, tu navegador se lo enseña a esa web para recordar tu sesión o tus preferencias. Si una misma empresa aparece en varias webs, sus cookies pueden ayudarla a reconocer visitas en más de un sitio y mostrar anuncios personalizados.':['Quan visites un web, pot desar un petit identificador al navegador. Quan tornes, el navegador l’hi envia per recordar la sessió o les preferències. Si una empresa és present en diversos webs, les seves galetes poden ajudar-la a reconèixer visites i mostrar anuncis personalitzats.',
    'A website can save a small identifier in your browser. When you return, your browser sends it back so the site can remember your session or preferences. If the same company appears on several sites, its cookies may help recognize visits and show personalized ads.'],
  '¿Qué puede ver una web sobre tu navegador?':['Què pot veure un web del teu navegador?',
    'What can a website see about your browser?'],
  'La web recibe tu IP cuando te conectas. Las cookies ayudan a reconocer el mismo navegador. Pulsa para ver una simulación con datos de este navegador; la IP será un ejemplo inventado.':['El web rep la teva IP quan t’hi connectes. Les galetes poden reconèixer el mateix navegador. Prem per veure una simulació amb dades del navegador; la IP és inventada.',
    'A website receives your IP when you connect. Cookies can help recognize the same browser. Click to see a simulation using this browser’s details; the IP is made up.'],
  '[ Iniciar simulación local ]':['[ Inicia la simulació local ]',
    '[ Start local simulation ]'],
  'Quiero consultar mi IP pública. Para responder,':['Vull consultar la meva IP pública. Per respondre,',
    'I want to check my public IP. To respond,'],
  'api.ipify.org recibirá mi solicitud y mi IP':['api.ipify.org rebrà la meva sol·licitud i la meva IP',
    'api.ipify.org will receive my request and my IP'],
  'Esto no es necesario para la simulación.':['Això no cal per a la simulació.',
    'This is not needed for the simulation.'],
  '[ Consultar mi IP real ]':['[ Consulta la meva IP real ]',
    '[ Check my real IP ]'],
  'Sobre el servicio ipify ↗':['Sobre el servei ipify ↗',
    'About the ipify service ↗'],
  'Esperando… No se consultará ningún servicio externo.':['Esperant… No es consultarà cap servei extern.',
    'Waiting… No external service will be contacted.'],
  'El sitio guarda una cookie para recordar que has iniciado sesión. No necesita seguirte por otras webs.':['El lloc desa una galeta de sessió per recordar que has iniciat la sessió. No cal seguir-te per altres pàgines.',
    'The site saves a session cookie to remember that you signed in. It does not need to track you across other sites.'],
  'Esencial':['Bàsic',
    'Essential'],
  'Con rastreo':['Amb seguiment',
    'With tracking'],
  'El análisis es automático; el navegador puede no tener todos los detectores.':['Mira la imatge. Marca què hi apareix; el prototip mostrarà un avís orientatiu.',
    'Look at the image. Mark what you can see; the demo will show a rough warning.'],
  'Rostro/persona identificable':['Cara/persona identificable',
    'Identifiable face/person'],
  'Dirección, matrícula o documento':['Adreça, matrícula o document',
    'Address, license plate, or ID'],
  'Pantalla con mensajes/datos':['Pantalla amb missatges/dades',
    'Screen with messages/data'],
  'Ubicación o rutina reconocible':['Ubicació o rutina fàcil de reconèixer',
    'Recognizable location or routine'],
  'Menor de edad':['Menor d’edat',
    'Child or teenager'],
  '[ Evaluar señales visuales ]':['[ Revisa els senyals ]',
    '[ Check for warning signs ]'],
  'SIN IMAGEN CARGADA':['NO HI HA CAP IMATGE',
    'NO IMAGE LOADED'],
  '[ Seleccionar imagen ]':['[ Tria una imatge ]',
    '[ Choose an image ]'],
  'ARRASTRA UNA IMAGEN AQUÍ':['ARROSSEGA UNA IMATGE AQUÍ',
    'DROP AN IMAGE HERE'],
  'o selecciónala desde tu dispositivo · JPG, PNG, WebP':['o tria-la del dispositiu · JPG, PNG, WebP',
    'or choose one from your device · JPG, PNG, WebP'],
  '[ Eliminar metadatos y descargar ]':['[ Elimina metadades i baixa la còpia ]',
    '[ Remove metadata and download ]'],
  'Inspecciona metadatos y revisa qué detalles personales revela una imagen antes de compartirla.':['L’anàlisi comença quan tries una imatge. Revisa les metadades i busca senyals amb els detectors disponibles.',
    'The scan starts when you choose an image. It checks metadata and looks for warning signs using available detectors.'],
  'Fuentes y lecturas':['Fonts i enllaços',
    'Sources and links'],
  'Para llevarte:':['Recorda:',
    'Remember:'],
  '¿Qué es compartir de más?':['Què vol dir compartir massa?',
    'What is oversharing?'],
  'Es contar o enseñar más información personal de la que querías.':['És explicar o mostrar més informació personal de la que volies.',
    'Sharing more personal information than you meant to.'],
  'Abres una página':['Obres una pàgina',
    'You open a page'],
  'El navegador solicita contenido al servidor del sitio.':['El navegador demana el contingut al servidor del lloc.',
    'Your browser requests the page from its server.'],
  'Se guarda un dato':['Es desa una dada',
    'A small piece of data is saved'],
  'El sitio puede pedir guardar un identificador o preferencia.':['El lloc pot desar un identificador o una preferència.',
    'The site may save an identifier or preference.'],
  'El navegador lo devuelve':['El navegador l’envia de tornada',
    'Your browser sends it back'],
  'En otra petición al dominio, la cookie puede reconocer la sesión.':['En una altra petició, la galeta pot reconèixer la sessió.',
    'On another request, the cookie can recognize your session.'],
  'Se interpreta la actividad':['S’interpreta l’activitat',
    'Activity is interpreted'],
  'Cookies y otras tecnologías pueden apoyar medición y seguimiento.':['Les galetes i altres tecnologies poden mesurar i seguir l’activitat.',
    'Cookies and other tools can measure and track activity.'],
  '01 / VISITA':['01 / VISITA',
    '01 / VISIT'],
  '02 / RESPUESTA':['02 / RESPOSTA',
    '02 / RESPONSE'],
  '03 / REGRESO':['03 / RETORN',
    '03 / RETURN'],
  '04 / SEÑALES':['04 / SENYALS',
    '04 / SIGNALS'],
  'Bloquear cookies de terceros reduce algunas formas de seguimiento, pero no elimina todo el rastreo: existen píxeles, scripts, almacenamiento local y técnicas de huella digital. Los controles del navegador y las opciones de privacidad ayudan, pero no equivalen a anonimato.':['Bloquejar galetes de tercers redueix algunes formes de seguiment, però no l’elimina del tot. També hi ha píxels, scripts i altres tècniques. Els controls del navegador ajuden, però no et fan anònim.',
    'Blocking third-party cookies reduces some tracking, but does not stop it all. Pixels, scripts, and other techniques exist too. Browser privacy controls help, but do not make you anonymous.'],
  'Fuentes y lecturas':['Fonts i enllaços',
    'Sources and links'],
  'AEPD · Memoria anual de 2012, casos en redes e imágenes ↗':['AEPD · Memòria anual de 2012, casos de xarxes i imatges ↗',
    'AEPD · 2012 report on social media and images ↗'],
  'AEPD · Qué hacer si difunden imágenes tuyas ↗':['AEPD · Què fer si difonen imatges teves ↗',
    'AEPD · What to do if someone shares your images ↗'],
  'FTC · Cookies explicadas en español ↗':['FTC · Explicació de les galetes en castellà ↗',
    'FTC · Cookies explained in Spanish ↗'],
  'FTC · Cómo recogen información las páginas web ↗':['FTC · Com recullen informació els llocs web ↗',
    'FTC · How websites collect information ↗'],
  'Para llevarte: comparte con intención, revisa quién puede ver una publicación y considera esperar antes de mostrar tu ubicación en tiempo real. La privacidad no consiste en desaparecer: consiste en elegir qué revelar y a quién.':['Recorda: comparteix amb cura, revisa qui pot veure les publicacions i espera abans de mostrar la ubicació en temps real. La privacitat és triar què expliques i a qui.',
    'Remember: share thoughtfully, check who can see your posts, and wait before showing your live location. Privacy means choosing what to share and with whom.'],
  'Fuentes':['Fonts',
    'Sources'],
  'NAVEGACIÓN':['NAVEGACIÓ',
    'NAVIGATION'],
  'IDIOMA':['IDIOMA',
    'LANGUAGE'],
  'COLOR':['COLOR',
    'COLOR'],
  'SISTEMA ACTIVO':['SISTEMA ACTIU',
    'SYSTEM ACTIVE'],
  'El análisis empieza al elegir una imagen. Revisa metadatos y busca señales con los detectores disponibles.':['Mira la imatge, marca les dades personals que hi veus i revisa les metadades.',
    'Look at the image, mark personal details you can see, and review its metadata.'],
  'el análisis se ejecuta en tu navegador. Lee metadatos y usa detectores de rostros, texto y códigos si están disponibles. No envía la imagen. No es un modelo de IA y puede pasar por alto detalles.':['aquesta prova funciona al navegador. Llegeix algunes metadades i et deixa marcar el que veus. No reconeix automàticament el contingut de la foto ni l’envia a internet.',
    'this demo runs in your browser. It reads some image metadata and lets you mark what you see. It does not automatically recognize the photo or send it online.'],
  '¿Qué puede ver una web sobre tu navegador?':['Què pot veure un web del teu navegador?',
    'What can a website see about your browser?']
};
const plainNodes=[];
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(walker.nextNode()) {
  const node=walker.currentNode;
  if(node.nodeValue.trim()&&!node.parentElement.closest('[data-i18n]'))plainNodes.push([node,node.nodeValue])
}
// Actualitza els textos visibles i desa l’idioma triat.
function setLang(lang) {
  document.documentElement.lang=lang;
  transNodes.forEach(([el,original])=> {
    const key=el.dataset.i18n; el.innerHTML=lang==='es'?original:(i18n[key]?.[lang]||original)
  });
  plainNodes.forEach(([node,original])=> {
    const t=original.trim(),localized=plainDict[t]; if(localized)node.nodeValue=original.replace(t,lang==='es'?t:(localized[lang==='ca'?0:1]||t))
  });
  setPref('filtro-lang',lang);
  if(document.body.classList.contains('light'))themeToggle.textContent=lang==='ca'?'☾ FOSC':lang==='en'?'☾ DARK':'☾ OSCURO';
  else themeToggle.textContent=lang==='ca'?'☼ CLAR':lang==='en'?'☼ LIGHT':'☼ CLARO'
}
langSelect.value=getPref('filtro-lang','es');
langSelect.addEventListener('change',()=>setLang(langSelect.value));
setLang(langSelect.value);
function setTheme(mode) {
  document.body.classList.toggle('light',mode==='light');
  document.documentElement.dataset.theme=mode;
  themeToggle.textContent=mode==='light'?(langSelect.value==='ca'?'☾ FOSC':langSelect.value==='en'?'☾ DARK':'☾ OSCURO'):(langSelect.value==='ca'?'☼ CLAR':langSelect.value==='en'?'☼ LIGHT':'☼ CLARO');
  setPref('filtro-theme',mode)
}
themeToggle.addEventListener('click',()=>setTheme(document.body.classList.contains('light')?'dark':'light'));
setTheme(getPref('filtro-theme','light'));
accentColor.value=getPref('filtro-accent','#b5ff6a');
function applyAccent(color) {
  document.documentElement.style.setProperty('--green',color);
  document.documentElement.style.setProperty('--mint',color);
  setPref('filtro-accent',color)
}
accentColor.addEventListener('input',()=>applyAccent(accentColor.value));
applyAccent(accentColor.value);
// Animacions que es repeteixen en entrar i sortir de la pantalla en desplaçar-se.
const revealTargets=document.querySelectorAll('.hero-copy,.hero-terminal,.side,.section-head,.card,.case,.step,.tracking-demo,.image-grid,.visual-check,.sources a');
if('IntersectionObserver'in window) {
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=> {
    entry.target.classList.toggle('is-visible',entry.isIntersecting)
  }), {
    threshold:.12
  });
  revealTargets.forEach((el,i)=> {
    el.classList.add('reveal'); const chars=el.textContent.trim().length; el.style.setProperty('--typing-steps',Math.max(16,Math.min(chars,80))); el.style.setProperty('--typing-duration',Math.max(.3,Math.min(chars*.004,1))+'s'); el.style.setProperty('--reveal-delay',Math.min(i%4,3)*65+'ms'); revealObserver.observe(el)
  })
} else revealTargets.forEach(el=>el.classList.add('is-visible'));
// Consola interactiva: dades locals i exemples de galetes fictícies.
const consoleTabs=[...document.querySelectorAll('.console-tab')];
const consoleTitle=document.getElementById('consoleTitle');
const consoleDescription=document.getElementById('consoleDescription');
const consoleStats=document.getElementById('consoleStats');
const consoleStage=document.getElementById('consoleStage');
const terminalRun=document.getElementById('runTerminalDemo');
const terminalRunOutput=document.getElementById('terminalRunOutput');
let activeConsole='summary';
let publicIpValue=null;
const consoleIpConsent=document.getElementById('consoleIpConsent'),consoleIpButton=document.getElementById('consoleIpButton');
const consoleViews= {
  summary: {
    title: {
      es:'Revisión rápida',
      ca:'Revisió ràpida',
      en:'Quick check'
    },
    description: {
      es:'Datos visibles en esta demostración local.',
      ca:'Dades visibles en aquesta demostració local.',
      en:'Details visible in this local demo.'
    }
  },
  browser: {
    title: {
      es:'Datos de este navegador',
      ca:'Dades d’aquest navegador',
      en:'This browser’s details'
    },
    description: {
      es:'Se leen aquí mismo; no se envían a ningún servidor.',
      ca:'Es llegeixen aquí mateix; no s’envien a cap servidor.',
      en:'Read on this device; nothing is sent to a server.'
    }
  },
  cookies: {
    title: {
      es:'Una cookie de ejemplo',
      ca:'Una galeta d’exemple',
      en:'A sample cookie'
    },
    description: {
      es:'Ejemplo ficticio: esta demo no crea una cookie real.',
      ca:'Exemple inventat: aquesta demo no crea cap galeta real.',
      en:'Fictional example: this demo does not create a real cookie.'
    }
  }
};
const consoleCopy= {
  es: {
    run:'[ INICIAR PRUEBA LOCAL ]',
    again:'[ VOLVER A EJECUTAR ]',
    waiting:'Pulsa el botón para ver resultados de esta prueba local.',
    summary:[['IP PÚBLICA',
        'NO CONSULTADA'],
      ['IMAGEN',
        'NO ENVIADA'],
      ['RED',
        'SIN PETICIONES']],
    browser:()=>[['IDIOMA',
        navigator.language||'No disponible'],
      ['PANTALLA',
        `${screen.width} × ${screen.height} px`],
      ['ZONA HORARIA',
        Intl.DateTimeFormat().resolvedOptions().timeZone||'No disponible']],
    cookies:[['IDENTIFICADOR',
        'FICTICIO'],
      ['DURACIÓN',
        'DEPENDE DEL SITIO'],
      ['SEGUIMIENTO',
        'NO SIMULADO']],
    lines: {
      summary:()=>['> prueba local completada',
        '> imagen: no enviada',
        '> petición externa: ninguna',
        '> IP pública: no consultada',
        '> una web puede ver tu IP al conectarte'],
      browser:()=>['> idioma: '+(navigator.language||'no disponible'),
        '> pantalla: '+screen.width+' × '+screen.height+' px',
        '> zona horaria: '+(Intl.DateTimeFormat().resolvedOptions().timeZone||'no disponible'),
        '> navegador: '+(navigator.userAgent||'no disponible').slice(0,110),
        '> datos leídos localmente; no enviados'],
      cookies:()=>['> cookie de ejemplo: visitante_demo',
        '> valor: '+consoleCookieId,
        '> podría recordar una sesión o preferencia',
        '> esta demo no ha guardado una cookie real',
        '> seguimiento entre webs: no simulado']
    }
  },
  ca: {
    run:'[ INICIA LA PROVA LOCAL ]',
    again:'[ TORNA A EXECUTAR ]',
    waiting:'Prem el botó per veure els resultats d’aquesta prova local.',
    summary:[['IP PÚBLICA',
        'NO CONSULTADA'],
      ['IMATGE',
        'NO ENVIADA'],
      ['XARXA',
        'SENSE PETICIONS']],
    browser:()=>[['IDIOMA',
        navigator.language||'No disponible'],
      ['PANTALLA',
        `${screen.width} × ${screen.height} px`],
      ['ZONA HORÀRIA',
        Intl.DateTimeFormat().resolvedOptions().timeZone||'No disponible']],
    cookies:[['IDENTIFICADOR',
        'INVENTAT'],
      ['DURADA',
        'DEPÈN DEL LLOC'],
      ['SEGUIMENT',
        'NO SIMULAT']],
    lines: {
      summary:()=>['> prova local completada',
        '> imatge: no enviada',
        '> petició externa: cap',
        '> IP pública: no consultada',
        '> un web pot veure la teva IP quan t’hi connectes'],
      browser:()=>['> idioma: '+(navigator.language||'no disponible'),
        '> pantalla: '+screen.width+' × '+screen.height+' px',
        '> zona horària: '+(Intl.DateTimeFormat().resolvedOptions().timeZone||'no disponible'),
        '> navegador: '+(navigator.userAgent||'no disponible').slice(0,110),
        '> dades llegides localment; no enviades'],
      cookies:()=>['> galeta d’exemple: visitant_demo',
        '> valor: '+consoleCookieId,
        '> podria recordar una sessió o preferència',
        '> aquesta demo no ha desat cap galeta real',
        '> seguiment entre webs: no simulat']
    }
  },
  en: {
    run:'[ RUN LOCAL DEMO ]',
    again:'[ RUN AGAIN ]',
    waiting:'Press the button to see this local test’s results.',
    summary:[['PUBLIC IP',
        'NOT CHECKED'],
      ['IMAGE',
        'NOT SENT'],
      ['NETWORK',
        'NO REQUESTS']],
    browser:()=>[['LANGUAGE',
        navigator.language||'Unavailable'],
      ['SCREEN',
        `${screen.width} × ${screen.height} px`],
      ['TIME ZONE',
        Intl.DateTimeFormat().resolvedOptions().timeZone||'Unavailable']],
    cookies:[['IDENTIFIER',
        'FICTIONAL'],
      ['LIFETIME',
        'SITE DEPENDENT'],
      ['TRACKING',
        'NOT SIMULATED']],
    lines: {
      summary:()=>['> local test complete',
        '> image: not sent',
        '> external request: none',
        '> public IP: not checked',
        '> a website can see your IP when you connect'],
      browser:()=>['> language: '+(navigator.language||'unavailable'),
        '> screen: '+screen.width+' × '+screen.height+' px',
        '> time zone: '+(Intl.DateTimeFormat().resolvedOptions().timeZone||'unavailable'),
        '> browser: '+(navigator.userAgent||'unavailable').slice(0,110),
        '> read locally; not sent'],
      cookies:()=>['> sample cookie: demo_visitor',
        '> value: '+consoleCookieId,
        '> could remember a session or preference',
        '> this demo did not save a real cookie',
        '> cross-site tracking: not simulated']
    }
  }
};
const consoleCookieId='demo_'+Math.random().toString(36).slice(2,8);
function renderConsole(which) {
  activeConsole=which;
  const lang=langSelect.value||'es',
  copy=consoleCopy[lang]||consoleCopy.es,
  view=consoleViews[which];
  consoleTabs.forEach(tab=> {
    const active=tab.dataset.console===which; tab.classList.toggle('active',active); tab.setAttribute('aria-selected',String(active)); tab.tabIndex=active?0:-1
  });
  consoleTitle.textContent=view.title[lang]||view.title.es;
  consoleDescription.textContent=view.description[lang]||view.description.es;
  const stats=typeof copy[which]==='function'?copy[which]():copy[which];
  if(which==='summary')stats[0][1]=publicIpValue||( {
    es:'PIDE PERMISO',ca:'DEMANA PERMÍS',en:'CONSENT REQUIRED'
  }
  [lang]||'CONSENT REQUIRED');
  consoleStats.replaceChildren();
  stats.forEach(([label,value])=> {
    const card=document.createElement('div'),a=document.createElement('span'),b=document.createElement('b'); card.className='console-stat'; a.textContent=label; b.textContent=value; card.append(a,b); consoleStats.append(card)
  });
  terminalRunOutput.textContent=copy.waiting;
  terminalRun.textContent=copy.run;
  consoleStage.classList.remove('is-changing');
  requestAnimationFrame(()=>consoleStage.classList.add('is-changing'));
}
consoleTabs.forEach(tab=>tab.addEventListener('click',()=>renderConsole(tab.dataset.console)));
consoleTabs.forEach((tab,index)=>tab.addEventListener('keydown',event=> {
  if(event.key==='ArrowRight'||event.key==='ArrowLeft') {
    event.preventDefault(); const next=(index+(event.key==='ArrowRight'?1:-1)+consoleTabs.length)%consoleTabs.length; consoleTabs[next].focus(); renderConsole(consoleTabs[next].dataset.console)
  }
}));
langSelect.addEventListener('change',()=>renderConsole(activeConsole));
renderConsole(activeConsole);
consoleIpConsent.addEventListener('change',()=> {
  setDisabled(consoleIpButton,!consoleIpConsent.checked); if(!consoleIpConsent.checked) {
    publicIpValue=null; if(activeConsole==='summary')renderConsole('summary')
  }
});
consoleIpButton.addEventListener('click',async()=> {
  if(!consoleIpConsent.checked)return;
  setDisabled(consoleIpButton,true); consoleIpButton.textContent=langSelect.value==='ca'?'[ CONSULTANT… ]':langSelect.value==='en'?'[ CHECKING… ]':'[ CONSULTANDO… ]';
  terminalRunOutput.textContent=langSelect.value==='ca'?'Consultant api.ipify.org. Aquest servei rep la teva IP.':langSelect.value==='en'?'Contacting api.ipify.org. This service receives your IP.':'Consultando api.ipify.org. Este servicio recibe tu IP.';
  try {
    const response=await fetch('https://api.ipify.org?format=json', {
      mode:'cors',cache:'no-store'
    }); if(!response.ok)throw new Error('No se pudo consultar'); const data=await response.json(); if(!data.ip)throw new Error('Respuesta sin IP'); publicIpValue=data.ip; renderConsole(activeConsole); if(activeConsole!=='summary')terminalRunOutput.textContent=(langSelect.value==='ca'?'IP pública: ':langSelect.value==='en'?'Public IP: ':'IP pública: ')+data.ip
  }
  catch(error) {
    terminalRunOutput.textContent=langSelect.value==='ca'?'No s’ha pogut obtenir la IP.':'No se pudo obtener la IP. Prueba de nuevo.'
  }
  finally {
    setDisabled(consoleIpButton,!consoleIpConsent.checked); consoleIpButton.textContent=langSelect.value==='ca'?'[ CONSULTA LA IP PÚBLICA ]':langSelect.value==='en'?'[ CHECK PUBLIC IP ]':'[ CONSULTAR IP PÚBLICA ]'
  }
});
terminalRun.addEventListener('click',async()=> {
  if(terminalRun.hasAttribute('disabled'))return;
  setDisabled(terminalRun,true); terminalRunOutput.replaceChildren();
  const lang=langSelect.value||'es',copy=consoleCopy[lang]||consoleCopy.es,lines=copy.lines[activeConsole]();
  for(const command of lines) {
    const row=document.createElement('div'); row.className='line'; row.textContent=command; terminalRunOutput.append(row); await new Promise(resolve=>setTimeout(resolve,150))
  }
  setDisabled(terminalRun,false); terminalRun.textContent=copy.again;
});
// Animació en canviar entre els modes del simulador de galetes.
document.querySelectorAll('.switches button').forEach(button=>button.addEventListener('click',()=> {
  const output=document.getElementById('cookieOutput'); output.classList.add('changing'); setTimeout(()=> {
    output.classList.remove('changing'); document.getElementById('cookieChips').querySelectorAll('.chip').forEach(chip=> {
      chip.style.animation='none'; requestAnimationFrame(()=>chip.style.animation='')
    })
  },180)
}));
// Barra de lectura i ressaltat de la secció actual.
const progressBar=document.getElementById('readProgressBar');
let progressPending=false;
function updateReadingProgress() {
  if(progressPending)return;
  progressPending=true;
  requestAnimationFrame(()=> {
    const max=document.documentElement.scrollHeight-innerHeight; progressBar.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%'; progressPending=false
  })
}
addEventListener('scroll',updateReadingProgress, {
  passive:true
});
addEventListener('resize',updateReadingProgress);
updateReadingProgress();
// Marca la secció que ocupa el punt mig de la zona visible.
const pageSections=[...document.querySelectorAll('main section[id]')];
function updateActiveSection() {
  const marker=innerHeight*0.5;
  let current=pageSections[0];
  pageSections.forEach(section=> {
    if(section.hidden)return;
    if(section.getBoundingClientRect().top<=marker)current=section
  });
  document.querySelectorAll('.side a.active').forEach(link=>link.classList.remove('active'));
  const activeLink=document.querySelector('.side a[href="#'+current.id+'"]');
  if(activeLink)activeLink.classList.add('active')
}
addEventListener('scroll',updateActiveSection, {
  passive:true
});
addEventListener('resize',updateActiveSection);
updateActiveSection();
// Efecte visual en prémer els botons.
document.querySelectorAll('.btn,.top-button,.terminal-run').forEach(el=>el.addEventListener('pointerdown',event=> {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return; const rect=el.getBoundingClientRect(),dot=document.createElement('i'),size=Math.max(rect.width,rect.height); dot.className='ripple-dot'; dot.style.width=dot.style.height=size+'px'; dot.style.left=event.clientX-rect.left-size/2+'px'; dot.style.top=event.clientY-rect.top-size/2+'px'; el.append(dot); setTimeout(()=>dot.remove(),600)
}));
// Kids Mode: mostra o amaga la secció de consells per a infants.
const kidsModeButton=document.getElementById('kidsModeButton'),kidsSection=document.getElementById('kids-mode'),kidsModeStatus=document.getElementById('kidsModeStatus');
function setKidsMode(active) {
  document.body.classList.toggle('kids-mode',active);
  kidsSection.hidden=!active;
  kidsModeButton.setAttribute('aria-pressed',String(active));
  kidsModeButton.textContent=active?'Kids Mode ✓':'Kids Mode';
  kidsModeStatus.textContent=active?(langSelect.value==='ca'?'Kids Mode està activat. Torna a prémer el botó per sortir.':langSelect.value==='en'?'Kids Mode is on. Press the button again to exit.':'Kids Mode está activado. Puedes volver a pulsar el botón para salir.'):'';
  if(active)kidsSection.scrollIntoView( {
    behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'
  });
  else document.querySelector('#oversharing').scrollIntoView( {
    behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'
  })
}
kidsModeButton.addEventListener('click',()=>setKidsMode(!document.body.classList.contains('kids-mode')));
document.querySelector('.kids-link').addEventListener('click',event=> {
  event.preventDefault(); setKidsMode(true)
});
if(location.hash==='#kids-mode')setKidsMode(true);
// Qüestionari breu: les respostes només viuen a la memòria d'aquesta pàgina.
const kidsQuizQuestion=document.getElementById('kidsQuizQuestion');
const kidsQuizProgress=document.getElementById('kidsQuizProgress');
const kidsQuizProgressLabel=document.getElementById('kidsQuizProgressLabel');
const kidsQuizOptions=document.getElementById('kidsQuizOptions');
const kidsQuizBack=document.getElementById('kidsQuizBack');
const kidsQuizNext=document.getElementById('kidsQuizNext');
const kidsQuizReset=document.getElementById('kidsQuizReset');
const quizFeedback=document.getElementById('quizFeedback');
let kidsQuizIndex=0;
let kidsQuizAnswers=[];
let kidsQuizFinished=false;

const kidsQuizContent={
  es:{
    progress:'Pregunta {n} de 4',back:'← Atrás',next:'Siguiente →',finish:'Ver mis consejos',restart:'Volver a empezar',
    questions:[
      {text:'¿Aparece algún dato privado, como tu dirección, colegio, teléfono o contraseña?',answers:['Sí, aparece al menos uno','No','No estoy seguro/a'],scores:[2,0,1]},
      {text:'¿La foto muestra dónde estás ahora, tu rutina o a otra persona?',answers:['Sí, o quizá','No','No estoy seguro/a'],scores:[2,0,1]},
      {text:'¿Sabes quién verá la publicación?',answers:['Sí, solo las personas que he elegido','No, podría verla cualquiera','No estoy seguro/a'],scores:[0,2,1]},
      {text:'¿Alguien te presiona, te pide una foto o te dice que lo mantengas en secreto?',answers:['Sí, o me hace sentir incómodo/a','No','No estoy seguro/a'],scores:[2,0,1]}
    ],
    results:{
      stop:{title:'PARA Y NO LO COMPARTAS',text:'Tus respuestas muestran varias señales de riesgo. No envíes nada: cierra el chat y cuéntaselo a una persona adulta de confianza. Si te presionan, bloquea y pide ayuda. No es culpa tuya.'},
      pause:{title:'ESPERA Y PIDE AYUDA',text:'Hay algo que no está claro. Enséñaselo a una persona adulta de confianza, tapa los datos privados y revisa quién verá la publicación. Si sigues con dudas, no lo envíes.'},
      review:{title:'HAZ UNA ÚLTIMA REVISIÓN',text:'No has marcado señales claras, pero cuida tus datos: no compartas contraseñas, dirección, colegio ni dónde estás ahora. Pide permiso antes de publicar una foto de otra persona. Si tienes dudas, no la compartas.'}
    }
  },
  ca:{
    progress:'Pregunta {n} de 4',back:'← Enrere',next:'Següent →',finish:'Veure els meus consells',restart:'Torna a començar',
    questions:[
      {text:'Hi surt alguna dada privada, com ara l’adreça, l’escola, el telèfon o una contrasenya?',answers:['Sí, n’hi surt alguna','No','No n’estic segur/a'],scores:[2,0,1]},
      {text:'A la foto es veu on ets ara, la teva rutina o una altra persona?',answers:['Sí, o potser','No','No n’estic segur/a'],scores:[2,0,1]},
      {text:'Saps qui veurà la publicació?',answers:['Sí, només les persones que he triat','No, la podria veure tothom','No n’estic segur/a'],scores:[0,2,1]},
      {text:'Algú t’insisteix, et demana una foto o et diu que no ho expliquis?',answers:['Sí, o em fa sentir incòmode/a','No','No n’estic segur/a'],scores:[2,0,1]}
    ],
    results:{
      stop:{title:'ATURA’T I NO HO COMPARTEIXIS',text:'Les respostes mostren diversos senyals de risc. No enviïs res: tanca el xat i explica-ho a una persona adulta de confiança. Si t’insisteixen, bloqueja la persona i demana ajuda. No és culpa teva.'},
      pause:{title:'ESPERA I DEMANA AJUDA',text:'Hi ha alguna cosa que no és clara. Ensenya-ho a una persona adulta de confiança, tapa les dades privades i revisa qui veurà la publicació. Si encara tens dubtes, no ho enviïs.'},
      review:{title:'FES UNA ÚLTIMA REVISIÓ',text:'No has marcat cap senyal clar, però protegeix les teves dades: no comparteixis contrasenyes, adreça, escola ni on ets ara. Demana permís abans de publicar una foto d’una altra persona. Si tens dubtes, no la comparteixis.'}
    }
  },
  en:{
    progress:'Question {n} of 4',back:'← Back',next:'Next →',finish:'Show my tips',restart:'Start again',
    questions:[
      {text:'Does it show private details such as your address, school, phone number, or password?',answers:['Yes, at least one detail','No','I’m not sure'],scores:[2,0,1]},
      {text:'Does the photo show where you are now, your routine, or another person?',answers:['Yes, or maybe','No','I’m not sure'],scores:[2,0,1]},
      {text:'Do you know who will see the post?',answers:['Yes, only people I chose','No, anyone could see it','I’m not sure'],scores:[0,2,1]},
      {text:'Is someone pressuring you, asking for a photo, or telling you to keep it secret?',answers:['Yes, or it makes me uncomfortable','No','I’m not sure'],scores:[2,0,1]}
    ],
    results:{
      stop:{title:'STOP AND DON’T SHARE IT',text:'Your answers show several warning signs. Do not send anything: close the chat and tell a trusted adult. If someone is pressuring you, block them and ask for help. This is not your fault.'},
      pause:{title:'WAIT AND ASK FOR HELP',text:'Something is unclear. Show it to a trusted adult, hide private details, and check who can see the post. If you still have doubts, do not send it.'},
      review:{title:'DO ONE LAST CHECK',text:'You did not mark any clear warning signs, but protect your details: never share passwords, your address, school, or live location. Ask before posting someone else’s photo. If you are unsure, don’t share it.'}
    }
  }
};

function renderKidsQuiz({focusFirstAnswer=false}={}) {
  const lang=kidsQuizContent[langSelect.value]?langSelect.value:'es';
  const copy=kidsQuizContent[lang];
  quizFeedback.textContent='';
  quizFeedback.classList.remove('quiz-result-stop','quiz-result-pause','quiz-result-review');
  if(kidsQuizFinished) {
    const score=kidsQuizAnswers.reduce((sum,answer,index)=>sum+kidsQuizContent[lang].questions[index].scores[answer],0);
    const result=score>=4?copy.results.stop:score>0?copy.results.pause:copy.results.review;
    kidsQuizQuestion.textContent=result.title;
    quizFeedback.textContent=result.text;
    quizFeedback.classList.add(score>=4?'quiz-result-stop':score>0?'quiz-result-pause':'quiz-result-review');
    kidsQuizProgress.hidden=true;
    kidsQuizOptions.hidden=true;
    kidsQuizBack.hidden=true;
    kidsQuizNext.hidden=true;
    kidsQuizReset.hidden=false;
    return
  }
  const question=copy.questions[kidsQuizIndex];
  const selected=kidsQuizAnswers[kidsQuizIndex];
  kidsQuizQuestion.textContent=question.text;
  kidsQuizProgress.hidden=false;
  kidsQuizProgress.value=kidsQuizIndex+1;
  kidsQuizProgressLabel.textContent=copy.progress.replace('{n}',String(kidsQuizIndex+1));
  kidsQuizOptions.hidden=false;
  kidsQuizOptions.replaceChildren();
  question.answers.forEach((answer,index)=> {
    const option=document.createElement('lumen-button');
    option.className='quiz-choice';
    option.setAttribute('variant','secondary');
    option.setAttribute('type','button');
    option.setAttribute('aria-pressed',String(selected===index));
    option.textContent=answer;
    if(selected===index)option.classList.add('selected-answer');
    option.addEventListener('click',()=> {
      kidsQuizAnswers[kidsQuizIndex]=index;
      kidsQuizOptions.querySelectorAll('.quiz-choice').forEach((item,itemIndex)=> {
        const isSelected=itemIndex===index;
        item.classList.toggle('selected-answer',isSelected);
        item.setAttribute('aria-pressed',String(isSelected))
      });
      setDisabled(kidsQuizNext,false)
    });
    kidsQuizOptions.append(option)
  });
  kidsQuizBack.hidden=false;
  setDisabled(kidsQuizBack,kidsQuizIndex===0);
  kidsQuizNext.hidden=false;
  kidsQuizNext.textContent=kidsQuizIndex===copy.questions.length-1?copy.finish:copy.next;
  setDisabled(kidsQuizNext,selected===undefined);
  kidsQuizReset.hidden=true;
  if(focusFirstAnswer)kidsQuizOptions.querySelector('.quiz-choice')?.focus()
}

kidsQuizBack.addEventListener('click',()=> {
  if(kidsQuizIndex===0)return;
  kidsQuizIndex--;
  renderKidsQuiz({focusFirstAnswer:true})
});
kidsQuizNext.addEventListener('click',()=> {
  if(kidsQuizNext.hasAttribute('disabled'))return;
  if(kidsQuizIndex<kidsQuizContent.es.questions.length-1) {
    kidsQuizIndex++;
    renderKidsQuiz({focusFirstAnswer:true})
  } else {
    kidsQuizFinished=true;
    renderKidsQuiz();
    kidsQuizQuestion.focus()
  }
});
kidsQuizReset.addEventListener('click',()=> {
  kidsQuizIndex=0;
  kidsQuizAnswers=[];
  kidsQuizFinished=false;
  renderKidsQuiz();
  kidsQuizOptions.querySelector('.quiz-choice')?.focus()
});
langSelect.addEventListener('change',()=>renderKidsQuiz());
renderKidsQuiz();
