import {api,imageUrl,price,quantity} from './ui.js'

function loadImage(url){
  return new Promise((resolve,reject)=>{
    const image=new Image()
    image.onload=()=>resolve(image)
    image.onerror=()=>reject(Error('No se pudo leer la fotografía.'))
    image.src=url
  })
}
function toBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>canvas.toBlob(
    blob=>blob?resolve(blob):reject(Error('No se pudo procesar la fotografía.')),type,quality
  ))
}

export async function uploadPhoto(file,warm=true){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Selecciona una foto JPG, PNG o WebP.')
  if(file.size>30*1024*1024)throw Error('Cada fotografía puede pesar hasta 30 MB.')
  const url=URL.createObjectURL(file)
  try{
    const image=await loadImage(url)
    const canvas=document.createElement('canvas')
    canvas.width=image.naturalWidth
    canvas.height=image.naturalHeight
    if(canvas.width*canvas.height>72_000_000)throw Error('La foto puede tener hasta 72 megapíxeles.')
    const ctx=canvas.getContext('2d',{willReadFrequently:warm})
    ctx.fillStyle='#fff'
    ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.drawImage(image,0,0)
    if(warm){
      const step=Math.max(1,Math.min(250,Math.floor(550_000/canvas.width)))
      for(let y=0;y<canvas.height;y+=step){
        const pixels=ctx.getImageData(0,y,canvas.width,Math.min(step,canvas.height-y))
        for(let i=0;i<pixels.data.length;i+=4){
          const rgb=pixels.data
          const luma=.2126*rgb[i]+.7152*rgb[i+1]+.0722*rgb[i+2]
          const highlight=Math.min(1,Math.max(0,(luma-182)/73))
          const shadow=(1-luma/255)*Math.min(1,luma/72)*9
          const delta=shadow-2.8*highlight
          const warmth=Math.min(1,luma/90)*(1-highlight)*4.5
          rgb[i]+=delta+warmth*(1-rgb[i]/255)
          rgb[i+1]+=delta+warmth*.12
          rgb[i+2]=Math.max(0,rgb[i+2]+delta-warmth*.67)
        }
        ctx.putImageData(pixels,0,y)
      }
    }
    const preview=await toBlob(canvas,'image/jpeg',.965)
    const data=new FormData()
    data.set('original',file)
    data.set('preview',preview,'vista.jpg')
    return (await api('media',{method:'POST',data})).id
  }finally{URL.revokeObjectURL(url)}
}

function cover(ctx,image,x,y,w,h){
  const scale=Math.max(w/image.width,h/image.height)
  const srcW=w/scale,srcH=h/scale
  ctx.drawImage(image,(image.width-srcW)/2,(image.height-srcH)/2,srcW,srcH,x,y,w,h)
}
function round(ctx,x,y,w,h,r,fill){
  ctx.fillStyle=fill
  ctx.beginPath()
  ctx.roundRect(x,y,w,h,r)
  ctx.fill()
}
function wrap(ctx,text,width,maxLines){
  const lines=[]
  let pending=''
  for(const word of text.split(/\s+/)){
    const next=pending?pending+' '+word:word
    if(pending&&ctx.measureText(next).width>width){lines.push(pending);pending=word}
    else pending=next
  }
  if(pending)lines.push(pending)
  return lines.length>maxLines ? [...lines.slice(0,maxLines-1),lines[maxLines-1]+'…'] : lines
}

export async function advertisement(record,photoUrl=imageUrl(record)){
  const canvas=document.createElement('canvas')
  canvas.width=1080
  canvas.height=1350
  const ctx=canvas.getContext('2d')
  const logo=await loadImage('./assets/logo.webp')
  if(photoUrl)cover(ctx,await loadImage(photoUrl),0,0,1080,1020)
  else{
    const field=ctx.createLinearGradient(0,0,1080,1020)
    field.addColorStop(0,'#7b2942')
    field.addColorStop(1,'#35151f')
    ctx.fillStyle=field
    ctx.fillRect(0,0,1080,1020)
  }
  ctx.save()
  ctx.globalAlpha=.87
  ctx.beginPath()
  ctx.arc(540,510,87,0,Math.PI*2)
  ctx.clip()
  ctx.fillStyle='#fff'
  ctx.fillRect(453,423,174,174)
  ctx.drawImage(logo,456,422,168,176)
  ctx.restore()
  ctx.font='700 29px system-ui,sans-serif'
  const label=record.saleStatus==='sold'?'Vendida · '+record.category:record.category
  const width=ctx.measureText(label).width+59
  round(ctx,1032-width,49,width,54,10,'#fff2f5')
  ctx.fillStyle='#891b37'
  ctx.fillText(label,1060-width,85)
  if(record.sample){
    round(ctx,48,49,112,46,8,'#2f1521')
    ctx.font='650 23px system-ui,sans-serif'
    ctx.fillStyle='#fff'
    ctx.fillText('Muestra',61,80)
  }
  const fade=ctx.createLinearGradient(0,778,0,1065)
  fade.addColorStop(0,'#2a101300')
  fade.addColorStop(1,'#2c1119')
  ctx.fillStyle=fade
  ctx.fillRect(0,778,1080,292)
  ctx.fillStyle='#2c1119'
  ctx.fillRect(0,1015,1080,335)
  ctx.fillStyle='#f6c8d5'
  ctx.font='650 28px system-ui,sans-serif'
  ctx.fillText([record.sector,record.city].filter(Boolean).join(' · '),55,950,970)
  ctx.font='760 64px system-ui,sans-serif'
  ctx.fillStyle='#fff'
  const title=wrap(ctx,record.title,970,2)
  title.forEach((line,i)=>ctx.fillText(line,53,1025+i*72,970))
  const priceY=title.length>1?1179:1123
  ctx.font='770 52px system-ui,sans-serif'
  ctx.fillText(price(record.price),53,priceY,970)
  ctx.font='620 28px system-ui,sans-serif'
  ctx.fillStyle='#f6dbe2'
  const details=[record.built!=null?quantity(record.built)+' m² de construcción':'',record.land!=null?quantity(record.land)+' m² de terreno':'',record.bedrooms?record.bedrooms+' dormitorios':''].filter(Boolean)
  ctx.fillText(details.join('  ·  '),55,priceY+51,970)
  ctx.fillStyle='#e7b3c2'
  ctx.font='600 24px system-ui,sans-serif'
  ctx.fillText('RG INMOBILIARIA CONSTRUCTORA',55,1303)
  ctx.textAlign='right'
  ctx.fillText([record.author,record.contact].filter(Boolean).join(' · '),1022,1303,480)
  return toBlob(canvas,'image/png')
}
