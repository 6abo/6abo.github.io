import { monthDates } from './model.js?v=20261127'

function order(seed,value){
  let hash=2166136261
  for(const character of seed+value)hash=Math.imul(hash^character.charCodeAt(0),16777619)
  hash=Math.imul(hash^(hash>>>16),0x7feb352d)
  hash=Math.imul(hash^(hash>>>15),0x846ca68b)
  return (hash^(hash>>>16))>>>0
}

export function rotate(month, roster, fixed = [], previous = [], startDate = '') {
  const people = new Map(roster.map(person => [person.id, {id:person.id, name:person.name, count:0, office:0, last:null}]))
  for (const row of [...previous,...fixed]) {
    const person = people.get(row.person)
    if (!person) continue
    person.last = row.section
    if (row.date.startsWith(month)) {
      person.count++
      person.office += Number(row.section === 'Oficina')
    }
  }
  const occupied = new Set(fixed.map(row => row.date))
  const results = [...fixed]
  if (roster.length < 2) return results
  const observe = (person, date, section) => {
    person.count++
    person.office += Number(section === 'Oficina')
    person.last = section
    results.push({date, section, person:person.id, name:person.name, status:'Pendiente'})
  }
  for (const {date, weekday} of monthDates(month)) {
    if (date < startDate || ![2,4].includes(weekday) || occupied.has(date)) continue
    const ranked = [...people.values()].sort((a,b) => a.count-b.count || order(date,a.id)-order(date,b.id))
    const cutoff = ranked[1].count
    const allowed = ranked.filter(person => person.count <= cutoff)
    let best
    for (const office of allowed) {
      for (const bath of allowed) {
        if (office === bath || (ranked[0].count < cutoff && office !== ranked[0] && bath !== ranked[0])) continue
        const cost =
          10 * (Math.abs(2*(office.office+1)-office.count-1) + Math.abs(2*bath.office-bath.count-1))
          + 5 * Number(office.last === 'Oficina') + 5 * Number(bath.last === 'Baño')
          + order(date,office.id+':'+bath.id)/2**32
        if (!best || cost < best.cost) best = {office,bath,cost}
      }
    }
    observe(best.office,date,'Oficina')
    observe(best.bath,date,'Baño')
  }
  return results.sort((a,b) => a.date.localeCompare(b.date))
}
