
/* ============ اختبار تشغيلي ============ */
const els = {};
function stubEl(){ return { innerHTML:'', classList:{add(){},remove(){},contains(){return false}}, style:{}, appendChild(){}, remove(){}, setAttribute(){}, getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}), addEventListener(){}, querySelector:()=>null, querySelectorAll:()=>[], focus(){}, dataset:{}, setPointerCapture(){}, value:'', checked:false, textContent:'' }; }
global.document = { querySelector:(s)=>{ els[s]=els[s]||stubEl(); return els[s]; }, querySelectorAll:()=>[], addEventListener(){}, createElement:()=>stubEl(), getElementById:(id)=>{ els['#'+id]=els['#'+id]||stubEl(); return els['#'+id]; }, body:stubEl() };
global.location = { hash:'#/home', href:'' };
global.window = { addEventListener(){}, location:global.location, scrollTo(){}, open(){}, navigator:{} };
global.localStorage = { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=v} };
global.navigator = { clipboard:null };

