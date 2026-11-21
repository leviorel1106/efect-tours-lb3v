import {models,modelList,zones,newItems,detailsViews} from './design-library.js';
import {Color, Vector3, Vector4} from 'three';

const storageKey = 'caesarea.salon.finishes.v1';
const swatches = {
  chalk: ['סיד', '#e9e3d6'], sand: ['חול', '#c3ad90'], sage: ['מרווה', '#7e8e77'],
  olive: ['זית', '#626747'], rust: ['טרקוטה', '#b76f53'], rose: ['חמרה בהירה', '#c79280'],
  blue: ['כחול מעושן', '#566e85'], ink: ['דיו', '#394955'], plum: ['שזיף', '#795869'],
  flax: ['פשתן', '#c9bca5'], ochre: ['אוכרה', '#ba965e'], charcoal: ['פחם', '#494846'],
  hazel: ['אגוז', '#825e48'], cream: ['שמנת', '#e3d6ba'], gray: ['אפור אבן', '#999996']
};
const cloth = ['flax','sage','blue','rust','plum','ink'];
const stone = ['chalk','sand','sage','rose','gray','charcoal'];
const items = {
  sofa: ['ספה וכריות הגב', '#c8b9a2', cloth],
  chairs: ['שתי הכורסאות', '#d2c4ae', cloth],
  westChair: ['הכורסה המערבית', '#d2c4ae', cloth],
  eastChair: ['הכורסה המזרחית', '#d2c4ae', cloth],
  throw: ['שמיכה על השזלונג', '#d6c9ad', ['cream','ochre','rust','olive','blue','plum']],
  walls: ['קירות הסלון', '#e5e0d4', stone],
  shelves: ['ספריית הקיר', '#e5e0d4', stone],
  rug: ['שטיח הסלון', '#bda583', ['flax','sand','olive','rust','blue','charcoal']],
  table: ['שולחן הסלון', '#cbbb9d', stone],
  pendant: ['גוף התאורה התלוי', '#dbceac', ['chalk','cream','flax','sand','ochre','rose']],
  curtains: ['וילונות', '#ded4bf', ['chalk','cream','flax','sage','rose','blue']],
  floor: ['רצפת האבן', '#d2c4ae', stone],
  beams: ['קורות העץ', '#b99168', ['sand','ochre','hazel','olive','gray','charcoal']]
};
const chairIds = ['westChair','eastChair'];
const furnitureIds = ['sofa',...chairIds,'table'];
for(const [id,[name,color]] of Object.entries(newItems))items[id]=[name,color,
  ['stools','diningChairs','loungers'].includes(id)?cloth:['chalk','sand','hazel','sage','gray','charcoal']];
const designKey='caesarea.salon.design.v2';
const modelStorageKey='caesarea.salon.models.v1';
const ids = Object.keys(items).filter(id=>id !== 'chairs');
const roomSlots = {
  Shell: {id_plaster: ['walls','EDIT_WALLS'], id_limestone: ['floor'], id_oak_y: ['beams']},
  Objects: {id_cream_linen: ['curtains','EDIT_CURTAINS'], id_jute: ['rug','EDIT_RUG'], id_travertine: ['table','EDIT_TABLE']}
};
const isColor = value=>typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

function loadChoices(key){
  try {return JSON.parse(localStorage.getItem(key)) || {};}
  catch {return {};}
}

