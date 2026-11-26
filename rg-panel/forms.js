import {categories,types,conditions,services,amenities,benefits,roles,isoToday} from './model.js'
import {api,attr,esc,button,icon,iconButton,dialog,showDialog,notify,field,selectField,areaField,checkField,checkGroup,fields,section,actions,media,loader,dataId} from './ui.js'
import {uploadPhoto} from './photos.js'

const num=(name,label,value,step='0.01')=>field(name,label,value,{type:'number',extra:'min="0" step="'+step+'"'})
const local=isoToday

export function loginForm({setup,demo},finish){
  const content='<form class="form" id="signin">'+
    (setup?'<p class="small">Ingresa el código que aparece en la terminal donde iniciaste la aplicación. Define aquí la cuenta administradora.</p>'+field('key','Código de configuración','',{required:true,extra:'autocomplete="off"'})+field('name','Tu nombre','',{required:true}):'')+
    field('username','Usuario','',{required:true,extra:'autocomplete="username" autocapitalize="none"'})+
    field('password','Contraseña','',{required:true,type:'password',extra:'autocomplete="'+(setup?'new-password':'current-password')+'"'})+
    actions(setup?'Activar administración':'Iniciar sesión')+
    (demo?'<div class="info-box"><strong>Accesos de demostración</strong><p class="small">Usa datos ficticios. Esta versión guarda los cambios en este navegador.</p><div class="action-row">'+button('Probar como administrador','demo-admin','users')+button('Probar como asesora','demo-agent','home')+'</div></div>':'')+
    '</form>'
  showDialog(setup?'Configura tu administración':'Acceso del equipo',content)
  const form=dialog.querySelector('form')
  if(demo)form.addEventListener('click',async event=>{
    const action=event.target.closest('[data-action]')?.dataset.action
    if(!['demo-admin','demo-agent'].includes(action))return
    const admin=action==='demo-admin'
    try{
      const result=await api('login',{method:'POST',data:{username:admin?'admin':'daniela.ruiz',demoChoice:admin?'admin':'agent'}})
      dialog.close()
      await finish(result)
    }catch(error){form.querySelector('.error-text').textContent=error.message}
  })
  bindSubmit(form,input=>api(setup?'setup':'login',{method:'POST',data:input}),finish)
}

function bindSubmit(form,save,finish){
  form.addEventListener('submit',async event=>{
    event.preventDefault()
    const error=form.querySelector('.error-text')
    const submit=form.querySelector('button[type=submit]')
    const oldLabel=submit.textContent
    const input=Object.fromEntries(new FormData(form))
    submit.disabled=true
    submit.textContent='Guardando…'
    error.textContent=''
    try{
      const result=await save(input)
      if(!result)return
      dialog.close()
      await finish(result)
    }catch(failure){
      if(form.isConnected)error.textContent=failure.message
      else notify(failure.message,true)
    }finally{
      submit.disabled=false
      submit.textContent=oldLabel
    }
  })
}

function photoField(many){
  return '<div class="image-upload"><div class="field"><label for="attach-photo">'+(many?'Fotos de la propiedad':'Foto de perfil')+'</label><input type="file" id="attach-photo" accept="image/jpeg,image/png,image/webp" '+(many?'multiple':'')+'></div>'+
   '<p>'+(many?'JPG, PNG o WebP. Se conserva el original. La primera imagen será la portada.':'Se recorta automáticamente dentro del avatar del calendario.')+'</p><div class="photo-manager" id="photo-manager"></div><div id="photo-busy" aria-live="polite"></div></div>'
}

