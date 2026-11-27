import {cities,locationKey,sectorList,cityName} from './sectors.js'
import {fold} from './model.js'
import {attr,esc,options} from './ui.js'

function choices(locations,city){
  return (city?[city]:cities).flatMap(place=>{
    const previous=locations.filter(row=>row.city===place&&row.sector).map(row=>row.sector)
    const sectors=cityName(place)?sectorList(place,locations):[...new Set(previous)]
    return sectors.map(sector=>({city:place,sector,key:locationKey(place,sector)}))
  })
}
function pickedOptions(locations,city,match,key){
  const terms=fold(match).split(/\s+/).filter(Boolean)
  const candidates=city||terms.length||key?choices(locations,city).filter(row=>row.key===key||((city||terms.length)&&terms.every(term=>fold(row.sector+' '+row.city).includes(term)))):[]
  const prompt=!city&&!terms.length&&!key?'Elige una ciudad o escribe el sector':candidates.length?'Seleccionar sector':'Sin coincidencias'
  return '<option value="">'+prompt+'</option>'+candidates.map(row=>
    '<option value="'+attr(row.key)+'" data-city="'+attr(row.city)+'" data-sector="'+attr(row.sector)+'" '+(row.key===key?'selected':'')+'>'+
    esc(row.sector+(city?'':' · '+row.city))+'</option>').join('')
}
export function locationPicker({key,city='',sector='',selectedKey='',locations=[],required=false}){
  const values=city&&!cities.includes(city)?[...cities,city]:cities
  const id=attr(key)
  return '<div class="location-picker" data-location-picker>'+
    '<label for="'+id+'-city">Ciudad<select name="city" id="'+id+'-city" data-location-city '+(required?'required':'')+'>'+
    options(values,city,required?'Seleccionar ciudad':'Todas las ciudades')+'</select></label>'+
    '<label for="'+id+'-search">Buscar sector<input type="search" id="'+id+'-search" data-location-search placeholder="Escribe el nombre del sector"></label>'+
    '<label for="'+id+'-sector">Sector<select id="'+id+'-sector" data-location-sector '+(required?'required':'')+'>'+
    pickedOptions(locations,city,'',selectedKey||(sector?locationKey(city,sector):''))+'</select></label></div>'
}
export function readLocation(picker){
  const city=picker.querySelector('[data-location-city]').value
  const option=picker.querySelector('[data-location-sector]').selectedOptions[0]
  return {city:option?.dataset.city||city,sector:option?.dataset.sector||'',key:option?.value||''}
}
export function bindLocationPicker(picker,locations,change){
  const city=picker.querySelector('[data-location-city]')
  const query=picker.querySelector('[data-location-search]')
  const sector=picker.querySelector('[data-location-sector]')
  const update=retain=>{sector.innerHTML=pickedOptions(locations,city.value,query.value,retain?sector.value:'')}
  city.addEventListener('change',()=>{
    query.value=''
    update(false)
    change?.(readLocation(picker))
  })
  query.addEventListener('input',()=>update(true))
  sector.addEventListener('change',()=>change?.(readLocation(picker)))
}
