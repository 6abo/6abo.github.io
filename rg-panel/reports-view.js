import {cities} from './sectors.js'
import {summarizeListings,shiftDate} from './reporting.js'
import {attr,button,dataId,empty,esc,options,quantity} from './ui.js'

const number=value=>esc(quantity(value))
const ownReport=(rows,ownerId,week)=>rows.find(report=>report.ownerId===ownerId&&report.week===week)

function statsTable(title,head,rows,buttons=''){
  return '<section class="panel pad"><div class="collection-title"><h2>'+esc(title)+'</h2>'+buttons+'</div>'+
    (rows.length?'<div class="table-scroll"><table class="activity-table"><thead><tr>'+head.map(label=>'<th scope="col">'+esc(label)+'</th>').join('')+
      '</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':
      empty('Sin registros para estos filtros.'))+'</section>'
}
export function reportsView({reports,listings,team,ownerId,admin,filters}){
  const {period,week,person,city}=filters
  const summary=summarizeListings(listings,{week:period==='week'?week:'',person,city})
  const mine=ownReport(reports,ownerId,week)
  const write=mine?button('Editar mi reporte','edit-report','edit','primary',dataId(mine.id)):button('Escribir mi reporte','new-report','plus','primary')
  const notes=reports.filter(item=>(period==='all'||item.week===week)&&(!person||item.ownerId===person))
    .sort((a,b)=>b.week.localeCompare(a.week)||a.author.localeCompare(b.author,'es'))
  const metrics=[['Captaciones',summary.captured],['Vendidas',summary.sold],['Captadas con autorización para redes',summary.eligible]]
  const exportButton=summary.sectors.length?button('Descargar CSV','export-report','download'):''
  return '<section class="panel pad report-controls"><div class="report-filter-grid">'+
    '<label for="report-period">Período<select id="report-period">'+options([['week','Semana'],['all','Histórico']],period)+'</select></label>'+
    '<label for="report-week">Fecha de la semana<input id="report-week" type="date" value="'+attr(week)+'" '+(period==='all'?'disabled':'')+'></label>'+
    '<label for="report-person">Estadísticas<select id="report-person">'+options([['','Totales del equipo'],[ownerId,'Mis estadísticas'],
      ...admin?team.filter(account=>account.id!==ownerId).map(account=>[account.id,account.name]):[]],person)+'</select></label>'+
    '<label for="report-city">Ciudad<select id="report-city">'+options(cities,city,'Todas las ciudades')+'</select></label></div>'+
    '</section><div class="report-metrics">'+metrics.map(([label,value])=>'<div class="panel pad"><span>'+esc(label)+'</span><strong>'+number(value)+'</strong></div>').join('')+'</div>'+
    statsTable('Actividad por sector',['Ciudad','Sector','Captaciones','Vendidas','Autorizadas en redes'],
      summary.sectors.map(row=>[row.city,row.sector,row.captured,row.sold,row.eligible]),exportButton)+
    (admin&&!person?statsTable('Actividad por asesor',['Asesor','Captaciones','Vendidas','Autorizadas en redes'],
      summary.people.map(row=>[row.name,row.captured,row.sold,row.eligible])):'')+
    '<section class="panel pad weekly-reports"><div class="collection-title"><h2>Reportes por escrito</h2>'+write+'</div>'+
    (notes.length?'<div class="report-notes">'+notes.map(item=>'<article class="report-note"><div class="list-row"><div><strong>'+esc(item.author)+'</strong>'+
      '<small class="list-meta">'+esc(item.week)+' al '+esc(shiftDate(item.week,6))+'</small></div>'+
      (item.editable?button('Editar','edit-report','edit','',dataId(item.id)):'')+'</div><p>'+esc(item.note)+'</p></article>').join('')+'</div>':
      empty('Todavía no hay reportes escritos para esta selección.'))+'</section>'
}
