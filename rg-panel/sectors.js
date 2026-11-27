import {fold} from './model.js?v=20261127'
import {quitoBarrios} from './quito-barrios.js?v=20261127'

export const provinces={Cuenca:'Azuay',Quito:'Pichincha',Guayaquil:'Guayas'}
export const cities=Object.keys(provinces)

// División política municipal y nombres de uso local para la búsqueda inmobiliaria.
// Las adiciones de administración se conservan por separado de este directorio.
// Cuenca: https://www.cuenca.gob.ec/page_divisionpolitica
// Quito: PMDOT del Municipio de Quito y capa de barrios del directorio complementario.
// Guayaquil: https://mapa.guayaquil.gob.ec/mapa-urbano/
const directory={
  Cuenca:`Bellavista|Cañaribamba|El Batán|El Sagrario|El Vecino|Gil Ramírez Dávalos|Hermano Miguel|Huayna Cápac|Machángara|Monay|San Blas|San Sebastián|Sucre|Totoracocha|Yanuncay
  |Baños|Chaucha|Checa|Chiquintad|Cumbe|El Valle|Llacao|Molleturo|Nulti|Octavio Cordero Palacios|Paccha|Quingeo|Ricaurte|San Joaquín|Santa Ana|Sayausí|Sidcay|Sinincay|Tarqui|Turi|Victoria del Portete
  |Centro Histórico|Santo Domingo|San Roque|Plaza del Arte|Platería|Nueve de Octubre|María Auxiliadora|Los Arupos|La Suelería|La Merced|La Gloria|La Barriada|El Vergel|El Padrón|El Chorro|El Cuartel|Cruz del Vado|Cristo Rey|Corazón de María|Víctor J. Cuesta|Todos Santos|Convención del 45|10 de Agosto|Barrial Blanco
  |Challuabamba|Puertas del Sol|Las Catalinas|Misicata|El Tejar|El Cebollar|Control Sur|Quinta Chica|La Prensa|Miraflores|Ochoa León|Capulispamba|San Pedro del Cebollar|San Marcos|San Miguel|Guzho|Narancay|Yanaturo|Mayancela|Racar|Patamarca|Uncovía|La Delicia|El Arenal|San Vicente|San José de Balzay|Balzay|La Estancia|El Salado|Barabón|Cochapamba|Parque Industrial|Gapal|Pumapungo|El Vado|Remigio Crespo|Don Bosco|Primero de Mayo|Feria Libre|Gran Colombia|Av. Loja|Av. González Suárez|Av. Ordoñez Lasso|Calle Larga|Parque Calderón|Parque de la Madre|El Ejido|Hospital del Río|Ucubamba|Rayoloma|Baguanchi|Chilcapamba|Santa Marianita|San Antonio de Gapal
  |Ciudadela Álvarez|Ciudadela Los Cantones|Ciudadela Católica|La Unión La Playa|Los Cipreses|Unión Alta de Baños|Ciudadela Urubamba|San Lucas|Tres Tiendas|La República|Perpetuo Socorro|Bellavista de Tarqui|Paraíso IV|Abdón Calderón de Molleturo|La Unión de Pumayunga|Santa Marianita de El Arenal|Niñito de Praga|Ciudadela del Magisterio|Huagrahuma|Puircay|Ciudadela El Rosario|El Rocío|Narancay Alto|Subida a Narancay|Eloy Alfaro 2|La Inmaculada|Los Alisos|Monay La Esperanza|La Campiña|Héroes de Verdeloma|La Pradera|Cristo del Consuelo|Cruz Verde|Sebastián de Benalcázar|Tandacatu|Cochabamba|La Cuchara de la Guayas|Lazareto|La Unión de Ricaurte|Urbanización Manuel Jaramillo Malo|Uchuloma|La Unión de San Blas|Urbanización La Playa|Nueva Generación|Tierras Coloradas|Pampas del Cebollar|Guncay|Ciudadela UNE|Humboldt
  |Virgen del Milagro|Andrés F. de Córdova|Carlos Crespi|Daniel Alvarado|Calderón de la Barca|Urbanización La Piedra|La Fátima|Gaspar Sangurima|Ciudadela Universitaria|El Chiflón|Chirimoyas|Luis Cordero|La Salle|Suropamba|Ingachaca|Jamaica`,
  Quito:`Belisario Quevedo|Carcelén|Centro Histórico|Chilibulo|Chillogallo|Chimbacalle|Cochapamba|Comité del Pueblo|Concepción|Cotocollao|El Condado|El Inca|Guamaní|Iñaquito|Itchimbía|Jipijapa|Kennedy|La Argelia|La Ecuatoriana|La Ferroviaria|La Libertad|La Magdalena|La Mena|Mariscal Sucre|Ponceano|Puengasí|Quitumbe|Rumipamba|San Bartolo|San Juan|Solanda|Turubamba
  |Alangasí|Amaguaña|Atahualpa|Calacalí|Calderón|Chavezpamba|Checa|Conocoto|Cumbayá|El Quinche|Gualea|Guangopolo|Guayllabamba|La Merced|Llano Chico|Lloa|Nanegal|Nanegalito|Nayón|Nono|Pacto|Perucho|Pifo|Píntag|Pomasqui|Puéllaro|Puembo|San Antonio de Pichincha|San José de Minas|Tababela|Tumbaco|Yaruquí|Zámbiza
  |La Carolina|La Mariscal|González Suárez|Bellavista|El Batán|La Floresta|Guápulo|La Vicentina|La Gasca|Miraflores|Chaupicruz|Monteserrín|El Bosque|Quito Tenis|Carcelén Bajo|Carapungo|San Carlos|San Isidro del Inca|La Luz|Ponciano Bajo|Ponceano Alto|El Labrador|La Pulida|La Roldós|Comuna de Santa Clara de San Millán|La Alameda|San Marcos|San Roque|La Tola|San Blas|San Sebastián|La Ronda|Toctiuco|La Recoleta|La Chorrera|El Panecillo|La Colmena|La Comuna|El Tejar|Quito Sur|La Villaflora|El Recreo|La Gatazo|Santa Rita|Martha Bucaram|Turubamba Alto|Ciudadela del Ejército|Primavera de Cumbayá|La Morita|Santa Inés|Lumbisí|San Patricio|Collaquí|El Arenal|Hilacril|San Juan de Cumbayá|San Pedro del Tingo|Mitad del Mundo`,
  Guayaquil:`Ayacucho|Bolívar|Carbo|Febres Cordero|García Moreno|Urdaneta|Letamendi|Nueve de Octubre|Olmedo|Roca|Rocafuerte|Sucre|Tarqui|Chongón|Pascuales|Ximena|Juan Gómez Rendón (Progreso)|El Morro|Posorja|Puná|Tenguel
  |9 de Octubre Este|9 de Octubre Oeste|Abel Gilbert|Acuarela|Los Álamos|Alborada Este|Alborada Oeste|Los Almendros|Las Américas|Atarazana|Bastión Popular|Batallón del Suburbio|Bellavista|Los Ceibos|Centenario|Cerro del Carmen|Cóndor|Cuba|Del Astillero|Estero Salado|Los Esteros|La FAE|Floresta|La Florida|Garzota|Guangala|Guasmo Este|Guasmo Oeste|Huancavilca|Isla Trinitaria|Kennedy|Luz del Guayas|Mapasingue|Miraflores|Monte Bello|Las Orquídeas Este|Las Orquídeas Oeste|Paraíso|Pedro Carbo|Las Peñas|La Pradera|Prosperina|Puerto Azul Norte|Puerto Azul Sur|Puerto Lisa|Quinto Guayas Este|Quinto Guayas Oeste|Río Guayas|La Saiba|Samanes|San Eduardo|Los Sauces|Simón Bolívar|Sopeña|Unión|Urdenor|Urdesa|Los Vergeles
  |Alborada|Sauces|Garzota Norte|Guayacanes|Kennedy Norte|Kennedy Vieja|Kennedy Nueva|Urdesa Central|Urdesa Norte|Lomas de Urdesa|Urdesa Este|Los Olivos|Colinas de Los Ceibos|Cumbres de Los Ceibos|Mucho Lote|Mucho Lote 2|Villa España|Metrópolis|Beverly Hills|Vía a la Costa|Puerto Azul|Puerto Santa Ana|Ciudad del Río|Malecón 2000|Malecón del Salado|Centro de Guayaquil|Barrio del Centenario|Barrio Las Peñas|La Bahía|Perimetral|Juan Montalvo|Trinipuerto|Guasmo Central|Guasmo Norte|Guasmo Sur|Suburbio Oeste|Vernaza Norte|La Herradura|Pájaro Azul|Brisas del Norte|Mirador del Norte|Rosales|Ciudad Victoria|Ciudad Olmedo|Socio Vivienda|La Chala`
}

export function cityName(value){
  return cities.find(city=>fold(city)===fold(value))||''
}
export const locationKey=(city,sector)=>JSON.stringify([fold(city),fold(sector)])
export function sectorList(city,custom=[],legacy=[]){
  const chosen=cityName(city)
  const values=new Map()
  for(const value of (directory[chosen]||'').split('|').map(item=>item.trim()).filter(Boolean))values.set(fold(value),value)
  if(chosen==='Quito')for(const name of quitoBarrios)if(!values.has(fold(name)))values.set(fold(name),name)
  for(const {city,sector} of [...custom,...legacy]){
    if(sector&&cityName(city)===chosen&&!values.has(fold(sector)))values.set(fold(sector),sector)
  }
  return [...values.values()].sort((a,b)=>a.localeCompare(b,'es'))
}
