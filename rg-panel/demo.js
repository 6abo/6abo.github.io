import {categories,isoToday,roles,monthDates,fold} from './model.js'
import {rotate} from './rotation.js'
import {cityName,locationKey,provinces,sectorList} from './sectors.js'
import {validDate,weekStart} from './reporting.js'

const prefix='rg.panel.demo.2.'
const originalNames=['Daniela Ruiz','Mateo Vega','Sofía Arias','Pablo Mora','Lucía Torres','Andrea León','Esteban Cruz']
const socialChoices=['allowed','blocked','pending']
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
  const names=originalNames
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
    parking:i===0?2:null,city:'Cuenca',province:'Azuay',captureDate:addDays(-i),social:i%3===1?'blocked':'allowed',saleStatus:'available',description:'Ficha ilustrativa del panel de demostración RG.',
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
    roster:names.map((name,i)=>({id:'team-'+i,name,personId:'team-'+i,active:true})),shifts:{},reports:[],customSectors:[]
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
  current=migrate(record||seed())
  for(const photo of photos) rememberPhoto(photo)
}
function migrate(record){
  record.reports??=[]
  record.customSectors??=[]
  const names=new Map()
  const add=(value,id)=>{
    const key=fold(value)
    if(!key)return
    if(!names.has(key))names.set(key,id)
    else if(names.get(key)!==id)names.set(key,null)
  }
  for(const account of record.users) {
    add(account.name,account.id)
    for(const alias of account.nameHistory||[])add(alias,account.id)
    const initial=originalNames[Number(account.id.replace('team-',''))]
    if(account.id.startsWith('team-')&&initial)add(initial,account.id)
  }
  const accountIds=new Set(record.users.map(account=>account.id))
  for(const item of [...record.roster,...record.birthdays]){
    if(item.personId!==undefined)continue
    item.personId=accountIds.has(item.id)?item.id:names.get(fold(item.name))||''
  }
  for(const property of record.properties){
    property.saleStatus??='available'
    property.social??=property.sample&&!property.privateData?'allowed':'pending'
    if(!property.captureDate){
      const known=property.privateData?.date
      const fallback=property.updated?.slice(0,10)
      if(validDate(known))property.captureDate=known
      else if(validDate(fallback))property.captureDate=fallback
    }
  }
  return record
}
function linkedPerson(item){
  return current.users.find(account=>account.id===item.personId)
}
function presentShift(shift){
  const participant=current.roster.find(item=>item.id===shift.person)
  return {...shift,name:(participant&&linkedPerson(participant)?.name)||participant?.name||shift.name}
}
function locationDirectory(){
  const locations=[...current.customSectors]
  const known=new Set(locations.map(item=>locationKey(item.city,item.sector)))
  for(const {city,sector} of current.properties){
    const key=locationKey(city,sector)
    if(city&&sector&&!known.has(key)){
      known.add(key)
      locations.push({city,sector})
    }
  }
  return locations
}
async function hydratePhotos(record){
  const ids=new Set([...record.properties.flatMap(item=>item.photos||[]),
    ...record.birthdays.map(item=>item.photo),...record.users.map(item=>item.photo)])
  await Promise.all([...ids].filter(value=>value&&!images.has(value)).map(async value=>{
    const photo=await requestStore('photos','readonly',store=>store.get(value))
    if(photo&&!images.has(value))rememberPhoto(photo)
  }))
}
function rememberPhoto(photo){
  images.set(photo.id,{...photo,previewUrl:URL.createObjectURL(photo.preview),originalUrl:URL.createObjectURL(photo.original)})
}
function persist(){return requestStore('records','readwrite',store=>store.put(current,'main'))}
function session(){
  const row=current.users.find(row=>row.id===sessionStorage.getItem(prefix+'user')&&row.active&&String(row.credentialVersion||0)===(sessionStorage.getItem(prefix+'credential')||'0'))
  return row||null
}
function clearSecrets(user){
  if(!user)return null
  const {digest,passwordSalt,credentialVersion,nameHistory,choice,...details}=user
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
  const active=new Map()
  for(const row of current.roster){
    if(!row.active)continue
    const key=row.personId||row.id
    if(!active.has(key)||row.id===key)active.set(key,row)
  }
  current.shifts[month]=rotate(month,[...active.values()],fixed,prior,reset?addDays(1):'')
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
  if(!user)return {properties,events,locations:properties.map(({city,sector})=>({city,sector}))}
  generateMonth(currentMonth())
  if(month>=currentMonth())generateMonth(month)
  return {properties,events,requested:month,drive:false,locations:locationDirectory(),
    shifts:(current.shifts[month]||[]).map(presentShift),
    fines:Object.values(current.shifts).flat().filter(row=>row.status==='No realizada').map(presentShift).sort((a,b)=>b.date.localeCompare(a.date)),
    roster:can(user,'cleaning')?current.roster.map(item=>({...item,name:linkedPerson(item)?.name||item.name})):[],
    team:current.users.map(({id,name,photo,active})=>({id,name,photo,active})),
    accounts:admin(user)?current.users.map(clearSecrets):[],
    requests:populate(current.requests,user,'requests'),
    birthdays:current.birthdays.map(item=>{
      const account=linkedPerson(item)
      return {...item,name:account?.name||item.name,overridePhoto:item.photo||'',photo:item.photo||account?.photo||''}
    }),
    reports:populate(current.reports.filter(item=>admin(user)||owns(user,item)),user,'reports').map(item=>({...item,editable:!!owns(user,item)})),
    statsListings:current.properties.map(({ownerId,city,sector,privateData,captureDate,soldDate,saleStatus,social})=>({
      ownerId,author:current.users.find(account=>account.id===ownerId)?.name||'Asesor RG',
      city,sector,captureDate:privateData?.date||captureDate,soldDate,saleStatus,social
    }))
  }
}
const hex=bytes=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('')
async function digest(value,salt=''){
  const encoder=new TextEncoder()
  if(!salt)return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)))
  const key=await crypto.subtle.importKey('raw',encoder.encode(value),'PBKDF2',false,['deriveBits'])
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:600000,hash:'SHA-256'},key,256))
}
async function replacePassword(user,value){
  demand(typeof value==='string'&&value.length>=10&&value.length<=180,'Usa una contraseña de prueba de entre 10 y 180 caracteres.')
  user.passwordSalt=hex(crypto.getRandomValues(new Uint8Array(16)))
  user.digest=await digest(value,user.passwordSalt)
}
function saveSession(account){
  sessionStorage.setItem(prefix+'user',account.id)
  sessionStorage.setItem(prefix+'credential',String(account.credentialVersion||0))
}
function valueOrNull(value){return value===''||value==null?null:Number(value)}

