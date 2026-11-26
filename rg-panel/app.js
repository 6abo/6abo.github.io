import {categories,roles,TZ,isoToday,monthDates,fold} from './model.js'
import {api,icon,esc,attr,price,quantity,capitalize,monthTitle,dayTitle,shortMonth,media,originalMedia,imageUrl,cls,
  options,avatar,button,iconButton,dataId,empty,loader,dialog,showDialog,notify} from './ui.js'
import {advertisement} from './photos.js'
import {loginForm,propertyForm,eventForm,requestForm,birthdayForm,rosterForm,userForm,confirmDelete} from './forms.js'

const root=document.querySelector('#app')
const pages={
  home:['Panel general','grid'],catalog:['Catálogo','home'],agenda:['Agenda pública','calendar'],
  private:['Mi agenda privada','lock'],birthdays:['Cumpleaños','cake'],cleaning:['Limpieza','broom'],
  requests:['Requerimientos','inbox'],team:['Usuarios y roles','users']
}
const guestPages=['home','catalog','agenda']
const names=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
let session={user:null,demo:false,setup:false}
let store={}
let view='home'
let currentDate=isoToday()
let mobileMenu=false
let nextAfterLogin=''
let activeDocument=null
let advertisementUrl=''
let assistantOpen=false
let assistantPosition=null
let assistantDrag=null
let suppressAssistantClick=false
let agendaDay=''
let privateDay=''
let birthdayDay=''
let cleaningDay=''
let agendaMonth=currentDate.slice(0,7)
let privateMonth=agendaMonth
let birthdayMonth=agendaMonth
let cleaningMonth=agendaMonth
let search=''
let category=''
let sort='recent'
let ownership='all'
let showFilters=false
let maxPrice=''
let minRooms=''
let privateExpanded=false
let requestSequence=0

const user=()=>session.user
const has=role=>!!user()?.roles.some(value=>value===role||value==='admin')
const monthCurrent=()=>currentDate.slice(0,7)
const eventList=()=>store.events||[]
const publicEvents=()=>eventList().filter(event=>event.public)
const myEvents=()=>eventList().filter(event=>event.ownerId===user()?.id)
const firstName=()=>user()?.name.split(/\s+/)[0]
const routeArray=route=>store[route]||[]
const find=(route,id)=>routeArray(route).find(item=>item.id===id)
const propertyPhotos=property=>property.photos?.length?property.photos.map(id=>({id,url:media(id)})):(property.hero?[{url:property.hero}]:[])
const money=value=>price(value).replace(/\s+(?=\d)/g,'')
const dateStamp=()=>new Intl.DateTimeFormat('es-EC',{weekday:'long',day:'numeric',month:'long',timeZone:TZ}).format(new Date())
const roleName=()=>has('admin')?'Administración':has('agent')?'Asesoría inmobiliaria':'Equipo RG'

function page(pageId){
  if(!pages[pageId])return
  if(!guestPages.includes(pageId)&&!user()){signin(pageId);return}
  if(pageId==='team'&&!has('admin'))return
  view=pageId
  mobileMenu=false
  render()
  window.scrollTo({top:0})
}

function signin(then=''){
  nextAfterLogin=then
  loginForm(session,async result=>{
    session={...session,setup:false,user:result.user}
    readAssistant()
    await refresh()
    if(nextAfterLogin&&pages[nextAfterLogin])page(nextAfterLogin)
    nextAfterLogin=''
    notify('¡Bienvenido, '+firstName()+'! Una buena gestión abre buenas puertas.')
  })
}

async function refresh(){
  const sequence=++requestSequence
  const data=await api('state?month='+encodeURIComponent(cleaningMonth))
  if(sequence!==requestSequence)return
  store=data
  render()
}

function tile(glyph,title){
  return '<div class="widget-title"><span class="tile-icon">'+icon(glyph)+'</span><h3>'+esc(title)+'</h3></div>'
}
function header(title,sub,actions='',label=''){
  return '<div class="header-content"><div>'+(label?'<div class="label">'+esc(label)+'</div>':'')+
    '<h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div><div class="action-row">'+actions+'</div></div>'
}
function navGroup(title,items){
  return '<div class="nav-group" aria-label="'+attr(title)+'">'+items.map(id=>{
    const [name,glyph]=pages[id]
    return '<button type="button" class="nav '+(id===view?'active':'')+'" data-action="page" '+dataId(id)+
      ' aria-label="'+attr(name)+'" title="'+attr(name)+'"'+(id===view?' aria-current="page"':'')+'>'+icon(glyph)+'<span>'+esc(name)+'</span></button>'
  }).join('')+'</div>'
}
function shell(content){
  const work=['home','catalog','agenda']
  const team=['private','birthdays','cleaning','requests',...(has('admin')?['team']:[])]
  return '<div class="shell">'+(mobileMenu?'<button class="mobile-shade" type="button" aria-label="Cerrar navegación" data-action="toggle-menu"></button>':'')+
    '<header class="topbar"><div class="top-brand"><button type="button" class="iconbtn menu-toggle" data-action="toggle-menu" aria-label="Abrir navegación">'+icon('menu')+'</button>'+
    '<button type="button" class="brand" data-action="page" data-id="home"><img class="brand-logo" src="./assets/logo.webp" alt=""><span><strong>RG Inmobiliaria</strong><small>Constructora</small></span></button></div>'+
    '<nav class="top-nav" aria-label="Secciones principales">'+navGroup('Espacio de trabajo',work)+'</nav>'+
    '<div class="top-right"><div class="top-date">'+icon('calendar')+esc(capitalize(dateStamp()))+'</div>'+
    (user()?'<button type="button" class="profile" data-action="profile">'+avatar(user().name,user().photo)+esc(firstName())+icon('down')+'</button>':button('Acceso del equipo','login','login'))+'</div></header>'+
    '<aside class="'+cls('sidebar',mobileMenu&&'open')+'"><nav aria-label="Navegación del equipo">'+navGroup('Espacio de trabajo',work)+navGroup('Equipo',team)+'</nav>'+
    '<div class="side-bottom">'+iconButton('Asistente de RG','assistant','help')+
    iconButton(user()?'Cerrar sesión':session.setup?'Configurar acceso':'Iniciar sesión',user()?'logout':'login',user()?'logout':'login')+'</div></aside>'+
    '<main id="main-content" class="main">'+content+'</main>'+assistantMarkup()+'</div>'
}