export function createFinishes(catalog){
  const state = new EventTarget();
  state.catalog=catalog;
  state.models={value:new Vector4()};
  const saved = new Map();
  const uniforms = new Map(ids.map(id=>[id,{value:new Vector3(1,1,1)}]));
  function assign(id, color){
    const tint = uniforms.get(id).value;
    if(!isColor(color)){
      saved.delete(id);tint.set(1,1,1);return;
    }
    saved.set(id,color.toLowerCase());
    // Divide by the original diffuse pigment in linear light. A small diffuse
    // floor lets very dark fabric retain detail in sunlight and open shade.
    const dye = new Color(color), base = new Color(items[id][1]);
    tint.set((.009+dye.r)/(.009+base.r),(.009+dye.g)/(.009+base.g),(.009+dye.b)/(.009+base.b));
  }
  const modelIds=Object.keys(items).filter(id=>id!=='chairs' && modelList(id));
  const extras={};
  const allowed=(id,model)=>Number.isInteger(model) && model>=0 && model<modelList(id).length;
  state.duneDetails={value:0};
  state.pendant={value:0};
  const setOneModel=(id,value)=>{
    if(!allowed(id,value))return;
    if(id==='pendant')state.pendant.value=value;
    else if(furnitureIds.includes(id))state.models.value.setComponent(furnitureIds.indexOf(id),value);
    else extras[id]=value;
  };
  state.model=id=>{
    if(id==='chairs'){
      const [a,b]=chairIds.map(state.model);
      return a===b?a:'mixed';
    }
    if(id==='pendant')return state.pendant.value;
    return furnitureIds.includes(id)?state.models.value.getComponent(furnitureIds.indexOf(id)):(extras[id]||0);
  };
  function applyRecord(record){
    ids.forEach(id=>assign(id,record.colors?.[id]));
    modelIds.forEach(id=>setOneModel(id,allowed(id,record.models?.[id])?record.models[id]:0));
    state.duneDetails.value=record.details===1?1:0;
  }
  function restore(){
    const stored=loadChoices(designKey);
    if(stored.version===2){applyRecord(stored);return;}
    // Import existing visitors' independently chosen finishes and furniture.
    applyRecord({colors:loadChoices(storageKey),models:loadChoices(modelStorageKey)});
  }
  function commit(){
    const record={version:2,colors:Object.fromEntries(saved),details:state.duneDetails.value,
      models:Object.fromEntries(modelIds.map(id=>[id,state.model(id)]))};
    try{localStorage.setItem(designKey,JSON.stringify(record));}catch{}
    state.dispatchEvent(new Event('change'));
  }
  function clearPresetLink(){
    const url=new URL(location.href);
    if(url.searchParams.has('design') || url.hash.startsWith('#v=')){
      url.searchParams.delete('design');url.hash='';history.replaceState(history.state,'',url);
    }
  }
  state.setScheme=(zone,key)=>{
    const scheme=zones[zone]?.schemes.find(row=>row[0]===key);
    if(!scheme)return;
    const [,,choices,colors,details]=scheme;
    for(const id of zones[zone].items.filter(id=>id!=='chairs')){
      assign(id,colors[id]);
      if(modelList(id))setOneModel(id,choices[id]||0);
    }
    if(zone==='salon')state.duneDetails.value=details||0;
    clearPresetLink();commit();
  };
  state.schemeName=zone=>{
    for(const [key,,choices,colors,details] of zones[zone].schemes){
      if(zone==='salon' && state.duneDetails.value!==(details||0))continue;
      if(zones[zone].items.filter(id=>id!=='chairs').every(id=>
        state.model(id)===(choices[id]||0) && (saved.get(id)||null)===(colors[id]||null)))return key;
    }
    return 'custom';
  };
  state.share=zone=>{
    const url=new URL(location.href);
    url.searchParams.delete('design');url.searchParams.set('zone',zone);
    const record={colors:Object.fromEntries(saved),details:state.duneDetails.value,
      models:Object.fromEntries(modelIds.filter(id=>state.model(id)).map(id=>[id,state.model(id)]))};
    url.hash='v='+btoa(JSON.stringify(record)).replace(/=+$/,'').replaceAll('+','-').replaceAll('/','_');
    return url.href;
  };
  restore();
  const arrival=new URL(location.href);
  const requested=arrival.searchParams.get('design');
  if(arrival.hash.startsWith('#v=') && arrival.hash.length<4000){
    try{
      const record=JSON.parse(atob(arrival.hash.slice(3).replaceAll('-','+').replaceAll('_','/')));
      if(record && typeof record.models==='object' && typeof record.colors==='object'){applyRecord(record);commit();}
    }catch{}
  }else if(zones.salon.schemes.some(row=>row[0]===requested)){
    state.setScheme('salon',requested);
    history.replaceState(history.state,'',arrival);
  }
  window.addEventListener('storage',event=>{
    if([storageKey,modelStorageKey,designKey,null].includes(event.key)){
      restore();state.dispatchEvent(new Event('change'));
    }
  });
  state.tint=id=>uniforms.get(id);
  state.setModel=(id,variant)=>{
    const targets=id==='chairs'?chairIds:[id];
    if(!targets.every(key=>modelIds.includes(key)&&allowed(key,variant)))return;
    targets.forEach(key=>setOneModel(key,variant));clearPresetLink();commit();
  };
  state.baseColor=id=>{
    const key=id==='chairs'?'westChair':id;
    return modelList(key)?.[state.model(key)]?.[1] || items[key][1];
  };
  state.roomSurface = (group,material)=>{
    const slot=roomSlots[group]?.[material];
    if(!slot)return null;
    const [id,mask]=slot;
    return {
      defines:{EDIT_SURFACE:1,...(mask?{[mask]:1}:{})},
      uniforms:{finishTint:uniforms.get(id),...(id==='walls'?{shelfTint:uniforms.get('shelves')}:{})}
    };
  };
  state.get = id=>{
    if(id==='chairs'){
      const [a,b]=chairIds.map(chair=>state.get(chair));
      return a===b?a:'mixed';
    }
    return saved.get(id) || null;
  };
  state.changed=()=>saved.size>0 || state.duneDetails.value!==0 || modelIds.some(id=>state.model(id));
  state.set=(id,color)=>{
    if(id==='all'){applyRecord({});clearPresetLink();commit();return;}
    const targets=id==='chairs'?chairIds:[id];
    targets.forEach(target=>assign(target,color));clearPresetLink();commit();
  };
  return state;
}

