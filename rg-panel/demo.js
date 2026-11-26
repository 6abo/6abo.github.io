import {categories,isoToday,roles,monthDates,fold} from './model.js'
import {rotate} from './rotation.js'

const prefix='rg.panel.demo.2.'
const id=()=>crypto.randomUUID()
const images=new Map()
let database
let current
let serial=Promise.resolve()

function today(){return isoToday()}
function addDays(n){
  const date=new Date(today()+'T12:00:00Z')
  date.setUTCDate(date.getUTCDate()+n)
  return date.toISOString().slice(0,10)
}
function seed(){
  const names=['Daniela Ruiz','Mateo Vega','Sofía Arias','Pablo Mora','Lucía Torres','Andrea León','Esteban Cruz']
  const users=[
    {id:'admin',name:'Christian · Demo',username:'admin',active:true,roles:Object.keys(roles),choice:'admin'},
    ...names.map((name,i)=>({id:'team-'+i,name,username:fold(name).replace(' ','.'),active:i===0,roles:['agent'],choice:i===0?'agent':''}))
  ]
  const examples=[
    ['casa','Casa con jardín en Cuenca',categories[0],'Casa','Sector residencial',129000,159,173.12,3],
    ['departamento','Departamento con vista',categories[3],'Departamento','González Suárez',69000,62,null,2],
    ['preventa','Residencia en preventa',categories[2],'Casa','Cuenca norte',null,145,150,3],
    ['terreno','Terreno residencial',categories[5],'Terreno','Afueras de Cuenca',48000,null,350,null],
    ['departamento','Departamento de dos dormitorios',categories[4],'Departamento','Centro de Cuenca',450,72,null,2]
  ]
  const properties=examples.map(([img,title,category,type,sector,price,built,land,bedrooms],i)=>({
    id:'demo-'+i,ownerId:users[i+1].id,code:'RG-10'+(i+1),title,category,type,sector,price,built,land,bedrooms,
    parking:i===0?2:null,city:'Cuenca',province:'Azuay',description:'Ficha ilustrativa del panel de demostración RG.',
    hero:'./assets/'+img+'.webp',photos:[],published:true,featured:i===0,sample:true,updated:new Date().toISOString()
  }))
  const events=[
    {id:'event-0',ownerId:'team-0',title:'Reunión del equipo comercial',date:addDays(1),time:'09:30',kind:'Reunión',place:'Oficina RG',public:true,sample:true},
    {id:'event-1',ownerId:'team-1',title:'Visita a propiedad',date:addDays(3),time:'15:00',kind:'Visita',place:'Cuenca',public:true,sample:true},
    {id:'event-2',ownerId:'team-2',title:'Seguimiento de captaciones',date:addDays(5),time:'10:00',kind:'Tarea',place:'Oficina RG',public:true,sample:true}
  ]
  return {
    users,properties,events,
    requests:[{id:'req-0',ownerId:'team-0',title:'Departamento de 2 habitaciones',category:categories[4],
      description:'Cerca de transporte público en Cuenca.',priority:'Normal',status:'Abierto',date:today(),sample:true}],
    birthdays:[{id:'bday-0',name:names[0],date:'2000-'+today().slice(5),personId:'team-0',sample:true}],
    roster:names.map((name,i)=>({id:'team-'+i,name,active:true})),shifts:{}
  }
}
function open(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('rg-panel-demo-v2',1)
    request.onupgradeneeded=()=>{
      request.result.createObjectStore('records')
      request.result.createObjectStore('photos',{keyPath:'id'})
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error)
  })
}
function requestStore(store,mode,fn){
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction(store,mode)
    const operation=fn(transaction.objectStore(store))
    transaction.oncomplete=()=>resolve(operation.result)
    transaction.onerror=()=>reject(transaction.error||operation.error)
    transaction.onabort=()=>reject(transaction.error)
  })
}
let initialized
async function initialize(){
  database=await open()
  const [record,photos]=await Promise.all([
    requestStore('records','readonly',store=>store.get('main')),
    requestStore('photos','readonly',store=>store.getAll())
  ])
  current=record||seed()
  for(const photo of photos) rememberPhoto(photo)
}
function rememberPhoto(photo){
  images.set(photo.id,{...photo,previewUrl:URL.createObjectURL(photo.preview),originalUrl:URL.createObjectURL(photo.original)})
}
function persist(){return requestStore('records','readwrite',store=>store.put(current,'main'))}
function session(){
  const row=current.users.find(row=>row.id===sessionStorage.getItem(prefix+'user')&&row.active)
  return row||null
}
function clearSecrets(user){
  if(!user)return null
  const {digest,choice,...details}=user
  return details
}
const admin=user=>user?.roles.includes('admin')
const can=(user,role)=>admin(user)||user?.roles.includes(role)
const owns=(user,item)=>user&&item?.ownerId===user.id
const edit=(user,item)=>owns(user,item)||admin(user)
const demand=(value,message)=>{if(!value)throw Error(message)}
function currentMonth(){return today().slice(0,7)}
function generateMonth(month,reset=false){
  const past=current.shifts[month]||[]
  if(current.shifts[month]&&!reset)return
  const prior=Object.entries(current.shifts).filter(([key])=>key<month).sort(([a],[b])=>a.localeCompare(b)).flatMap(([,rows])=>rows)
  const fixed=reset?past.filter(row=>row.date<=today()):[]
  current.shifts[month]=rotate(month,current.roster.filter(row=>row.active),fixed,prior,reset?addDays(1):'')
}
function populate(items,user,route){
  return items.map(item=>({...item,editable:route==='events'?!!owns(user,item):!!edit(user,item),
    author:current.users.find(row=>row.id===item.ownerId)?.name||'Asesor RG'}))
}
function getState(user,month){
  const properties=populate(current.properties,user,'properties').filter(item=>item.published||item.editable).map(item=>{
    if(item.editable)return item
    const {privateData,address,mapUrl,...rest}=item
    return {...rest,address:item.showAddress?address:'',mapUrl:item.showAddress?mapUrl:''}
  })
  const events=populate(current.events,user,'events').filter(item=>item.public||item.editable)
  if(!user)return {properties,events}
  generateMonth(currentMonth())
  if(month>=currentMonth())generateMonth(month)
  return {properties,events,requested:month,drive:false,
    shifts:current.shifts[month]||[],fines:Object.values(current.shifts).flat().filter(row=>row.status==='No realizada').sort((a,b)=>b.date.localeCompare(a.date)),
    roster:can(user,'cleaning')?current.roster:[],
    team:current.users.map(({id,name,photo,active})=>({id,name,photo,active})),
    accounts:admin(user)?current.users.map(clearSecrets):[],
    requests:populate(current.requests,user,'requests'),
    birthdays:current.birthdays.map(item=>({...item,overridePhoto:item.photo||'',photo:item.photo||current.users.find(row=>row.id===item.personId)?.photo||''}))
  }
}
async function digest(value){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('')
}
function valueOrNull(value){return value===''||value==null?null:Number(value)}