function render(){
  const panel={home:dashboard,catalog:catalogPage,agenda:()=>agendaPage(false),private:()=>agendaPage(true),birthdays:birthdaysPage,cleaning:cleaningPage,requests:requestsPage,team:teamPage}[view]
  root.innerHTML=shell(panel())
  root.setAttribute('aria-busy','false')
  updateAssistant()
}

function dashboard(){
  const published=routeArray('properties').filter(property=>property.published)
  const featured=published.find(property=>property.featured)||published[0]
  const title=user()?'¡Bienvenido, '+firstName()+'!':'Panel inmobiliario'
  const tagline=session.demo?'Explora el panel con datos de muestra. Los cambios se guardan en este navegador.':user()?'La confianza se construye en cada visita.':'Gestiona propiedades y consulta la agenda del equipo en Cuenca.'
  const call=has('agent')?button('Nueva captación','new-property','plus','primary'):button('Explorar catálogo','page','search','primary',dataId('catalog'))
  return header(title,tagline,call,session.demo?'Modo demostración':'RG Inmobiliaria Constructora')+
    '<div class="overview-grid">'+(featured?hero(featured):emptyHero())+metrics(published)+categoryChart(published)+
    '<div class="overview-side stack">'+agendaWidget()+privateWidget()+compactWidgets()+'</div>'+
    '<section class="panel pad activity"><div class="collection-title"><h2>Propiedades recientes</h2>'+
    button('Catálogo completo','page',null,'ghost',dataId('catalog'))+'</div>'+filterBar()+results(false)+'</section></div>'
}

function metrics(published){
  const forthcoming=visibleEvents(publicEvents(),'')
  const requests=routeArray('requests').filter(request=>request.status==='Abierto')
  const items=[
    ['home','Publicadas',published.length,'catalog'],
    ['calendar','Eventos próximos',forthcoming.length,'agenda'],
    ['building','En preventa',published.filter(property=>property.category==='Preventa').length,'catalog'],
    [user()?'inbox':'pin',user()?'Requerimientos abiertos':'Sectores en catálogo',user()?requests.length:new Set(published.map(property=>property.sector)).size,user()?'requests':'catalog']
  ]
  return '<section class="panel pad overview-metrics" aria-label="Resumen de actividad"><div class="collection-title"><h2>Resumen</h2></div><div class="metric-grid">'+items.map(([glyph,label,value,destination],index)=>
    '<button type="button" class="metric '+(index===0?'primary-metric':'')+'" data-action="'+(label==='En preventa'?'open-category':'page')+'" '+dataId(label==='En preventa'?'Preventa':destination)+'>'+
    '<span class="metric-ico">'+icon(glyph)+'</span><span class="metric-label">'+esc(label)+'</span><strong>'+quantity(value)+'</strong></button>').join('')+'</div></section>'
}

function categoryChart(published){
  const abbreviated=['Venta','Renteras','Preventa','Dep. venta','Arriendo','Terrenos','VIP','Miti Miti']
  const values=categories.map(category=>published.filter(property=>property.category===category).length)
  const peak=Math.max(1,...values)
  return '<section class="panel pad overview-chart"><div class="collection-title"><h2>Inventario por categoría</h2></div>'+
    '<div class="chart-summary"><strong>'+quantity(published.length)+'</strong><span>propiedades publicadas</span></div>'+
    '<div class="chart-area">'+values.map((value,i)=>
    '<button type="button" class="chart-column" data-action="open-category" '+dataId(categories[i])+' title="'+attr(categories[i]+': '+value)+'" aria-label="'+attr(categories[i]+': '+value)+'">'+
    '<span class="chart-track"><span class="chart-bar" style="--bar-height:'+Math.round(value/peak*76+6)+'%" '+(value?'':'data-empty')+'>'+
    (value?'<b>'+quantity(value)+'</b>':'')+'</span></span><span>'+esc(abbreviated[i])+'</span></button>').join('')+'</div></section>'
}