function photoControls(form,initial,many){
  const items=[...initial]
  const list=form.querySelector('#photo-manager')
  const busy=form.querySelector('#photo-busy')
  const staged=new Set()
  let inProgress=false
  function render(){
    list.innerHTML=items.map((id,i)=>'<div class="photo-chip"><img src="'+attr(media(id))+'" alt="'+(i===0&&many?'Portada':'Foto')+'">'+
      (i&&many?'<button type="button" class="iconbtn front" data-front="'+i+'" title="Usar como portada" aria-label="Usar como portada">'+icon('star')+'</button>':'')+
      '<button type="button" class="iconbtn remove" data-remove-photo="'+i+'" aria-label="Quitar foto" title="Quitar foto">'+icon('close')+'</button></div>').join('')
  }
  list.addEventListener('click',event=>{
    const target=event.target.closest('button')
    if(!target||inProgress)return
    if(target.hasAttribute('data-front')){
      const [id]=items.splice(Number(target.dataset.front),1)
      items.unshift(id)
    }else if(target.hasAttribute('data-remove-photo')){
      const [id]=items.splice(Number(target.dataset.removePhoto),1)
      if(staged.delete(id))api('media/'+id,{method:'DELETE'}).catch(()=>{})
    }
    render()
  })
  form.querySelector('#attach-photo').addEventListener('change',async event=>{
    const input=event.target
    const files=[...input.files]
    if(!files.length)return
    if(many&&items.length+files.length>24){notify('Puedes añadir hasta 24 fotos.',true);input.value='';return}
    const submit=form.querySelector('[type=submit]')
    inProgress=true
    submit.disabled=true
    input.disabled=true
    for(const [i,file] of files.entries()){
      busy.innerHTML=loader('Preparando foto '+(i+1)+' de '+files.length+'…')
      try{
        const id=await uploadPhoto(file,many)
        if(!many){
          const previous=items.pop()
          if(staged.delete(previous))api('media/'+previous,{method:'DELETE'}).catch(()=>{})
        }
        staged.add(id)
        items.push(id)
        render()
      }catch(error){notify(error.message,true)}
    }
    busy.innerHTML=''
    input.value=''
    input.disabled=false
    submit.disabled=false
    inProgress=false
  })
  render()
  return items
}

