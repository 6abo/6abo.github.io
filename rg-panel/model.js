export const TZ = 'America/Guayaquil'
export const categories = ['Casas en venta', 'Casas renteras', 'Preventa', 'Departamentos en venta', 'Departamentos en arriendo', 'Terrenos', 'Casas crédito VIP', 'Crédito Miti Miti']
export const types = ['Casa', 'Departamento', 'Terreno', 'Local comercial', 'Quinta', 'Hacienda', 'Oficina', 'Suite', 'Bodega', 'Edificio', 'Hotel', 'Fábrica', 'Parqueadero']
export const conditions = ['Nueva', 'Usada', 'En proyecto', 'Colonial', 'No aplica']
export const services = ['Agua potable', 'Luz eléctrica', 'Alcantarillado', 'Iluminación', 'Internet / Wi-Fi', 'Línea telefónica', 'TV por cable', 'Puertas eléctricas', 'Gas centralizado', 'Aire acondicionado', 'Video vigilancia', 'Sistema de alarma', 'Guardianía privada', 'Servicio de limpieza', 'Línea blanca', 'Extractor de olores', 'Calefón', 'Generador', 'Cisterna', 'Parqueo de visitas', 'Áreas verdes', 'Cancha deportiva']
export const amenities = ['Ascensor', 'Caseta de guardia', 'Cerca eléctrica', 'Intercomunicador', 'Chimenea', 'Piscina', 'Jacuzzi', 'Sauna', 'Turco', 'Cuarto de máquinas', 'Área deportiva', 'Estudio', 'Cuarto de planchado', 'Sala de estar', 'Sala de lectura', 'Sala de música y cine', 'Área de eventos', 'Cuarto de juegos', 'Walk-in clóset', 'Terraza', 'Ático', 'Secadero', 'Club house', 'Parque interno', 'Amoblado', 'Pet friendly', 'Adosada', 'Ingreso independiente', 'Acabados de lujo']
export const benefits = ['Alumbrado público', 'Calles asfaltadas', 'Calles pavimentadas', 'Calles adoquinadas', 'Fácil acceso', 'Línea de buses', 'Tranvía', 'Universidades', 'Escuelas y colegios', 'Bancos', 'Farmacias y hospitales', 'Parques cercanos', 'Parques infantiles', 'Supermercados', 'Restaurantes', 'Centros comerciales', 'Gasolineras', 'Gimnasio', 'Policía', 'Casa comunal', 'Zona industrial', 'Piscina comunitaria', 'Vista a la ciudad', 'Vista al mar', 'Frente al mar', 'Hosterías', 'Peluquerías']
export const roles = { agent:'Captaciones', birthdays:'Cumpleaños', cleaning:'Limpieza', admin:'Administrador' }
const localDateFormat = new Intl.DateTimeFormat('en-CA', {timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'})
export const isoToday = () => {
  const {year,month,day} = Object.fromEntries(localDateFormat.formatToParts().map(part => [part.type,part.value]))
  return [year,month,day].join('-')
}
export const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
export function monthDates(key) {
  const [year,month] = key.split('-').map(Number)
  const count = new Date(Date.UTC(year,month,0)).getUTCDate()
  return Array.from({length:count}, (_,i) => ({date:key+'-'+String(i+1).padStart(2,'0'), day:i+1, weekday:new Date(Date.UTC(year,month-1,i+1)).getUTCDay()}))
}
export const fold = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()