function hero(property){
  const photo=imageUrl(property)
  const meta=property.built??property.land
  return '<section class="hero" aria-label="Propiedad destacada">'+(photo?'<img class="hero-img" src="'+attr(photo)+'" alt="">':'')+'<div class="hero-shade"></div>'+
    '<img class="hero-watermark" src="./assets/logo.webp" alt="" aria-hidden="true">'+
    '<span class="hero-mark">'+esc(property.category)+(property.sample?' · Muestra':'')+'</span>'+
    '<div class="hero-content"><span class="kicker">'+icon('star')+' Propiedad destacada</span><h2>'+esc(property.title)+'</h2>'+
    '<div class="location">'+icon('pin')+esc([property.sector,property.city].filter(Boolean).join(' · '))+'</div>'+
    '<div class="price">'+esc(money(property.price))+'</div>'+
    '<div class="hero-foot">'+button('Ver propiedad','property','home','light',dataId(property.id))+
    (meta!=null?'<span class="meta" style="color:#f4e9ed">'+icon('area')+esc(quantity(meta))+' m²</span>':'')+'</div></div></section>'
}
function emptyHero(){
  return '<section class="hero"><div class="hero-shade"></div><div class="hero-content"><span class="kicker">'+icon('building')+' Catálogo RG</span>'+
    '<h2>Encuentra tu próximo espacio</h2><div class="location">'+icon('pin')+'Cuenca, Ecuador</div>'+
    '<div class="hero-foot">'+(has('agent')?button('Publicar una propiedad','new-property','plus','light'):button('Ver catálogo','page','search','light',dataId('catalog')))+'</div></div></section>'
}
function collectionHeader(full){
  return '<div class="collection-title"><div><h2>'+(full?'Explorar propiedades':'Catálogo de propiedades')+'</h2></div>'+
    (full?'':button('Ver catálogo','page',null,'ghost',dataId('catalog')))+'</div>'
}
function filterBar(){
  const field=(id,label,value)=>'<label class="field"><span class="small">'+label+'</span><input type="number" min="0" id="'+id+'" value="'+attr(value)+'"></label>'
  return '<div class="filters"><div class="search"><label class="searchbox">'+icon('search')+
    '<input id="search-input" aria-label="Buscar propiedades" placeholder="Busca por sector, código o asesor" value="'+attr(search)+'"></label>'+
    '<select id="sort" aria-label="Ordenar propiedades">'+options([['recent','Más recientes'],['min','Menor precio'],['max','Mayor precio'],['title','Por nombre']],sort)+'</select>'+
    iconButton(showFilters?'Ocultar filtros':'Más filtros','filters','filter','aria-expanded="'+showFilters+'"')+'</div>'+
    '<div class="filter-chips" aria-label="Categorías">'+['',...categories].map(value=>'<button type="button" class="'+cls('pill',category===value&&'active')+'" data-action="category" '+dataId(value)+' aria-pressed="'+(category===value)+'">'+esc(value||'Todas')+'</button>').join('')+'</div>'+
    (showFilters?'<div class="panel pad fields">'+field('filter-price','Precio máximo en USD',maxPrice)+field('filter-rooms','Dormitorios mínimos',minRooms)+
    (user()?'<label class="field"><span class="small">Visibilidad</span><select id="ownership">'+options([['all','Todas las captaciones visibles'],['mine','Mis captaciones'],['draft','Borradores que gestiono']],ownership)+'</select></label>':'')+
    button('Restablecer filtros','clear-filters',null,'ghost')+'</div>':'')+'</div>'
}
function selectedProperties(){
  const terms=fold(search).split(/\s+/).filter(Boolean)
  const rows=routeArray('properties').filter(record=>{
    const hay=fold([record.title,record.category,record.type,record.city,record.sector,record.code,record.author,record.description,record.condition].join(' '))
    return (!category||record.category===category)&&terms.every(term=>hay.includes(term))&&
      (!maxPrice||(record.price!=null&&record.price<=Number(maxPrice)))&&(!minRooms||(record.bedrooms!=null&&record.bedrooms>=Number(minRooms)))&&
      (ownership==='all'||(ownership==='mine'&&record.ownerId===user()?.id)||(ownership==='draft'&&!record.published&&record.editable))
  })
  const comparators={
    title:(a,b)=>a.title.localeCompare(b.title,'es'),
    min:(a,b)=>(a.price??Infinity)-(b.price??Infinity),
    max:(a,b)=>(b.price??-Infinity)-(a.price??-Infinity)
  }
  if(comparators[sort])rows.sort(comparators[sort])
  return rows
}
function results(full){
  return '<div class="results" id="results">'+resultsContent(full)+'</div>'
}
function resultsContent(full){
  const values=selectedProperties()
  return '<div class="results-message" aria-live="polite">'+values.length+' '+(values.length===1?'propiedad':'propiedades')+'</div>'+
    (values.length?(full?'<div class="cards catalog-grid">'+values.map(card).join('')+'</div>':propertyTable(values)):
      empty('No hay propiedades con estos filtros.'))
}
function propertyTable(items){
  return '<div class="table-scroll"><table class="activity-table"><thead><tr><th>Propiedad</th><th>Categoría</th><th>Precio</th><th>Asesor</th><th><span class="only-reader">Acciones</span></th></tr></thead><tbody>'+
    items.map(item=>'<tr><td><button class="table-property" type="button" data-action="property" '+dataId(item.id)+'>'+
    '<span class="table-photo">'+coverMarkup(imageUrl(item))+'</span><span><strong>'+esc(item.title)+'</strong><small>'+esc(item.sector)+'</small></span></button></td>'+
    '<td><span class="tag '+(item.published?'':'red')+'">'+esc(item.published?item.category:'Borrador')+'</span></td><td><strong>'+esc(money(item.price))+'</strong></td>'+
    '<td>'+esc(item.author)+'</td><td>'+iconButton('Ver ficha de '+item.title,'property','right',dataId(item.id))+'</td></tr>').join('')+'</tbody></table></div>'
}

function meta(property){
  return [['area',property.built,'m² construidos'],['area',property.land,'m² de terreno'],['bed',property.bedrooms,'dorm.'],['bath',property.bathrooms,'baños'],['car',property.parking,'parq.']]
    .filter(([,value])=>value!=null).map(([glyph,value,unit])=>'<span>'+icon(glyph)+esc(quantity(value))+' '+unit+'</span>').join('')
}
function coverMarkup(url){
  return url?'<img class="cover" src="'+attr(url)+'" alt="" loading="lazy">':'<span class="placehold">'+icon('home')+'</span>'
}
function card(property){
  const [id,title,place]=[property.id,property.title,[property.sector,property.city].filter(Boolean).join(' · ')]
  return '<article class="panel card"><button class="card-media" type="button" data-action="property" '+dataId(id)+' aria-label="'+attr(title)+'">'+
    coverMarkup(imageUrl(property))+'<img class="brand-watermark" src="./assets/logo.webp" alt=""><span class="badge">'+esc(property.category)+'</span>'+
    (property.sample||!property.published?'<span class="sample">'+(property.sample?'Muestra':'Borrador')+'</span>':'')+'</button><div class="card-inner">'+
    '<button class="card-title" type="button" data-action="property" '+dataId(id)+'>'+esc(title)+'</button><div class="location">'+icon('pin')+esc(place)+'</div>'+
    '<div class="price">'+esc(money(property.price))+'</div><div class="meta">'+meta(property)+'</div>'+
    '<div class="card-foot"><div class="author">'+avatar(property.author,'',true)+esc(property.author)+'</div>'+
    (property.editable&&has('agent')?button('Editar','edit-property',null,'icon-link',dataId(id)):button('Ver ficha','property',null,'icon-link',dataId(id)))+'</div></div></article>'
}
function catalogPage(){
  return header('Catálogo de propiedades','Encuentra opciones por sector, categoría o presupuesto.',has('agent')?button('Nueva captación','new-property','plus','primary'):'')+
    '<section class="panel pad">'+collectionHeader(true)+filterBar()+results(true)+'</section>'
}

