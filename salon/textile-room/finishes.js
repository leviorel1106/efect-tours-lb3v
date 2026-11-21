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
  rug: ['שטיח היוטה', '#bda583', ['flax','sand','olive','rust','blue','charcoal']],
  table: ['שולחן הסלון', '#cbbb9d', stone],
  curtains: ['וילונות', '#ded4bf', ['chalk','cream','flax','sage','rose','blue']],
  floor: ['רצפת האבן', '#d2c4ae', stone],
  beams: ['קורות העץ', '#b99168', ['sand','ochre','hazel','olive','gray','charcoal']]
};
const chairIds = ['westChair','eastChair'];
const furnitureIds = ['sofa',...chairIds,'table'];
const originals={sofa:'ספה פינתית עם שזלונג',chairs:'כורסה מרופדת בבוקלה',table:'שולחן טרוורטין'};
const alternateBase={sofa:'#86654d',westChair:'#484742',eastChair:'#484742',table:'#b38e63'};
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
  function restoreFromStorage(){
    const values=loadChoices(storageKey);
    ids.forEach(id=>assign(id,values[id]));
    const models=loadChoices(modelStorageKey);
    furnitureIds.forEach((id,i)=>state.models.value.setComponent(i,models[id]===1?1:0));
  }
  restoreFromStorage();
  window.addEventListener('storage',event=>{
    if(event.key===storageKey || event.key===modelStorageKey || event.key===null){
      restoreFromStorage();state.dispatchEvent(new Event('change'));
    }
  });
  state.tint = id=>uniforms.get(id);
  state.model = id=>{
    if(id==='chairs'){
      const [a,b]=chairIds.map(state.model);
      return a===b?a:'mixed';
    }
    return furnitureIds.includes(id)?state.models.value.getComponent(furnitureIds.indexOf(id)):0;
  };
  state.setModel=(id,variant)=>{
    const targets=id==='all'?furnitureIds:id==='chairs'?chairIds:[id];
    for(const key of targets)state.models.value.setComponent(furnitureIds.indexOf(key),variant);
    try{
      const record=Object.fromEntries(furnitureIds.filter(k=>state.model(k)).map(k=>[k,1]));
      if(Object.keys(record).length)localStorage.setItem(modelStorageKey,JSON.stringify(record));
      else localStorage.removeItem(modelStorageKey);
    }catch{}
    state.dispatchEvent(new Event('change'));
  };
  state.baseColor=id=>{
    const key=id==='chairs'?'westChair':id;
    return state.model(key)?alternateBase[key]:items[key][1];
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
  state.changed = ()=>saved.size>0 || furnitureIds.some(id=>state.model(id));
  state.set = (id,color)=>{
    const targets=id==='all'?ids:id==='chairs'?chairIds:[id];
    targets.forEach(target=>assign(target,color));
    try {
      if(saved.size)localStorage.setItem(storageKey,JSON.stringify(Object.fromEntries(saved)));
      else localStorage.removeItem(storageKey);
    } catch { /* The live editor also works in a storage-disabled browser. */ }
    if(id==='all')state.setModel('all',0);
    else state.dispatchEvent(new Event('change'));
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
  floor:[6.52,4.1,3.8,2.8,.26], beams:[3.7,6.56,1.25,2.50,3.20]
};

export function mountFinishEditor(state,lookAt,openInitially){
  const bar=document.querySelector('.ui');
  const toggle=document.createElement('button');
  toggle.id='open-finishes';toggle.textContent='רהיטים וצבעים';
  toggle.setAttribute('aria-controls','finish-editor');
  bar.prepend(toggle);
  const panel=document.createElement('section');
  panel.id='finish-editor';panel.setAttribute('aria-label','עריכת רהיטים וצבעים');
  panel.innerHTML=`
    <div class="finish-head"><h2>רהיטים וצבעים</h2><button type="button" class="finish-close" aria-label="סגירת העורך">×</button></div>
    <label for="finish-item">פריט בסלון</label>
    <div class="finish-target"><select id="finish-item"></select><button class="finish-look" type="button">מבט לפריט</button></div>
    <div class="finish-model"><label for="furniture-model">דגם</label><select id="furniture-model"></select></div>
    <label class="finish-color-label">גוון</label>
    <div class="finish-swatches" aria-label="גוונים לבחירה" role="group"></div>
    <div class="finish-custom"><label for="finish-picker">צבע אישי</label><input id="finish-hex" dir="ltr" type="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="קוד צבע HEX"><input type="color" id="finish-picker" aria-label="בחירת צבע אישי"></div>
    <p class="finish-status" role="status"></p>
    <div class="finish-actions"><button class="finish-original" type="button">שחזור צבע הפריט</button><button class="finish-reset" type="button">איפוס כל החדר</button></div>`;
  document.body.append(panel);
  const find=selector=>panel.querySelector(selector);
  const select=find('select'), chips=find('.finish-swatches'), picker=find('#finish-picker'), hex=find('#finish-hex'), status=find('.finish-status');
  const model=find('#furniture-model');
  for(const [id,[name]] of Object.entries(items))select.add(new Option(name,id));
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
    const target=select.value;
    const variant=state.model(target);
    const entry=state.catalog[target==='chairs'?'westChair':target];
    find('.finish-model').hidden=!entry;
    select.querySelector('option[value="throw"]').disabled=!!state.model('sofa');
    if(target==='throw' && state.model('sofa')){select.value='sofa';showSwatches();return;}
    if(entry){
      const originalName=originals[chairIds.includes(target)?'chairs':target];
      model.replaceChildren(new Option(originalName,'0'),new Option(entry.name,'1'));
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
    find('.finish-reset').disabled=!state.changed();
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
  select.onchange=showSwatches;
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
  find('.finish-reset').onclick=()=>state.set('all',null);
  find('.finish-look').onclick=()=>{
    lookAt(views[select.value]);
    if(matchMedia('(max-width:650px)').matches)open(false);
  };
  state.addEventListener('change',refresh);
  showSwatches();open(openInitially);
}
