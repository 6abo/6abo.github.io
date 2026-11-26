import {TZ,monthNames} from './model.js'
import {demoApi,demoMedia} from './demo.js'

const shapes={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-11 5h4m-4 3h2"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4m-4 4v2"/>',
  cake:'<path d="M4 15h16v5H4zm2-5h12v5H6zm3 0V7m6 3V7m-3 3V7m-3-3v1m6-1v1m-3-2v1M2 20h20"/>',
  broom:'<path d="m9 12 8-9a2 2 0 1 1 3 3l-8 9M7 11l6 6-4 4c-3 0-6-2-7-5l5-5Zm-2 7 3-3"/>',
  inbox:'<path d="M4 4h16v16H4zM4 14h5l1 2h4l1-2h5M8 8h8m-8 3h6"/>',
  users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3m1-17a3 3 0 0 1 0 6m1 4a4 4 0 0 1 4 4v3"/>',
  login:'<path d="M10 17l5-5-5-5m5 5H3m10-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>',
  logout:'<path d="m15 17 5-5-5-5m4 5H8m2-8H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.7"/>',
  area:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 15 6-6m-5 0h5v5"/>',
  car:'<path d="m5 11 2-5h10l2 5M4 11h16v7H4zm2 7v2m12-2v2m-11-6h2m6 0h2"/>',
  bed:'<path d="M3 18V7m18 11v-4a3 3 0 0 0-3-3H3m0 6h18m-16-6V9h5v2"/>',
  bath:'<path d="M3 13h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Zm3 0V6a2 2 0 0 1 4 0m-5 14-1 1m15-1 1 1"/>',
  star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9z"/>',
  down:'<path d="m6 9 6 6 6-6"/>',right:'<path d="m9 6 6 6-6 6"/>',left:'<path d="m15 6-6 6 6 6"/>',
  close:'<path d="m6 6 12 12m0-12L6 18"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  photo:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1"/><path d="m20 16-5-5-7 8"/>',
  edit:'<path d="m13 6 5 5M4 20l4-1L20 7a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L4 15z"/>',
  trash:'<path d="M4 7h16M6 7l1 13h10l1-13M9 7V4h6v3m-5 4v5m4-5v5"/>',
  share:'<path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  message:'<path d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.3-.6L4 21l1.5-4.8a8.5 8.5 0 1 1 15-4.7Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  tool:'<path d="m4 18 7-7m-2-3 3-4 4 2 3 4-3 3-4-4-6 10a2 2 0 0 1-3 0Z"/>',
  building:'<path d="M3 21h18m-16 0V8l7-5 7 5v13M9 12h0m6 0h0M9 16h0m6 0h0m-4 5v-3h2v3"/>',
  sparkle:'<path d="m12 2 2.4 6.7L21 11l-6.6 2.3L12 20l-2.4-6.7L3 11l6.6-2.3L12 2Zm7 14 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
  filter:'<path d="M4 6h16M7 12h10m-7 6h4"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4 2.2c-1.2.7-1.5 1.1-1.5 2.3m0 3h.01"/>',
}
export const icon=(name)=>'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name]||shapes.home)+'</svg>'
export const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))
export const attr=esc
export const price=value=>value==null?'Por consultar':new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:Number.isInteger(value)?0:2}).format(value).replace('US$','$')
export const quantity=value=>new Intl.NumberFormat('es-EC',{maximumFractionDigits:2}).format(value)
export const capitalize=value=>value.charAt(0).toUpperCase()+value.slice(1)
export const monthTitle=key=>capitalize(monthNames[Number(key.slice(5))-1])+' '+key.slice(0,4)
export const dayTitle=date=>new Intl.DateTimeFormat('es-EC',{dateStyle:'full',timeZone:TZ}).format(new Date(date+'T15:00:00Z'))
export const shortMonth=date=>monthNames[Number(date.slice(5,7))-1]?.slice(0,3)||''
export const media=demoMedia
export const originalMedia=(id)=>demoMedia(id,true)
export const imageUrl=record=>record.photos?.length?media(record.photos[0]):record.hero||''
export const cls=(...parts)=>parts.filter(Boolean).join(' ')
export const checked=value=>value?'checked':''
export const options=(choices,current,placeholder)=> (placeholder===undefined?'':'<option value="">'+esc(placeholder)+'</option>')+choices.map(choice=>{
  const [value,label]=Array.isArray(choice)?choice:[choice,choice]
  return '<option value="'+attr(value)+'" '+(value===current?'selected':'')+'>'+esc(label)+'</option>'
}).join('')
export const avatar=(name,photo='',mini=false)=>{
  const initials=String(name||'RG').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('')
  return '<span class="avatar '+(mini?'mini':'')+'">'+(photo?'<img alt="" src="'+attr(media(photo))+'">':esc(initials.toUpperCase()))+'</span>'
}
export const button=(label,action,glyph,sty='',data='')=>'<button type="button" class="btn '+sty+'" data-action="'+action+'" '+data+'>'+(glyph?icon(glyph):'')+esc(label)+'</button>'
export const iconButton=(label,action,glyph,data='')=>'<button type="button" class="iconbtn" aria-label="'+attr(label)+'" title="'+attr(label)+'" data-action="'+action+'" '+data+'>'+icon(glyph)+'</button>'
export const dataId=id=>'data-id="'+attr(id)+'"'
export const empty=message=>'<div class="empty">'+esc(message)+'</div>'
export const loader=label=>'<div class="loader" role="status"><div class="construction">'+icon('home')+icon('tool')+'</div><strong>'+esc(label)+'</strong></div>'