async function dispatch(path,method,data){
  const url=new URL(path,'https://demo.invalid/')
  const [route,itemId]=url.pathname.split('/').filter(Boolean)
  const user=session()
  if(route==='session')return {demo:true,setup:false,user:clearSecrets(user),demoChoices:current.users.filter(person=>person.active&&person.choice).map(person=>person.choice)}
  if(route==='login'){
    const person=current.users.find(row=>row.active&&(data.demoChoice?row.choice===data.demoChoice:row.username===fold(data.username)))
    const correct=person&&(data.demoChoice||(person.digest&&typeof data.password==='string'&&
      person.digest===await digest(data.password,person.passwordSalt)))
    demand(correct,'Usa uno de los accesos de demostración o ingresa los datos de tu cuenta de prueba.')
    if(!data.demoChoice&&!person.passwordSalt&&data.password.length>=10&&data.password.length<=180) {
      await replacePassword(person,data.password)
      await persist()
    }
    saveSession(person)
    return {user:clearSecrets(person)}
  }
  if(route==='logout'){
    sessionStorage.removeItem(prefix+'user')
    sessionStorage.removeItem(prefix+'credential')
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
  if(route==='sale-status'&&method==='PUT'){
    const property=current.properties.find(item=>item.id===itemId)
    demand(property&&can(user,'agent')&&edit(user,property),'Tu cuenta no puede cambiar la venta de esta ficha.')
    demand(['available','sold'].includes(data.status),'Selecciona un estado válido.')
    if(property.saleStatus!==data.status){
      property.saleStatus=data.status
      property.soldDate=data.status==='sold'?today():''
    }
    return {ok:true}
  }
  if(route==='sectors'&&method==='POST'){
    demand(admin(user),'Solo el administrador puede ampliar el directorio.')
    const city=cityName(data.city),sector=String(data.sector||'').trim().replace(/\s+/g,' ')
    demand(city&&sector.length>=2&&sector.length<=120,'Elige una ciudad e ingresa un sector válido.')
    if(!sectorList(city,locationDirectory()).some(name=>fold(name)===fold(sector)))
      current.customSectors.push({city,sector})
    return {ok:true}
  }
  if(route==='password'&&method==='PUT'){
    demand(admin(user),'Solo el administrador puede restablecer las contraseñas.')
    const index=current.users.findIndex(item=>item.id===itemId)
    demand(index!==-1,'La cuenta ya no existe.')
    const account={...current.users[index]}
    await replacePassword(account,data.password)
    delete account.choice
    account.credentialVersion=(account.credentialVersion||0)+1
    current.users[index]=account
    if(account.id===user.id)saveSession(account)
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
    roster:()=>can(user,'cleaning'),
    reports:()=>!old||owns(user,old)
  }
  demand(auth[route]?.()&&(!itemId||old),'Tu cuenta no puede modificar este registro.')
  if(method==='DELETE'){
    if(route==='roster')old.active=false
    else table.splice(index,1)
  }else{
    const row={...old,...data,id:itemId||id()}
    if(['properties','events','requests'].includes(route))row.ownerId=old?.ownerId||user.id
    if(route==='properties'){
      const city=cityName(data.city)
      const sector=sectorList(city,current.customSectors,old?[old]:[]).find(name=>fold(name)===fold(data.sector))
      const unchanged=old&&old.city===data.city&&old.sector===data.sector
      demand((city&&sector)||unchanged,'Selecciona una ciudad y un sector del listado.')
      if(city&&sector){row.city=city;row.sector=sector;row.province=provinces[city]}
      demand(socialChoices.includes(data.social),'Indica el permiso para redes.')
      row.saleStatus=old?.saleStatus||'available'
      row.soldDate=old?.soldDate||''
      row.captureDate=validDate(data.privateData?.date)?data.privateData.date:old?.captureDate||today()
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
    if(route==='reports'){
      row.ownerId=user.id
      row.week=weekStart(data.week)
      row.note=String(data.note||'').trim()
      demand(row.week&&row.week<=weekStart()&&row.note.length>=1&&row.note.length<=6000,'Selecciona una semana hasta la actual y escribe un reporte de hasta 6000 caracteres.')
      demand(!table.some(item=>item.id!==row.id&&item.ownerId===user.id&&item.week===row.week),'Ya tienes un reporte para esa semana. Puedes editar el existente.')
      row.updated=today()
    }
    if(route==='birthdays'||route==='roster'){
      const account=current.users.find(item=>item.id===data.personId)
      row.personId=account?.id||''
      row.name=account?.name||String(data.name||'').trim()
      demand(row.name,'Ingresa el nombre del integrante.')
      if(route==='roster'&&row.active&&row.personId)
        demand(!table.some(item=>item.id!==row.id&&item.active&&item.personId===row.personId),'Este integrante ya está en la rotación.')
    }
    if(route==='users'){
      row.active=!!data.active
      row.username=fold(data.username)
      row.name=String(data.name||'').trim()
      demand(row.name&&row.username,'Completa el nombre y el usuario.')
      demand(!table.some(item=>item.id!==row.id&&item.username===row.username),'Ese usuario ya existe.')
      if(old&&old.name!==row.name)row.nameHistory=[...new Set([...(old.nameHistory||[]),old.name])]
      if(data.password){
        await replacePassword(row,data.password)
        delete row.choice
        row.credentialVersion=(old?.credentialVersion||0)+1
      }
      delete row.password
      demand(!row.active||row.choice||row.digest,'Asigna primero una contraseña de prueba.')
      demand(row.id!==user.id||(row.active&&row.roles.includes('admin')),'Conserva activa la cuenta de administración.')
      if(row.id===user.id&&data.password)saveSession(row)
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
  const run=async()=>{
    await initialized
    const latest=await requestStore('records','readonly',store=>store.get('main'))
    if(latest)current=migrate(latest)
    if(path.startsWith('state'))await hydratePhotos(current)
    const result=await dispatch(path,method,data)
    if((method!=='GET'&&!['login','logout'].includes(path))||path.startsWith('state'))await persist()
    return result
  }
  const next=serial.then(()=>globalThis.navigator?.locks?navigator.locks.request(prefix+'write',run):run())
  serial=next.catch(()=>{})
  return next
}
export const demoMedia=(id,original=false)=>images.get(id)?.[original?'originalUrl':'previewUrl']||''
