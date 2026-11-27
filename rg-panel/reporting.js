import {isoToday} from './model.js?v=20261127'
import {cityName,locationKey} from './sectors.js?v=20261127'

export function shiftDate(date,days){
  const point=new Date(date+'T12:00:00Z')
  if(!Number.isFinite(point.valueOf()))return ''
  point.setUTCDate(point.getUTCDate()+days)
  return point.toISOString().slice(0,10)
}
export function validDate(date){
  return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&shiftDate(date,0)===date
}
export function weekStart(date=isoToday()){
  if(!validDate(date))return ''
  const offset=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7
  return shiftDate(date,-offset)
}
export function summarizeListings(items,{week='',person='',city=''}={}){
  const lastDay=week?shiftDate(week,6):''
  const capturedDate=item=>item.privateData?.date||item.captureDate
  const inPeriod=date=>!week||(date&&date>=week&&date<=lastDay)
  const sectors=new Map()
  const people=new Map()
  let captured=0,sold=0,eligible=0
  for(const item of items){
    const cityLabel=cityName(item.city)||item.city||'Sin ciudad'
    if((person&&item.ownerId!==person)||(city&&cityLabel!==city))continue
    const capture=!!inPeriod(capturedDate(item))
    const sale=item.saleStatus==='sold'&&!!inPeriod(item.soldDate)
    if(!capture&&!sale)continue
    const sector=item.sector||'Sin sector'
    const key=locationKey(cityLabel,sector)
    if(!sectors.has(key))sectors.set(key,{city:cityLabel,sector,captured:0,sold:0,eligible:0})
    if(!people.has(item.ownerId))people.set(item.ownerId,{id:item.ownerId,name:item.author,captured:0,sold:0,eligible:0})
    const canPost=capture&&item.social==='allowed'
    if(capture)captured++
    if(sale)sold++
    if(canPost)eligible++
    for(const row of [sectors.get(key),people.get(item.ownerId)]){
      if(capture)row.captured++
      if(sale)row.sold++
      if(canPost)row.eligible++
    }
  }
  const compare=(a,b)=>b.captured-a.captured||b.sold-a.sold||(a.sector||a.name).localeCompare(b.sector||b.name,'es')
  return {captured,sold,eligible,sectors:[...sectors.values()].sort(compare),people:[...people.values()].sort(compare)}
}

export function sectorsCsv(rows){
  const cell=value=>{
    const content=String(value??'')
    const safe=/^[\s]*[=+\-@]|^[\t\r\n]/.test(content)?"'"+content:content
    return '"'+safe.replaceAll('"','""')+'"'
  }
  return '\ufeff'+[['Ciudad','Sector','Captaciones','Vendidas','Autorizadas para redes'],
    ...rows.map(row=>[row.city,row.sector,row.captured,row.sold,row.eligible])].map(row=>row.map(cell).join(',')).join('\r\n')
}
