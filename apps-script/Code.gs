/**
 * Bitácora Vehículo — backend en Google Apps Script + Google Sheets.
 *
 * INSTALACIÓN (una sola vez):
 *  1. Crea una hoja de cálculo nueva en Google Sheets (nómbrala "Bitácora Vehículo").
 *  2. Extensiones → Apps Script. Borra lo que haya y pega TODO este archivo.
 *  3. Cambia CLAVE (abajo) por una clave larga que solo tú conozcas.
 *  4. Implementar → Nueva implementación → tipo "Aplicación web":
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *     Autoriza los permisos (Sheets y Drive) y copia la URL que termina en /exec.
 *  5. En la app: botón de nube → pega esa URL y la misma CLAVE.
 *
 * Las hojas "Vehiculos" y "Servicios" se crean solas y SON la fuente de verdad:
 * puedes mirarlas (o corregir un dato a mano) y la app lo recoge en la próxima sincronización.
 * Si cambias este código, usa Implementar → Administrar implementaciones → Editar → Nueva versión.
 */
const CLAVE = 'CAMBIA-ESTA-CLAVE';
const CARPETA_FOTOS = 'Bitacora Vehiculo - facturas';

const VEH_COLS = ['id','propietario','marca','modelo','anio','placa','kmActual','combustible','color','telefono','chasis','motor'];
const VEH_LABELS = ['ID','Propietario','Marca','Modelo','Año','Placa','Km actual','Combustible','Color','Teléfono','Chasis','Motor'];
const REC_COLS = ['id','vehicleId','tipo','fechaRealizado','kmServicio','valor','proxFecha','proxKm','taller','observaciones','foto'];
const REC_LABELS = ['ID','ID vehículo','Servicio','Fecha realizado','Km al servicio','Valor (COP)','Próx. fecha','Próx. km','Taller','Observaciones','Foto (ID Drive)'];

const NUM_COLS = ['id','vehicleId','anio','kmActual','kmServicio','valor','proxKm'];
const DATE_COLS = ['fechaRealizado','proxFecha'];
const NULLABLE = ['anio','kmServicio','valor','proxKm','fechaRealizado','proxFecha','foto'];
const MAX_RECORDS = 3000;

function doGet(){ return json_({ok:true, app:'bitacora-vehiculo'}); }

function doPost(e){
  let out;
  try{
    const req = JSON.parse(e.postData.contents);
    if(!CLAVE || CLAVE === 'CAMBIA-ESTA-CLAVE' || req.key !== CLAVE) return json_({error:'clave'});
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try{ out = handle_(req); } finally { lock.releaseLock(); }
  }catch(err){
    out = {error: String(err && err.message || err)};
  }
  return json_(out);
}

function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req){
  switch(req.action){
    case 'get':       return readAll_();
    case 'save':      return save_(req);
    case 'photo_put': return photoPut_(req);
    case 'photo_get': return photoGet_(req);
    case 'photo_del': return photoDel_(req);
    default: throw new Error('acción desconocida');
  }
}