export function propertyForm(item={},user,isAdmin,finish){
  const owner=item.privateData||{}
  const areaOptions=['Urbano','Rústico']
  const content='<form class="form" id="property-form">'+
    '<div class="form-banner"><span>'+icon('users')+' Asesor responsable · '+esc(item.author||user.name)+'</span><span>'+esc(owner.date||local())+'</span></div>'+
    '<fieldset><legend>Datos del inmueble</legend>'+fields(
      field('title','Título de la propiedad',item.title,{required:true,span:true,placeholder:'Ej. Casa junto a Las Catalinas',extra:'maxlength="110"'}),
      selectField('category','Categoría de catálogo',categories,item.category,{required:true,placeholder:'Elige una categoría'}),
      selectField('type','Tipo de inmueble',types,item.type,{required:true,placeholder:'Elige un tipo'}),
      field('city','Ciudad',item.city||'Cuenca',{required:true}),
      field('sector','Sector',item.sector,{required:true}),
      field('province','Provincia',item.province||'Azuay'),
      field('code','Código de captación',item.code),
      num('price','Precio de publicación en USD',item.price),
      selectField('condition','Estado',conditions,item.condition,{placeholder:'Seleccionar'}),
      num('land','Terreno (m²)',item.land),num('built','Construcción (m²)',item.built),
      num('bedrooms','Dormitorios',item.bedrooms,'1'),num('bathrooms','Baños',item.bathrooms,'1'),
      num('parking','Parqueaderos',item.parking,'1'),num('age','Antigüedad (años)',item.age,'1'),
      selectField('area','Clasificación',areaOptions,item.area,{placeholder:'Seleccionar'}),num('fee','Condominio / alícuota en USD',item.fee),
      field('address','Dirección del inmueble',item.address),field('mapUrl','Enlace de ubicación',item.mapUrl,{type:'url'}),
      field('contact','Contacto comercial para el anuncio',item.contact,{span:true}),
      areaField('description','Descripción pública',item.description,'Describe lo más atractivo de esta propiedad.')
    )+checkField('showAddress','Mostrar dirección y mapa en el catálogo',item.showAddress)+'</fieldset>'+
    photoField(true)+
    section('Distribución por plantas y área externa',fields(
      areaField('first','Primera planta',item.first,'Sala, comedor, cocina, dormitorios, baños…'),
      areaField('second','Segunda planta',item.second,'Dormitorios, baños, clósets, lavandería…'),
      areaField('third','Tercera planta',item.third,'Terraza, dormitorios, áreas sociales…'),
      areaField('outdoor','Área externa',item.outdoor,'Garaje, jardín, patio, terraza, BBQ, bodega…')
    ))+
    section('Servicios, acabados y beneficios',
      '<div class="fieldset"><h4>Servicios</h4>'+checkGroup('services',services,item.services)+'</div>'+
      '<div class="fieldset"><h4>Ambientes y características</h4>'+checkGroup('amenities',amenities,item.amenities)+'</div>'+
      '<div class="fieldset"><h4>Beneficios del sector</h4>'+checkGroup('benefits',benefits,item.benefits)+'</div>'+
      fields(num('floors','Número de pisos',item.floors,'1'),num('basements','Subsuelos',item.basements,'1'),
        areaField('construction','Tecnología constructiva',item.construction,'Estructura, paredes, tipo y grosor de losa, cercos…'),
        areaField('finishes','Acabados, carpintería y muebles',item.finishes,'Pisos por ambiente, recubrimientos, muebles y carpintería…')
      ))+
    section('Datos privados del propietario y corretaje',fields(
      field('owner-name','Nombres y apellidos',owner.name),field('owner-idNumber','Cédula',owner.idNumber),
      field('owner-phone','Teléfono',owner.phone,{type:'tel'}),field('owner-email','Correo',owner.email,{type:'email'}),
      field('owner-address','Dirección del propietario',owner.address),field('owner-date','Fecha de captación',owner.date||local(),{type:'date'}),
      num('owner-commission','Comisión convenida (%)',owner.commission),
      areaField('owner-cavida','Observaciones de cabida',owner.cavida),areaField('owner-observations','Observaciones internas',owner.observations)
    )+checkField('owner-permission','Autorización de corretaje registrada',owner.permission))+
    checkField('published','Visible en el catálogo público',item.published??true)+
    (isAdmin?checkField('featured','Destacar en la portada del panel',item.featured):'')+
    actions(item.id?'Guardar cambios':'Guardar propiedad')+'</form>'
  showDialog(item.id?'Editar captación':'Nueva captación',content,{wide:true})
  const form=dialog.querySelector('form')
  const photos=photoControls(form,item.photos||[],true)
  const save=input=>{
    const draft=new FormData(form)
    const privateData=Object.fromEntries(Object.entries(input).filter(([key])=>key.startsWith('owner-')).map(([key,value])=>[key.slice(6),value]))
    return api('properties'+(item.id?'/'+item.id:''),{method:item.id?'PUT':'POST',data:{
      ...input,photos,privateData,updated:item.updated,services:draft.getAll('services'),amenities:draft.getAll('amenities'),benefits:draft.getAll('benefits')
    }})
  }
  bindSubmit(form,save,finish)
}

export function eventForm(item={},date=local(),publicByDefault=false,finish){
  showDialog(item.id?'Editar evento':'Nuevo evento','<form class="form">'+
    field('title','Título',item.title,{required:true})+
    fields(field('date','Fecha',item.date||date,{type:'date',required:true}),field('time','Hora de Ecuador',item.time,{type:'time'}),
      selectField('kind','Tipo de evento',['Reunión','Visita','Tarea','Evento','Otro'],item.kind,{placeholder:'Seleccionar'}),
      field('place','Lugar',item.place))+
    areaField('description','Detalles',item.description)+
    checkField('public','Publicar en la agenda pública',item.public??publicByDefault)+
    '<p class="small">Tu agenda privada muestra los eventos que creaste, incluidos los que compartes.</p>'+actions()+'</form>')
  bindSubmit(dialog.querySelector('form'),input=>saveRecord('events',item,input),finish)
}

export function requestForm(item={},finish){
  showDialog(item.id?'Editar requerimiento':'Nuevo requerimiento','<form class="form">'+
    field('title','¿Qué propiedad estás buscando?',item.title,{required:true,placeholder:'Ej. Departamento de dos dormitorios'})+
    fields(selectField('category','Categoría',categories,item.category,{placeholder:'Seleccionar'}),
      field('sector','Sector',item.sector),num('budget','Presupuesto en USD',item.budget),
      selectField('priority','Prioridad',['Normal','Urgente'],item.priority||'Normal'),
      selectField('status','Estado',['Abierto','Resuelto'],item.status||'Abierto'))+
    areaField('description','Detalles',item.description)+actions()+'</form>')
  bindSubmit(dialog.querySelector('form'),input=>saveRecord('requests',item,input),finish)
}