async function dispatch(path,method,data){
  const url=new URL(path,'https://demo.invalid/')
  const [route,itemId]=url.pathname.split('/').filter(Boolean)
  const user=session()
  if(route==='session')return {demo:true,setup:false,user:clearSecrets(user)}
  if(route==='login'){
    const person=current.users.find(row=>row.active&&row.username===fold(data.username))
    const correct=person&&(data.demoChoice?person.choice===data.demoChoice:person.digest===await digest(data.password))
    demand(correct,'Usa uno de los accesos de demostración o ingresa los datos de tu cuenta de prueba.')
    sessionStorage.setItem(prefix+'user',person.id)
    return {user:clearSecrets(person)}
  }
  if(route==='logout'){
    sessionStorage.removeItem(prefix+'user')
    return {ok:true}
  }
  if(route==='state')return getState(user,url.searchParams.get('month')||currentMonth())
  demand(user,'Accede con una cuenta de demostración.')
  if(route==='media'){
    if(method==='DELETE'){
      const photo=images.get(itemId)
      if(photo){
        URL.revokeObjectURL(photo.previewUrl)
        URL.revokeObjectURL(photo.originalUrl)
        images.delete(itemId)
        await requestStore('photos','readwrite',store=>store.delete(itemId))
      }
      return {ok:true}
    }
    demand(can(user,'agent')||can(user,'birthdays'),'Tu cuenta no puede subir imágenes.')
    const photo={id:id(),original:data.get('original'),preview:data.get('preview')}
    await requestStore('photos','readwrite',store=>store.put(photo))
    rememberPhoto(photo)
    return {id:photo.id}
  }
  if(route==='attendance'){
    demand(can(user,'cleaning'),'Tu cuenta no administra limpieza.')
    const shift=current.shifts[data.date.slice(0,7)]?.find(row=>row.date===data.date&&row.section===data.section)
    demand(shift&&shift.date<=today(),'Selecciona un turno de hoy o de una fecha pasada.')
    shift.status=data.status
    return {ok:true}
  }
  const table=current[route]
  demand(Array.isArray(table),'Sección no disponible.')
  const index=table.findIndex(row=>row.id===itemId)
  const old=table[index]
  const auth={
    users:()=>admin(user),
    properties:()=>can(user,'agent')&&(!old||edit(user,old)),
    events:()=>!old||owns(user,old),
    requests:()=>!old||edit(user,old),
    birthdays:()=>can(user,'birthdays')&&(method!=='DELETE'||admin(user)),
    roster:()=>can(user,'cleaning')
  }
  demand(auth[route]?.()&&(!itemId||old),'Tu cuenta no puede modificar este registro.')
  if(method==='DELETE'){
    if(route==='roster')old.active=false
    else table.splice(index,1)
  }else{
    const row={...old,...data,id:itemId||id()}
    if(['properties','events','requests'].includes(route))row.ownerId=old?.ownerId||user.id
    if(route==='properties'){
      row.published=!!data.published
      row.featured=admin(user)?!!data.featured:!!old?.featured
      row.showAddress=!!data.showAddress
      try{if(row.mapUrl&&!['http:','https:'].includes(new URL(row.mapUrl).protocol))row.mapUrl=''}catch{row.mapUrl=''}
      row.updated=new Date().toISOString()
      for(const key of ['price','land','built','bedrooms','bathrooms','parking','age','fee','floors','basements'])row[key]=valueOrNull(row[key])
    }
    if(route==='events')row.public=!!data.public
    if(route==='requests'){row.date=old?.date||today();row.budget=valueOrNull(row.budget)}
    if(route==='birthdays')demand(data.date&&monthDates(data.date.slice(0,7)).some(day=>day.date===data.date),'Selecciona un día válido para ese mes.')
    if(route==='users'){
      row.active=!!data.active
      row.username=fold(data.username)
      demand(!table.some(item=>item.id!==row.id&&item.username===row.username),'Ese usuario ya existe.')
      if(data.password){row.digest=await digest(data.password);delete row.choice}
      delete row.password
      demand(!row.active||row.choice||row.digest,'Asigna primero una contraseña de prueba.')
      demand(row.id!==user.id||(row.active&&row.roles.includes('admin')),'Conserva activa la cuenta de administración.')
    }
    if(old)table[index]=row
    else route==='properties'||route==='requests'?table.unshift(row):table.push(row)
  }
  if(route==='roster'){
    for(const month of Object.keys(current.shifts).filter(month=>month>=currentMonth()).sort())generateMonth(month,true)
    generateMonth(currentMonth())
  }
  return {ok:true}
}

export function demoApi(path,{method='GET',data}={}){
  initialized||=initialize()
  const next=serial.then(async()=>{
    await initialized
    const result=await dispatch(path,method,data)
    if((method!=='GET'&&!['login','logout'].includes(path))||path.startsWith('state'))await persist()
    return result
  })
  serial=next.catch(()=>{})
  return next
}
export const demoMedia=(id,original=false)=>images.get(id)?.[original?'originalUrl':'previewUrl']||''