/* ---------- Hojas ---------- */
function sheet_(name){
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function readCfg_(){
  const sh = sheet_('Config');
  const n = sh.getLastRow();
  const cfg = {};
  if(n > 0) sh.getRange(1,1,n,2).getValues().forEach(r=>{ if(r[0]) cfg[r[0]] = r[1]; });
  return cfg;
}
function writeCfg_(cfg){
  const sh = sheet_('Config');
  sh.clear();
  const rows = Object.keys(cfg).map(k=>[k, cfg[k]]);
  if(rows.length) sh.getRange(1,1,rows.length,2).setValues(rows);
}

function readTable_(sh, cols){
  const n = sh.getLastRow();
  if(n < 2) return [];
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const vals = sh.getRange(2,1,n-1,cols.length).getValues();
  const out = [];
  vals.forEach(row=>{
    if(row[0] === '' || row[0] === null) return;
    const o = {};
    cols.forEach((c,i)=>{
      let v = row[i];
      if(DATE_COLS.indexOf(c) >= 0){
        if(v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        else v = v === '' ? null : String(v).slice(0,10);
      } else if(NUM_COLS.indexOf(c) >= 0){
        v = (v === '' || v === null) ? null : Number(v);
        if(v !== null && isNaN(v)) v = null;
      } else if(NULLABLE.indexOf(c) >= 0){
        v = v === '' ? null : String(v);
      } else {
        v = v === null || v === undefined ? '' : String(v);
      }
      o[c] = v;
    });
    out.push(o);
  });
  return out;
}

function writeTable_(sh, cols, labels, rows){
  const total = Math.max(rows.length, 1);
  sh.clear();
  const textCols = cols.map(c=> NUM_COLS.indexOf(c) < 0);
  sh.getRange(1,1,1,cols.length).setValues([labels]).setFontWeight('bold').setBackground('#e8f0fe');
  sh.setFrozenRows(1);
  // texto plano en columnas no numéricas: evita que Sheets convierta fechas o interprete "=..." como fórmula
  cols.forEach((c,i)=>{ if(textCols[i]) sh.getRange(2,i+1,total,1).setNumberFormat('@'); });
  if(rows.length){
    const data = rows.map(r=> cols.map(c=>{
      const v = r[c];
      return (v === null || v === undefined) ? '' : v;
    }));
    sh.getRange(2,1,data.length,cols.length).setValues(data);
  }
}

function readAll_(){
  const vehicles = readTable_(sheet_('Vehiculos'), VEH_COLS);
  if(!vehicles.length) return {rev:0, state:null};
  const records = readTable_(sheet_('Servicios'), REC_COLS);
  const cfg = readCfg_();
  return {
    rev: Number(cfg.rev) || 0,
    state: {
      schema: 2,
      nextId: Number(cfg.nextId) || undefined,
      nextVid: Number(cfg.nextVid) || undefined,
      lastIcsSyncAt: cfg.lastIcsSyncAt ? Number(cfg.lastIcsSyncAt) : null,
      vehicles: vehicles,
      records: records
    }
  };
}

function save_(req){
  const s = req.state;
  if(!s || !Array.isArray(s.vehicles) || !Array.isArray(s.records) || !s.vehicles.length) throw new Error('datos inválidos');
  if(s.records.length > MAX_RECORDS) throw new Error('demasiados registros');
  const cur = readAll_();
  if(Number(req.baseRev) !== cur.rev) return {conflict:true, rev:cur.rev, state:cur.state};
  writeTable_(sheet_('Vehiculos'), VEH_COLS, VEH_LABELS, s.vehicles);
  writeTable_(sheet_('Servicios'), REC_COLS, REC_LABELS, s.records);
  const rev = cur.rev + 1;
  writeCfg_({rev:rev, nextId:s.nextId || '', nextVid:s.nextVid || '', lastIcsSyncAt:s.lastIcsSyncAt || '', actualizado:new Date().toISOString()});
  const ss = SpreadsheetApp.getActive();
  const first = ss.getSheets()[0];
  if(first && first.getName() !== 'Vehiculos') ss.setActiveSheet(sheet_('Vehiculos'));
  return {ok:true, rev:rev};
}

/* ---------- Fotos de facturas (Drive) ---------- */
function folder_(){
  const it = DriveApp.getFoldersByName(CARPETA_FOTOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
}
function ownFile_(id){
  const f = DriveApp.getFileById(id);
  const parents = f.getParents();
  const root = folder_().getId();
  while(parents.hasNext()) if(parents.next().getId() === root) return f;
  throw new Error('archivo no permitido');
}
function photoPut_(req){
  if(!req.data || String(req.data).length > 6000000) throw new Error('foto inválida o muy grande');
  const mime = /^image\/(jpeg|png|webp)$/.test(req.mime) ? req.mime : 'image/jpeg';
  const blob = Utilities.newBlob(Utilities.base64Decode(req.data), mime, 'servicio-' + Date.now() + '.jpg');
  const f = folder_().createFile(blob);
  return {ok:true, id:f.getId()};
}
function photoGet_(req){
  const f = ownFile_(String(req.id));
  const b = f.getBlob();
  return {ok:true, mime:b.getContentType(), data:Utilities.base64Encode(b.getBytes())};
}
function photoDel_(req){
  ownFile_(String(req.id)).setTrashed(true);
  return {ok:true};
}