export function birthdayForm(item={},team=[],finish){
  showDialog(item.id?'Editar cumpleaños':'Agregar cumpleaños','<form class="form">'+
    (team.length?selectField('person','Elegir integrante',team.map(person=>[person.id,person.name]),item.personId,{placeholder:'Escribir otro nombre'}):'')+
    fields(field('name','Nombre',item.name,{required:true}),
      selectField('day','Día',Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')),item.date?.slice(8),{required:true,placeholder:'Día'}),
      selectField('month','Mes',['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i)=>[String(i+1).padStart(2,'0'),m]),item.date?.slice(5,7),{required:true,placeholder:'Mes'}))+
    '<p class="small">Si el integrante tiene foto en su cuenta, se muestra automáticamente. Aquí puedes añadir una diferente.</p>'+
    photoField(false)+actions()+'</form>')
  const form=dialog.querySelector('form')
  const photos=photoControls(form,item.overridePhoto?[item.overridePhoto]:[],false)
  form.elements.person?.addEventListener('change',event=>{
    const person=team.find(candidate=>candidate.id===event.target.value)
    if(person)form.elements.name.value=person.name
  })
  bindSubmit(form,input=>saveRecord('birthdays',item,{name:input.name,date:'2000-'+input.month+'-'+input.day,photo:photos[0]||'',personId:input.person||''}),finish)
}

export function rosterForm(item={},team=[],finish){
  showDialog(item.id?'Editar participante':'Agregar participante','<form class="form">'+
    (team.length?selectField('person','Elegir integrante',team.map(person=>[person.name,person.name]),item.name,{placeholder:'Escribir otro nombre'}):'')+
    field('name','Nombre para la rotación',item.name,{required:true})+
    checkField('active','Participa en próximos turnos',item.active===undefined||!!item.active)+
    '<p class="small">El calendario conserva los turnos ya asignados hasta hoy y ajusta los siguientes.</p>'+actions()+'</form>')
  const form=dialog.querySelector('form')
  form.elements.person?.addEventListener('change',event=>{if(event.target.value)form.elements.name.value=event.target.value})
  bindSubmit(form,input=>saveRecord('roster',item,{...input,active:!!input.active}),finish)
}

export function userForm(item={},finish){
  showDialog(item.id?'Editar cuenta':'Nueva cuenta','<form class="form">'+
    fields(field('name','Nombre y apellido',item.name,{required:true}),
      field('username','Usuario',item.username,{required:true,extra:'autocomplete="off" autocapitalize="none" pattern="[a-zA-Z0-9._\\-]{3,50}"'}),
      field('password',item.id?'Restablecer contraseña':'Asignar contraseña','',{type:'password',extra:'autocomplete="new-password" minlength="10"'})
    )+
    '<p class="small">'+(item.id?'Deja la contraseña vacía para conservar la actual.':'La contraseña debe tener al menos 10 caracteres.')+'</p>'+
    '<fieldset><legend>Roles de la cuenta</legend>'+checkGroup('roles',Object.entries(roles),item.roles||['agent'])+'</fieldset>'+
    photoField(false)+checkField('active','Habilitar acceso',item.active??false)+actions()+'</form>')
  const form=dialog.querySelector('form')
  const photos=photoControls(form,item.photo?[item.photo]:[],false)
  bindSubmit(form,input=>saveRecord('users',item,{...input,photo:photos[0]||'',roles:new FormData(form).getAll('roles')}),finish)
}
function saveRecord(route,item,data){
  return api(route+(item.id?'/'+item.id:''),{method:item.id?'PUT':'POST',data})
}

export function confirmDelete(title,description,route,id,finish){
  showDialog(title,'<p>'+esc(description)+'</p><form class="form"><div class="error-text" role="alert"></div><div class="dialog-actions">'+
    button('Cancelar','close')+'<button class="btn danger" type="submit">'+icon('trash')+' Eliminar</button></div></form>')
  bindSubmit(dialog.querySelector('form'),()=>api(route+'/'+encodeURIComponent(id),{method:'DELETE'}),finish)
}