export const api=demoApi

export const dialog=document.querySelector('#dialog')
export function showDialog(title,content,{wide=false}={}){
  dialog.className=wide?'wide':''
  dialog.innerHTML='<div class="dialog-top"><h2 id="dialog-name">'+esc(title)+'</h2>'+iconButton('Cerrar','close','close')+'</div><div class="dialog-body">'+content+'</div>'
  if(!dialog.open)dialog.showModal()
  dialog.scrollTop=0
}
export function notify(message,isError=false){
  const toast=document.createElement('div')
  toast.className='toast'+(isError?' error':'')
  toast.textContent=message
  document.querySelector('#alerts').append(toast)
  setTimeout(()=>toast.remove(),3700)
}

export const field=(name,label,value='',{type='text',required=false,placeholder='',extra='',span=false}={})=>
  '<div class="field '+(span?'span':'')+'"><label for="field-'+name+'">'+esc(label)+'</label><input id="field-'+name+'" name="'+name+'" type="'+type+'" value="'+attr(value)+'" '+(required?'required ':'')+(placeholder?'placeholder="'+attr(placeholder)+'" ':'')+extra+'></div>'
export const selectField=(name,label,choices,value='',{required=false,placeholder}={})=>
  '<div class="field"><label for="field-'+name+'">'+esc(label)+'</label><select id="field-'+name+'" name="'+name+'" '+(required?'required':'')+'>'+options(choices,value,placeholder)+'</select></div>'
export const areaField=(name,label,value='',placeholder='')=>
  '<div class="field span"><label for="field-'+name+'">'+esc(label)+'</label><textarea id="field-'+name+'" name="'+name+'" placeholder="'+attr(placeholder)+'">'+esc(value)+'</textarea></div>'
export const checkField=(name,label,value=false,kind='switch')=>'<label class="'+kind+'"><input type="checkbox" name="'+name+'" '+checked(value)+'>'+esc(label)+'</label>'
export const checkGroup=(name,choices,selected=[])=>'<div class="checks">'+choices.map(choice=>{
  const [value,label]=Array.isArray(choice)?choice:[choice,choice]
  return '<label class="check"><input type="checkbox" name="'+name+'" value="'+attr(value)+'" '+checked(selected.includes(value))+'>'+esc(label)+'</label>'
}).join('')+'</div>'
export const fields=(...elements)=>'<div class="fields">'+elements.join('')+'</div>'
export const section=(title,content,open=false)=>'<details class="form-details" '+(open?'open':'')+'><summary>'+esc(title)+'</summary>'+content+'</details>'
export const actions=(submit='Guardar')=>'<div class="error-text" role="alert"></div><div class="dialog-actions">'+button('Cancelar','close')+'<button class="btn primary" type="submit">'+esc(submit)+'</button></div>'