function calendar(kind,month,points,date=''){
  const entries=monthDates(month)
  const offset=(entries[0].weekday+6)%7
  return '<div class="calendar"><div class="month-nav">'+iconButton('Mes anterior','month','left','data-kind="'+kind+'" data-change="-1"')+
    '<span>'+esc(monthTitle(month))+'</span>'+iconButton('Mes siguiente','month','right','data-kind="'+kind+'" data-change="1"')+'</div>'+
    '<div class="weekdays">'+names.map(name=>'<span>'+name+'</span>').join('')+'</div><div class="days">'+
    '<span></span>'.repeat(offset)+entries.map(day=>{
      const classes=cls('day',currentDate===day.date&&'today',points.has(day.date)&&'point',date===day.date&&'chosen')
      return '<button type="button" class="'+classes+'" data-action="day" data-kind="'+kind+'" '+dataId(day.date)+' aria-label="'+attr(dayTitle(day.date))+'" aria-pressed="'+(date===day.date)+'"'+(currentDate===day.date?' aria-current="date"':'')+'>'+day.day+'</button>'
    }).join('')+'</div></div>'
}
const eventSort=(a,b)=>(a.date+(a.time||'00:00')).localeCompare(b.date+(b.time||'00:00'))
function visibleEvents(events,date,max=99){
  return events.filter(event=>date?event.date===date:event.date>=currentDate).sort(eventSort).slice(0,max)
}
function eventRows(events){
  if(!events.length)return '<div class="empty-mini">No hay eventos para mostrar.</div>'
  return '<div class="agenda-list">'+events.map(event=>'<div class="event-row"><span class="date-chip"><b>'+Number(event.date.slice(8))+'</b>'+esc(shortMonth(event.date))+'</span>'+
    '<button type="button" class="event-open" data-action="event" '+dataId(event.id)+'><strong>'+esc(event.title)+'</strong>'+
    '<small>'+esc([event.time,event.kind,event.place].filter(Boolean).join(' · '))+'</small></button>'+
    (event.editable?iconButton('Editar evento','edit-event','edit',dataId(event.id)):'')+'</div>').join('')+'</div>'
}

function agendaWidget(){
  const events=publicEvents()
  return '<section class="panel pad"><div class="widget-head">'+tile('calendar','Agenda pública')+
    (user()?iconButton('Agregar evento','new-event','plus','data-kind="agenda"'):iconButton('Abrir agenda','page','right',dataId('agenda')))+'</div>'+
    calendar('agenda',agendaMonth,new Set(events.map(event=>event.date)),agendaDay)+
    '<div class="agenda-title"><h3>'+(agendaDay?esc(Number(agendaDay.slice(8))+' '+shortMonth(agendaDay)):'Próximos eventos')+'</h3>'+
    (agendaDay?button('Ver próximos','reset-day',null,'ghost','data-kind="agenda"'):button('Ver agenda','page',null,'icon-link',dataId('agenda')))+'</div>'+
    eventRows(visibleEvents(events,agendaDay,3))+'</section>'
}
function privateWidget(){
  return '<details class="panel pad foldable" id="private-widget" '+(privateExpanded?'open':'')+'><summary>'+tile('lock','Mi agenda privada')+
    '<span class="widget-close">'+icon('down')+'</span></summary><div class="widget-content">'+
    (user()?eventRows(visibleEvents(myEvents(),'',2))+'<div class="action-row">'+button('Abrir mi agenda','page','calendar','ghost',dataId('private'))+iconButton('Agregar evento privado','new-event','plus','data-kind="private"')+'</div>':
      '<p class="widget-copy">Accede para ver tus eventos y tareas.</p>'+button('Iniciar sesión','login',null,'ghost'))+'</div></details>'
}
function compactWidgets(){
  const birthdays=routeArray('birthdays').filter(record=>record.date.slice(5,7)===currentDate.slice(5,7))
  const shifts=routeArray('shifts').filter(row=>row.date>=currentDate)
  const next=shifts[0]?.date
  const reqs=routeArray('requests').filter(record=>record.status!=='Resuelto')
  const summaries=[
    ['birthdays',user()?(birthdays.length?birthdays.length+' este mes':'Sin cumpleaños este mes'):'Calendario del equipo'],
    ['cleaning',user()?(next?'Próximo turno · '+Number(next.slice(8))+' '+shortMonth(next):'Turnos de martes y jueves'):'Turnos de martes y jueves'],
    ['requests',user()?(reqs.length?reqs.length+' '+(reqs.length===1?'abierto':'abiertos'):'Sin solicitudes abiertas'):'Solicitudes del equipo']
  ]
  return summaries.map(([id,summary])=>'<section class="panel pad"><button type="button" class="widget-compact" data-action="page" '+dataId(id)+'><div class="widget-head">'+
    tile(pages[id][1],pages[id][0])+'<span class="widget-close">'+icon('right')+'</span></div><p class="widget-copy">'+esc(summary)+'</p></button></section>').join('')
}
function agendaPage(privateMode){
  const kind=privateMode?'private':'agenda'
  const month=privateMode?privateMonth:agendaMonth
  const day=privateMode?privateDay:agendaDay
  const events=privateMode?myEvents():publicEvents()
  return header(privateMode?'Mi agenda privada':'Agenda pública',privateMode?'Tus eventos y tareas en hora de Ecuador.':'Reuniones, visitas y eventos compartidos · Hora de Ecuador',
    user()?button('Nuevo evento','new-event','plus','primary','data-kind="'+kind+'"'):'')+
    '<div class="full-agenda"><section class="panel pad"><div class="widget-head">'+tile(privateMode?'lock':'calendar','Calendario')+'</div>'+
    calendar(kind,month,new Set(events.map(event=>event.date)),day)+'</section><div class="stack"><section class="panel pad"><div class="widget-head">'+
    tile('clock',day?capitalize(dayTitle(day)):'Próximos eventos')+
    (day?button('Ver próximos','reset-day',null,'ghost','data-kind="'+kind+'"'):'')+'</div>'+eventRows(visibleEvents(events,day))+'</section>'+
    (!privateMode?privateWidget():'')+'</div></div>'
}