// Standing positions in the free-walk map, followed by a point of interest.
const views = {
  sofa:[-2.55,2.15,1.65,4.65,.70], chairs:[-2.25,3.30,.9,1.48,.48],
  westChair:[-1.55,3.12,0,1.60,.45], eastChair:[3.15,.53,1.8,1.20,.45],
  throw:[5.47,2.17,3.6,3.48,.52], walls:[-1.55,1.05,3.8,7.65,1.65],
  shelves:[5.85,3.40,1.5,7.83,1.47], rug:[-2.55,2.15,1.6,3.1,.16],
  table:[-.75,2.55,1.70,2.85,.35], curtains:[2.98,2.16,-.8,.16,1.39],
  pendant:[-.7,3.75,1.70,2.85,2.45], floor:[6.52,4.1,3.8,2.8,.26], beams:[3.7,6.56,1.25,2.50,3.20]
};

export function mountFinishEditor(state,lookAt,openInitially,initialZone='salon',walkBehind){
  let area=Object.hasOwn(zones,initialZone)?initialZone:'salon';
  const bar=document.querySelector('.ui');
  const toggle=document.createElement('button');
  toggle.id='open-finishes';toggle.textContent='עיצוב הווילה';
  toggle.setAttribute('aria-controls','finish-editor');
  bar.prepend(toggle);
  const panel=document.createElement('section');
  panel.id='finish-editor';panel.setAttribute('aria-label','עיצוב הווילה');
  panel.innerHTML=`
    <div class="finish-head"><h2>עיצוב הווילה</h2><button type="button" class="finish-close" aria-label="סגירת העורך">×</button></div>
    <div class="finish-zones" role="group" aria-label="בחירת חלל"></div>
    <div class="finish-design"><label for="salon-design">סגנון לחלל</label><select id="salon-design"></select><div class="finish-previews" role="group" aria-label="תצוגות של הסגנונות"></div></div>
    <label for="finish-item">בחירת פריט</label>
    <div class="finish-target"><select id="finish-item"></select><button class="finish-look" type="button">מבט לפריט</button></div>
    <button type="button" class="finish-behind">הליכה אל גב הרהיט</button>
    <div class="finish-model"><label for="furniture-model">דגם</label><select id="furniture-model"></select></div>
    <label class="finish-color-label">גוון</label>
    <div class="finish-swatches" aria-label="גוונים לבחירה" role="group"></div>
    <div class="finish-custom"><label for="finish-picker">צבע אישי</label><input id="finish-hex" dir="ltr" type="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="קוד צבע HEX"><input type="color" id="finish-picker" aria-label="בחירת צבע אישי"></div>
    <p class="finish-status" role="status"></p>
    <div class="finish-actions"><button class="finish-original" type="button">שחזור צבע הפריט</button><button class="finish-reset" type="button">איפוס החלל</button></div>
    <div class="finish-links"><button type="button" class="finish-share">העתקת קישור לעיצוב שלי</button><details><summary>השראה בפינטרסט ובאתרי המעצבים</summary><div class="finish-ref-list"></div></details></div>`;
  document.body.append(panel);
  const find=selector=>panel.querySelector(selector);
  const select=find('#finish-item'), chips=find('.finish-swatches'), picker=find('#finish-picker'), hex=find('#finish-hex'), status=find('.finish-status');
  const model=find('#furniture-model'), design=find('#salon-design');
  const zoneButtons=find('.finish-zones'),previews=find('.finish-previews');
  for(const [id,info] of Object.entries(zones)){
    const button=document.createElement('button');button.type='button';button.textContent=info.name;button.value=id;
    button.onclick=()=>switchArea(id,true);zoneButtons.append(button);
  }
  function switchArea(id,move){
    area=id;const info=zones[id];
    for(const button of zoneButtons.children)button.setAttribute('aria-pressed',String(button.value===id));
    select.replaceChildren(...info.items.map(item=>new Option(items[item][0],item)));
    design.replaceChildren(...info.schemes.map(([key,label])=>new Option(label,key)));
    const custom=new Option('שילוב אישי','custom');custom.disabled=true;design.add(custom);
    previews.replaceChildren();
    for(const [key,label] of info.schemes){
      const b=document.createElement('button');b.type='button';b.value=key;b.title=label;b.setAttribute('aria-label',label);
      const img=document.createElement('img');img.alt='';img.src='../textile-room/collection/'+key+'-preview.webp';
      b.append(img);b.onclick=()=>state.setScheme(id,key);previews.append(b);
    }
    const refs=find('.finish-ref-list');refs.replaceChildren();
    for(const [title,url] of info.sources){
      const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=title;refs.append(a);
    }
    showSwatches();
    if(move)lookAt(info.view);
  }
  design.onchange=()=>state.setScheme(area,design.value);
  find('.finish-share').onclick=async()=>{
    const url=state.share(area);
    try{await navigator.clipboard.writeText(url);status.textContent='הקישור הועתק וכולל את הבחירות בשלושת החללים';}
    catch{window.prompt('העתקת קישור לעיצוב',url);}
  };
  const mapButton=bar.querySelector('[aria-controls="floor-plan"]');
  const toolsButton=document.createElement('button');
  toolsButton.id='finish-tools';toolsButton.textContent='כלי סיור';
  toolsButton.setAttribute('aria-expanded','false');
  const tray=document.createElement('div');
  tray.id='finish-tools-tray';
  for(const control of Array.from(bar.children)){
    if(control!==toggle && control!==mapButton && !control.hidden)tray.append(control);
  }
  bar.append(toolsButton,tray);
  toolsButton.setAttribute('aria-controls',tray.id);
  function showTools(value){
    toolsButton.setAttribute('aria-expanded',String(value));
    tray.classList.toggle('open',value);
  }
  toolsButton.onclick=()=>{
    const opening=!tray.classList.contains('open');
    if(opening){open(false);if(!document.getElementById('floor-plan').hidden)mapButton.click();}
    showTools(opening);
  };
  tray.addEventListener('click',()=>showTools(false));
  function open(value){
    if(value)showTools(false);
    if(value && !document.getElementById('floor-plan')?.hidden)mapButton?.click();
    panel.hidden=!value;
    toggle.setAttribute('aria-expanded',String(value));toggle.classList.toggle('active',value);
  }
  mapButton?.addEventListener('click',()=>{
    if(!document.getElementById('floor-plan').hidden){open(false);showTools(false);}
  });
  new ResizeObserver(()=>panel.style.setProperty('--finish-top',(bar.getBoundingClientRect().bottom+9)+'px')).observe(bar);
  toggle.onclick=()=>open(panel.hidden);
  find('.finish-close').onclick=()=>{open(false);toggle.focus();};
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && !panel.hidden){open(false);toggle.focus();}
  });
  function refresh(){
    design.value=state.schemeName(area);
    for(const b of previews.children)b.setAttribute('aria-pressed',String(b.value===design.value));
    const target=select.value;
    find('.finish-behind').hidden=!walkBehind || !['sofa','chairs','westChair','eastChair'].includes(target);
    const variant=state.model(target);
    const options=modelList(target);
    find('.finish-model').hidden=!options;
    const blanket=select.querySelector('option[value="throw"]');
    if(blanket)blanket.disabled=!!state.model('sofa');
    if(target==='throw' && state.model('sofa')){select.value='sofa';showSwatches();return;}
    if(options){
      model.replaceChildren(...options.map(([name],i)=>new Option(name,String(i))));
      if(variant==='mixed'){const opt=new Option('דגמים שונים','mixed');opt.disabled=true;model.add(opt);}
      model.value=String(variant);
    }
    const value=state.get(target), original=state.baseColor(target);
    const mixed=value==='mixed', displayed=mixed?original:value || original;
    hex.removeAttribute('aria-invalid');
    hex.value=mixed?'':displayed.toUpperCase();hex.placeholder=mixed?'—':'#RRGGBB';
    picker.value=displayed;
    const name=Object.values(swatches).find(s=>s[1]===value)?.[0];
    status.textContent=mixed?'לכל כורסה גוון משלה':value?(name||'צבע אישי'):'הגוון המקורי';
    for(const chip of chips.children)chip.setAttribute('aria-pressed',String(chip.value===value));
    find('.finish-original').disabled=!value;
    find('.finish-reset').disabled=state.schemeName(area)===zones[area].schemes[0][0];
  }
  function showSwatches(){
    chips.replaceChildren();
    for(const key of items[select.value][2]){
      const [name,color]=swatches[key],button=document.createElement('button');
      button.type='button';button.value=color;button.title=name;button.setAttribute('aria-label',name);
      button.style.setProperty('--chip',color);
      button.onclick=()=>state.set(select.value,color);
      chips.append(button);
    }
    refresh();
  }
  select.onchange=()=>{showSwatches();if(area!=='salon')lookAt(detailsViews[select.value]||zones[area].view);};
  model.onchange=()=>state.setModel(select.value,Number(model.value));
  picker.oninput=()=>state.set(select.value,picker.value);
  function useHex(){
    const value='#'+hex.value.trim().replace(/^#/,'');
    if(isColor(value))state.set(select.value,value);
    else {hex.setAttribute('aria-invalid','true');status.textContent='יש להזין שש ספרות או אותיות A–F';}
  }
  hex.onchange=useHex;
  hex.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();useHex();}});
  find('.finish-original').onclick=()=>state.set(select.value,null);
  find('.finish-reset').onclick=()=>state.setScheme(area,zones[area].schemes[0][0]);
  find('.finish-behind').onclick=()=>{walkBehind(select.value);open(false);};
  find('.finish-look').onclick=()=>{
    lookAt(views[select.value]||detailsViews[select.value]||zones[area].view);
    if(matchMedia('(max-width:650px)').matches)open(false);
  };
  state.addEventListener('change',refresh);
  switchArea(area,area!=='salon');open(openInitially);
}