function birthdaysPage(){
  const records=routeArray('birthdays').filter(record=>record.date.slice(5,7)===birthdayMonth.slice(5,7))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name,'es'))
  const list=birthdayDay?records.filter(record=>record.date.slice(8)===birthdayDay.slice(8)):records
  return header('Cumpleaños','Calendario mensual del equipo · Hora de Ecuador',has('birthdays')?button('Agregar cumpleaños','new-birthday','plus','primary'):'')+
    '<div class="full-agenda"><section class="panel pad"><div class="widget-head">'+tile('cake','Calendario de cumpleaños')+'</div>'+
    calendar('birthday',birthdayMonth,new Set(records.map(record=>birthdayMonth+'-'+record.date.slice(8))),birthdayDay)+'</section>'+
    '<section class="panel pad"><div class="widget-head">'+tile('cake',birthdayDay?capitalize(dayTitle(birthdayDay)):'Cumpleaños del mes')+
    (birthdayDay?button('Todo el mes','reset-day',null,'ghost','data-kind="birthday"'):'')+'</div>'+
    (list.length?list.map(record=>'<div class="list-row"><div class="flex-left">'+avatar(record.name,record.photo)+'<div><strong>'+esc(record.name)+'</strong><div class="list-meta">'+
      Number(record.date.slice(8))+' de '+esc(monthTitle(birthdayMonth).split(' ')[0].toLowerCase())+'</div></div></div><div class="action-row">'+
      (has('birthdays')?iconButton('Editar cumpleaños','edit-birthday','edit',dataId(record.id)):'')+
      (has('admin')?iconButton('Eliminar cumpleaños','delete-birthday','trash',dataId(record.id)):'')+'</div></div>').join(''):
      empty('No hay cumpleaños en estas fechas.'))+'</section></div>'
}
function cleaningPage(){
  const rows=routeArray('shifts')
  const defaultDate=rows.find(row=>row.date>=currentDate)?.date||rows[0]?.date
  const date=cleaningDay||defaultDate||''
  const shifts=rows.filter(row=>row.date===date)
  const allFines=routeArray('fines')
  const groups=new Map()
  for(const fine of allFines){
    if(!groups.has(fine.person))groups.set(fine.person,[])
    groups.get(fine.person).push(fine)
  }
  const roster=routeArray('roster')
  const stats=new Map()
  for(const row of rows){
    if(!stats.has(row.person))stats.set(row.person,{name:row.name,office:0,bath:0})
    stats.get(row.person)[row.section==='Oficina'?'office':'bath']++
  }
  const statusTags={'Pendiente':'','Realizada':'green','No realizada':'red'}
  return header('Calendario de limpieza','Martes y jueves · Oficina y baño · Hora de Ecuador',
    has('cleaning')?button('Agregar participante','new-roster','users','primary'):'')+
    '<div class="cleaning-layout"><div class="stack"><section class="panel pad calendar-big"><div class="widget-head">'+tile('calendar','Turnos del mes')+'</div>'+
    calendar('cleaning',cleaningMonth,new Set(rows.map(row=>row.date)),date)+'</section>'+
    '<details class="panel pad foldable"><summary>'+tile('users','Reparto del mes')+'<span class="widget-close">'+icon('down')+'</span></summary><div class="widget-content">'+
    (stats.size?[...stats.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(person=>'<div class="list-row"><strong>'+esc(person.name)+'</strong><small>'+
    (person.office+person.bath)+' turnos · '+person.office+' oficina · '+person.bath+' baño</small></div>').join(''):empty('Aún no hay turnos asignados.'))+'</div></details></div>'+
    '<div class="stack"><section class="panel pad"><div class="widget-head">'+tile('broom',date?capitalize(dayTitle(date)):'Turno próximo')+'</div>'+
    (shifts.length?'<div class="turns">'+shifts.map(shift=>'<div class="turn"><span class="section">'+esc(shift.section)+'</span><span>'+esc(shift.name)+'</span>'+
      (has('cleaning')&&shift.date<=currentDate?'<select class="attendance" aria-label="Asistencia de '+attr(shift.name)+'" data-date="'+shift.date+'" data-section="'+attr(shift.section)+'">'+
      options(Object.keys(statusTags),shift.status)+'</select>':'<span class="tag '+statusTags[shift.status]+'">'+esc(shift.status)+'</span>')+'</div>').join('')+'</div>':
      empty(date?'Sin turnos en esta fecha.':'Los turnos se generan al contar con dos participantes activos.'))+'</section>'+
    '<details class="panel pad foldable"><summary>'+tile('inbox','Multas acumuladas')+'<span class="inline-count">'+esc(money(allFines.length))+'</span>'+
    '<span class="widget-close">'+icon('down')+'</span></summary><div class="widget-content"><p class="small">$1 por cada tarea marcada como no realizada.</p>'+
      (groups.size?[...groups.values()].sort((a,b)=>b.length-a.length||a[0].name.localeCompare(b[0].name,'es')).map(group=>'<details class="fine-group"><summary><span>'+
      esc(group[0].name)+'</span><span class="inline-count">'+esc(money(group.length))+'</span></summary><ul>'+group.map(fine=>'<li>'+esc(capitalize(dayTitle(fine.date)))+' · '+esc(fine.section)+'</li>').join('')+'</ul></details>').join(''):
      '<p class="empty-mini">El equipo no tiene multas registradas.</p>')+'</div></details>'+
    (has('cleaning')?'<section class="panel pad"><div class="widget-head">'+tile('users','Participantes')+'</div>'+
      (roster.length?roster.map(item=>'<div class="list-row"><div><strong>'+esc(item.name)+'</strong><div class="list-meta">'+
      (item.active?'En rotación':'Fuera de rotación')+'</div></div><div class="action-row">'+
      iconButton('Editar participante','edit-roster','edit',dataId(item.id))+
      (item.active?iconButton('Retirar de próximos turnos','delete-roster','trash',dataId(item.id)):'')+'</div></div>').join(''):empty('Agrega integrantes para crear la rotación.'))+'</section>':'')+
    '</div></div>'
}
function requestsPage(){
  const records=routeArray('requests')
  return header('Requerimientos','Comparte con el equipo las propiedades que necesita cada cliente.',button('Nuevo requerimiento','new-request','plus','primary'))+
    (records.length?'<div class="request-grid">'+records.map(record=>'<article class="panel pad request-card"><div class="widget-head">'+
      '<span class="tag '+(record.status==='Resuelto'?'green':'red')+'">'+esc(record.status)+'</span>'+
      (record.priority==='Urgente'?'<span class="badge">Urgente</span>':'')+'</div><h3>'+esc(record.title)+'</h3>'+
      '<div class="meta">'+esc([record.category,record.sector,record.budget!=null?money(record.budget):''].filter(Boolean).join(' · '))+'</div>'+
      '<div class="request-desc">'+esc(record.description)+'</div><div class="list-row"><div class="author">'+avatar(record.author,'',true)+esc(record.author)+'</div><small>'+esc(record.date)+'</small></div>'+
      (record.editable?'<div class="action-row">'+button('Editar','edit-request','edit','',dataId(record.id))+iconButton('Eliminar requerimiento','delete-request','trash',dataId(record.id))+'</div>':'')+'</article>').join('')+'</div>':
      empty('Aún no hay requerimientos.'))
}
function teamPage(){
  const records=routeArray('accounts')
  return header('Usuarios y roles','Crea cuentas, asigna permisos y activa a los nuevos integrantes.',button('Nueva cuenta','new-user','plus','primary'))+
    '<section class="panel pad"><div class="widget-head">'+tile('users','Cuentas del equipo')+'</div>'+
    records.map(item=>'<div class="list-row"><div class="flex-left">'+avatar(item.name,item.photo)+'<div><strong>'+esc(item.name)+'</strong><div class="list-meta">'+esc(item.username)+
    '</div><div class="tag-list">'+item.roles.map(role=>'<span class="tag">'+esc(roles[role])+'</span>').join('')+'</div></div></div><div class="action-row">'+
    '<span class="tag '+(item.active?'green':'')+'">'+(item.active?'Activa':'Inactiva')+'</span>'+iconButton('Editar cuenta','edit-user','edit',dataId(item.id))+'</div></div>').join('')+
    '</section>'
}

function propertyDetail(property,index=0){
  const photos=propertyPhotos(property)
  const selected=photos[index]
  activeDocument={id:property.id,index}
  const location=[property.sector,property.city,property.province].filter(Boolean).join(' · ')
  const blocks=[['Primera planta',property.first],['Segunda planta',property.second],['Tercera planta',property.third],['Área externa',property.outdoor],
    ['Servicios',(property.services||[]).join(' · ')],['Ambientes',(property.amenities||[]).join(' · ')],['Beneficios',(property.benefits||[]).join(' · ')],
    ['Construcción',property.construction],['Acabados',property.finishes]]
  const badges=[property.code,property.condition,property.area,property.age!=null?quantity(property.age)+' años':null,property.floors!=null?quantity(property.floors)+' pisos':null,property.basements!=null?quantity(property.basements)+' subsuelos':null,property.fee!=null?'Alícuota '+money(property.fee):null,property.sample?'Ficha de muestra':null,!property.published?'Borrador':null].filter(Boolean)
  const owner=property.privateData
  const driveLabels={pending:'Respaldo en Drive pendiente',saved:'Originales respaldados en Drive',error:'Drive pendiente de reintento'}
  showDialog('Ficha de propiedad','<div class="gallery">'+coverMarkup(selected?.url)+'<img class="brand-watermark" src="./assets/logo.webp" alt="">'+
    '<span class="badge">'+esc(property.category)+'</span></div>'+
    (photos.length>1?'<div class="thumbs">'+photos.map((photo,i)=>'<button type="button" class="thumb '+(i===index?'active':'')+
      '" data-action="gallery" data-index="'+i+'" aria-label="Ver foto '+(i+1)+'"><img src="'+attr(photo.url)+'" alt=""></button>').join('')+'</div>':'')+
    '<div class="detail-title"><div><h2>'+esc(property.title)+'</h2><div class="location">'+icon('pin')+esc(location)+'</div></div><div class="price">'+esc(money(property.price))+'</div></div>'+
    '<div class="meta">'+meta(property)+'</div><div class="detail-text"><div class="tag-list">'+badges.map(value=>'<span class="tag">'+esc(value)+'</span>').join('')+'</div>'+
    (property.description?'<p>'+esc(property.description)+'</p>':'')+
    (property.address&&property.showAddress?'<p>'+icon('pin')+' '+esc(property.address)+'</p>':'')+
    '<div class="author">'+avatar(property.author,'',true)+'Publicado por '+esc(property.author)+'</div>'+
    (property.contact?'<p>Contacto comercial · '+esc(property.contact)+'</p>':'')+
    blocks.filter(([,value])=>value).map(([title,value])=>'<div class="detail-block"><h3>'+esc(title)+'</h3><p>'+esc(value)+'</p></div>').join('')+
    (owner?'<details class="form-details"><summary>Datos privados de la captación</summary>'+
      [owner.name,owner.idNumber,owner.phone,owner.email,owner.address,owner.observations,owner.cavida,
      owner.commission!=null?'Comisión · '+owner.commission+' %':null,owner.date?'Fecha de captación · '+owner.date:null,
      owner.permission?'Autorización de corretaje registrada':null,driveLabels[property.driveState]].filter(Boolean).map(value=>'<p>'+esc(value)+'</p>').join('')+'</details>':'')+
    '</div><div class="dialog-actions">'+
    (property.mapUrl&&property.showAddress?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+attr(property.mapUrl)+'">'+icon('pin')+' Mapa</a>':'')+
    (selected?.id&&property.editable?'<a class="btn" download="Foto-original" href="'+attr(originalMedia(selected.id))+'">'+icon('download')+' Foto original</a>':'')+
    (property.published?button('Compartir ficha','share','share','',dataId(property.id)):'')+
    button('Crear anuncio','advertisement','sparkle','primary',dataId(property.id))+
    (property.editable?(has('agent')?button('Editar','edit-property','edit','',dataId(property.id)):'')+iconButton('Eliminar captación','delete-property','trash',dataId(property.id)):'')+'</div>',{wide:true})
}
function eventDetail(event){
  showDialog(event.title,'<div class="detail-text"><div class="meta"><span>'+icon('calendar')+esc(capitalize(dayTitle(event.date)))+'</span>'+
    (event.time?'<span>'+icon('clock')+esc(event.time)+' · Ecuador</span>':'')+(event.place?'<span>'+icon('pin')+esc(event.place)+'</span>':'')+'</div>'+
    '<div class="author">'+avatar(event.author,'',true)+esc(event.author)+'</div>'+
    '<div class="tag-list"><span class="tag">'+(event.public?'Público':'Privado')+'</span>'+(event.kind?'<span class="tag">'+esc(event.kind)+'</span>':'')+'</div>'+
    (event.description?'<p>'+esc(event.description)+'</p>':'')+'</div>'+
    (event.editable?'<div class="dialog-actions">'+button('Editar evento','edit-event','edit','primary',dataId(event.id))+
      button('Eliminar','delete-event','trash','danger',dataId(event.id))+'</div>':''))
}

function assistantMarkup(){
  return '<div class="assistant" id="assistant"><button type="button" class="assistant-button" data-action="assistant" aria-label="Asistente de RG" aria-expanded="false" title="Abrir o mover el asistente">'+icon('message')+'</button></div>'+
    '<div class="assistant-pop" id="assistant-pop" hidden><h3>¿Qué necesitas?</h3><p>Elige dónde quieres ir.</p>'+
      button('Buscar una propiedad','page','search','',dataId('catalog'))+
      button('Ver próximos eventos','page','calendar','',dataId('agenda'))+
      (has('agent')?button('Subir una captación','new-property','plus'):button('Acceder como integrante','login','login'))+
      (user()?button('Crear requerimiento','new-request','inbox'):'')+'</div>'
}
function storageKey(){return 'rg-assistant-position-'+(user()?.id||'visitante')}
function updateAssistant(){
  const frame=document.querySelector('#assistant')
  const panel=document.querySelector('#assistant-pop')
  if(!frame||!panel)return
  const x=Math.max(7,Math.min(window.innerWidth-58,assistantPosition?.x??window.innerWidth-70))
  const y=Math.max(7,Math.min(window.innerHeight-58,assistantPosition?.y??window.innerHeight-70))
  Object.assign(frame.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'})
  frame.firstElementChild.setAttribute('aria-expanded',String(assistantOpen))
  panel.hidden=!assistantOpen
  const panelX=Math.max(7,Math.min(window.innerWidth-panel.offsetWidth-7,x+51-panel.offsetWidth))
  const panelY=y>panel.offsetHeight+12?y-panel.offsetHeight-7:Math.min(window.innerHeight-panel.offsetHeight-7,y+58)
  Object.assign(panel.style,{top:Math.max(7,panelY)+'px',left:panelX+'px'})
}
function readAssistant(){
  assistantPosition=null
  try{assistantPosition=JSON.parse(localStorage.getItem(storageKey()))}catch{}
}
root.addEventListener('pointerdown',event=>{
  const button=event.target.closest('.assistant-button')
  if(!button||event.button!==0)return
  const rect=button.getBoundingClientRect()
  assistantDrag={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,id:event.pointerId,moved:false}
  button.setPointerCapture(event.pointerId)
})
root.addEventListener('pointermove',event=>{
  if(!assistantDrag||event.pointerId!==assistantDrag.id)return
  const {x,y,left,top}=assistantDrag
  if(!assistantDrag.moved&&Math.hypot(event.clientX-x,event.clientY-y)<5)return
  assistantDrag.moved=true
  assistantPosition={x:left+event.clientX-x,y:top+event.clientY-y}
  updateAssistant()
})
function finishDrag(event){
  if(!assistantDrag||event.pointerId!==assistantDrag.id)return
  if(assistantDrag.moved){
    const rect=document.querySelector('#assistant').getBoundingClientRect()
    assistantPosition={x:rect.left,y:rect.top}
    try{localStorage.setItem(storageKey(),JSON.stringify(assistantPosition))}catch{}
    suppressAssistantClick=true
    setTimeout(()=>{suppressAssistantClick=false},240)
  }
  assistantDrag=null
}
root.addEventListener('pointerup',finishDrag)
root.addEventListener('pointercancel',finishDrag)
window.addEventListener('resize',updateAssistant)
root.addEventListener('toggle',event=>{
  if(event.target.id==='private-widget')privateExpanded=event.target.open
},true)

function changeMonth(kind,offset){
  const current={agenda:agendaMonth,private:privateMonth,birthday:birthdayMonth,cleaning:cleaningMonth}[kind]
  if(!current)return
  const [year,month]=current.split('-').map(Number)
  const key=new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7)
  if(kind==='cleaning'){cleaningMonth=key;cleaningDay='';return refresh()}
  if(kind==='agenda'){agendaMonth=key;agendaDay=''}
  if(kind==='private'){privateMonth=key;privateDay=''}
  if(kind==='birthday'){birthdayMonth=key;birthdayDay=''}
  render()
}
function selectDay(kind,date){
  if(kind==='agenda')agendaDay=agendaDay===date?'':date
  if(kind==='private')privateDay=privateDay===date?'':date
  if(kind==='birthday')birthdayDay=birthdayDay===date?'':date
  if(kind==='cleaning')cleaningDay=cleaningDay===date?'':date
  render()
}
async function complete(message){
  await refresh()
  notify(message)
}
function deleteItem(route,id){
  const messages={
    properties:['Eliminar captación','La ficha dejará de aparecer en el catálogo. Las copias ya respaldadas en Drive se conservan.'],
    events:['Eliminar evento','Se retirará el evento de tu agenda y del calendario público si lo compartiste.'],
    requests:['Eliminar requerimiento','El requerimiento se retirará del panel del equipo.'],
    birthdays:['Eliminar cumpleaños','La persona se retirará del calendario de cumpleaños.'],
    roster:['Retirar participante','Los turnos y multas anteriores se conservan. Se redistribuirán los próximos turnos.']
  }
  confirmDelete(...messages[route],route,id,()=>complete(route==='roster'?'Participante retirado.':'Registro eliminado.'))
}
function share(id){
  const url=new URL(location.pathname,location.origin)
  url.searchParams.set('prop',id)
  if(navigator.clipboard?.writeText){
    return navigator.clipboard.writeText(url.href).then(()=>notify('Enlace copiado.')).catch(()=>showShare(url))
  }
  showShare(url)
}
function showShare(url){
  showDialog('Compartir ficha','<div class="field"><label for="share-url">Enlace de la propiedad</label><input id="share-url" value="'+attr(url.href)+'" readonly></div>')
  dialog.querySelector('#share-url').select()
}
async function showAdvertisement(record){
  const selected=propertyPhotos(record)[activeDocument?.id===record.id?activeDocument.index:0]
  showDialog('Anuncio para redes',loader('Diseñando anuncio…'))
  const current=dialog.querySelector('.loader')
  const blob=await advertisement(record,selected?.url)
  if(!dialog.open||dialog.querySelector('.loader')!==current)return
  if(advertisementUrl)URL.revokeObjectURL(advertisementUrl)
  advertisementUrl=URL.createObjectURL(blob)
  const name='RG-'+(fold(record.code||record.title).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'propiedad')+'.png'
  showDialog('Anuncio para redes','<div class="ad-preview"><img src="'+attr(advertisementUrl)+'" alt="Anuncio de '+attr(record.title)+'"></div>'+
    '<p class="small">Formato vertical 4:5 · 1080 × 1350 px</p><div class="dialog-actions">'+button('Volver a la ficha','property','home','',dataId(record.id))+
    '<a class="btn primary" href="'+attr(advertisementUrl)+'" download="'+attr(name)+'">'+icon('download')+' Descargar anuncio</a></div>')
}

async function handle(action,id,dataset){
  switch(action){
    case 'page':page(id);break
    case 'toggle-menu':mobileMenu=!mobileMenu;render();break
    case 'login':signin();break
    case 'logout':
      await api('logout',{method:'POST'})
      dialog.close()
      session={...session,user:null}
      ownership='all'
      if(!guestPages.includes(view))view='home'
      readAssistant()
      await refresh()
      notify('Sesión finalizada.')
      break
    case 'profile':
      showDialog('Mi cuenta','<div class="list-row"><div class="flex-left">'+avatar(user().name,user().photo)+'<div><strong>'+esc(user().name)+'</strong><div class="small">'+esc(roleName())+'</div></div></div></div>'+
      '<div class="dialog-actions">'+button('Cerrar sesión','logout','logout','danger')+'</div>')
      break
    case 'filters':showFilters=!showFilters;render();break
    case 'category':category=id;render();break
    case 'open-category':category=id;search='';page('catalog');break
    case 'clear-filters':search='';category='';sort='recent';ownership='all';maxPrice='';minRooms='';render();break
    case 'new-property':propertyForm({},user(),has('admin'),()=>complete('Captación guardada.'));break
    case 'edit-property':propertyForm(find('properties',id),user(),has('admin'),()=>complete('Captación actualizada.'));break
    case 'property':{
      const property=find('properties',id)
      if(property)propertyDetail(property)
      break
    }
    case 'gallery':propertyDetail(find('properties',activeDocument.id),Number(dataset.index));break
    case 'share':await share(id);break
    case 'advertisement':await showAdvertisement(find('properties',id));break
    case 'month':await changeMonth(dataset.kind,Number(dataset.change));break
    case 'day':selectDay(dataset.kind,id);break
    case 'reset-day':selectDay(dataset.kind,'');break
    case 'event':eventDetail(find('events',id));break
    case 'new-event':eventForm({},(dataset.kind==='private'?privateDay:agendaDay)||currentDate,dataset.kind==='agenda',()=>complete('Evento guardado.'));break
    case 'edit-event':eventForm(find('events',id),currentDate,false,()=>complete('Evento actualizado.'));break
    case 'new-request':requestForm({},()=>complete('Requerimiento guardado.'));break
    case 'edit-request':requestForm(find('requests',id),()=>complete('Requerimiento actualizado.'));break
    case 'new-birthday':birthdayForm({},routeArray('team'),()=>complete('Cumpleaños agregado.'));break
    case 'edit-birthday':birthdayForm(find('birthdays',id),routeArray('team'),()=>complete('Cumpleaños actualizado.'));break
    case 'new-roster':rosterForm({},routeArray('team'),()=>complete('Rotación actualizada.'));break
    case 'edit-roster':rosterForm(find('roster',id),routeArray('team'),()=>complete('Rotación actualizada.'));break
    case 'new-user':userForm({},()=>complete('Cuenta guardada.'));break
    case 'edit-user':userForm(find('accounts',id),async()=>{
      const updated=await api('session')
      session=updated
      await complete('Cuenta actualizada.')
    });break
    case 'delete-property':deleteItem('properties',id);break
    case 'delete-event':deleteItem('events',id);break
    case 'delete-request':deleteItem('requests',id);break
    case 'delete-birthday':deleteItem('birthdays',id);break
    case 'delete-roster':deleteItem('roster',id);break
    case 'close':dialog.close();break
    case 'assistant':
      if(!suppressAssistantClick){assistantOpen=!assistantOpen;updateAssistant()}
      break
  }
}

document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]')
  if(!target){
    if(assistantOpen&&!event.target.closest('#assistant-pop')){assistantOpen=false;updateAssistant()}
    return
  }
  const {action,id}=target.dataset
  if(action.startsWith('demo-'))return
  if(action!=='assistant'&&assistantOpen){assistantOpen=false;updateAssistant()}
  try{await handle(action,id,target.dataset)}catch(error){
    if(action==='advertisement'&&activeDocument){propertyDetail(find('properties',activeDocument.id),activeDocument.index)}
    notify(error.message,true)
  }
})
dialog.addEventListener('close',()=>{
  activeDocument=null
  if(advertisementUrl){URL.revokeObjectURL(advertisementUrl);advertisementUrl=''}
})
root.addEventListener('input',event=>{
  const input=event.target
  if(input.id==='search-input')search=input.value
  else if(input.id==='filter-price')maxPrice=input.value
  else if(input.id==='filter-rooms')minRooms=input.value
  else return
  document.querySelector('#results').innerHTML=resultsContent(view==='catalog')
})
root.addEventListener('change',async event=>{
  const input=event.target
  if(input.id==='sort')sort=input.value
  else if(input.id==='ownership')ownership=input.value
  else if(input.classList.contains('attendance')){
    input.disabled=true
    try{
      await api('attendance',{method:'PUT',data:{date:input.dataset.date,section:input.dataset.section,status:input.value}})
      await complete('Asistencia de limpieza registrada.')
    }catch(error){
      notify(error.message,true)
      await refresh()
    }
    return
  } else return
  document.querySelector('#results').innerHTML=resultsContent(view==='catalog')
})

async function start(){
  const started=performance.now()
  try{
    session=await api('session')
    readAssistant()
    await refresh()
    const id=new URLSearchParams(location.search).get('prop')
    const property=id&&find('properties',id)
    if(property)propertyDetail(property)
    else if(id)notify('Esta publicación ya no está disponible.',true)
  }catch(error){
    root.innerHTML='<main class="main">'+empty('No se pudo conectar con la aplicación. Recarga la página para volver a intentar.')+'</main>'
  }finally{
    setTimeout(()=>document.querySelector('#splash').classList.add('done'),Math.max(0,770-(performance.now()-started)))
  }
}

setInterval(async()=>{
  if(dialog.open)return
  const date=isoToday()
  if(date===currentDate)return
  const previous=monthCurrent()
  currentDate=date
  if(agendaMonth===previous){agendaMonth=monthCurrent();agendaDay=''}
  if(privateMonth===previous){privateMonth=monthCurrent();privateDay=''}
  if(birthdayMonth===previous){birthdayMonth=monthCurrent();birthdayDay=''}
  if(cleaningMonth===previous){cleaningMonth=monthCurrent();cleaningDay=''}
  try{await refresh()}catch{}
},25000)
start()
