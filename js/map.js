window.WorldMap = (()=>{
  const NS=WorldUtils.svgNS;
  const VIEW_W=1600,VIEW_H=1013;
  let isDragging=false,dragStartX=0,dragStartY=0,startX=0,startY=0;

  function isActive(item,year){const start=item.startYear??item.year??1;const end=item.endYear??Infinity;return year>=start&&year<=end;}
  function isFuture(item,year){return year<(item.startYear??item.year??1);}
  function isEnded(item,year){return Number.isFinite(item.endYear)&&year>item.endYear;}
  function currentState(item,year){
    const states=item.states||[];
    return states.find(s=>year>=s.from&&year<=s.to)||states.filter(s=>year>=s.from).sort((a,b)=>b.from-a.from)[0]||null;
  }
  function renderRegions(){
    const box=document.getElementById('mapRegions');const labels=document.getElementById('mapRegionLabels');
    box.innerHTML='';labels.innerHTML='';
    window.WorldData.regions.forEach(r=>{
      const path=document.createElementNS(NS,'path');path.classList.add('region');path.dataset.regionId=r.id;path.setAttribute('d',r.path);path.setAttribute('fill',r.fill);path.setAttribute('stroke',r.stroke);path.setAttribute('stroke-width','1.5');if(r.dashed)path.setAttribute('stroke-dasharray','6 4');
      box.appendChild(path);
      const text=document.createElementNS(NS,'text');text.classList.add('region-label');text.setAttribute('x',r.labelX);text.setAttribute('y',r.labelY);text.setAttribute('font-size',r.id==='sea'?15:20);text.setAttribute('opacity','.55');text.textContent=r.name;labels.appendChild(text);
    });
  }
  function renderMarkers(){
    const g=document.getElementById('mapMarkers');if(!g)return;g.innerHTML='';
    const year=WorldState.currentYear;
    const unlocked=window.WorldData.locations.filter(x=>isActive(x,year)).length;
    window.WorldData.locations.forEach(loc=>{
      if(!isActive(loc,year)&&!isFuture(loc,year)&&!isEnded(loc,year))return;
      const future=isFuture(loc,year),ended=isEnded(loc,year),state=currentState(loc,year);
      const group=document.createElementNS(NS,'g');group.classList.add('marker');if(future)group.classList.add('future');if(ended)group.classList.add('marker-ended');group.dataset.id=loc.id;group.style.color=state?.color||loc.color;
      const halo=document.createElementNS(NS,'circle');halo.classList.add('halo');halo.setAttribute('cx',loc.x);halo.setAttribute('cy',loc.y);halo.setAttribute('r',10);group.appendChild(halo);
      if(!future&&!ended){const pulse=document.createElementNS(NS,'circle');pulse.classList.add('location-pulse');pulse.setAttribute('cx',loc.x);pulse.setAttribute('cy',loc.y);pulse.setAttribute('r',9);group.appendChild(pulse);}
      const dot=document.createElementNS(NS,'circle');dot.classList.add('dot');dot.setAttribute('cx',loc.x);dot.setAttribute('cy',loc.y);dot.setAttribute('r',6);group.appendChild(dot);
      const text=document.createElementNS(NS,'text');text.setAttribute('x',loc.x);text.setAttribute('y',loc.y-14);text.textContent=loc.name;group.appendChild(text);
      if(state?.label){const s=document.createElementNS(NS,'text');s.classList.add('marker-state');s.setAttribute('x',loc.x);s.setAttribute('y',loc.y+18);s.textContent=future?'未开放':state.label;group.appendChild(s);}
      group.addEventListener('click',e=>{e.stopPropagation();if(future){showToast(`“${loc.name}”将在天启${WorldUtils.toCN(loc.startYear)}年开放`);return;}WorldState.select('location',loc.id);WorldState.selectedLocationId=loc.id;WorldState.emit('openLocation');});
      g.appendChild(group);
    });
    document.getElementById('statUnlocked')?.replaceChildren(document.createTextNode(String(unlocked)));
    document.getElementById('resourcePageDesc').textContent=`天启${WorldUtils.toCN(year)}年 · 已出现地点 ${unlocked}/${window.WorldData.locations.length} · 资源 ${window.WorldData.locations.filter(x=>isActive(x,year)).reduce((n,x)=>n+x.res.length,0)} 项`;
  }
  function applyTransform(){const m=WorldState.map;document.getElementById('mapViewport').style.transform=`translate(${m.x}px,${m.y}px) scale(${m.scale})`;}
  function fitToScreen(){const bg=document.getElementById('mapBg');const scale=Math.min(bg.clientWidth/VIEW_W,bg.clientHeight/VIEW_H);WorldState.map.scale=scale;WorldState.map.x=(bg.clientWidth-VIEW_W*scale)/2;WorldState.map.y=(bg.clientHeight-VIEW_H*scale)/2;applyTransform();}
  function zoomAtPoint(factor,px,py){const m=WorldState.map,old=m.scale,newScale=WorldUtils.clamp(old*factor,m.minScale,m.maxScale);if(newScale===old)return;const mx=(px-m.x)/old,my=(py-m.y)/old;m.scale=newScale;m.x=px-mx*newScale;m.y=py-my*newScale;applyTransform();}
  function zoomCenter(factor){const bg=document.getElementById('mapBg');zoomAtPoint(factor,bg.clientWidth/2,bg.clientHeight/2)}
  function init(){
    renderRegions();renderMarkers();fitToScreen();
    const bg=document.getElementById('mapBg');
    bg.addEventListener('pointerdown',e=>{
      if(e.target.closest('.marker'))return;
      if(e.pointerType==='mouse'&&e.button!==0)return;
      isDragging=true;dragStartX=e.clientX;dragStartY=e.clientY;startX=WorldState.map.x;startY=WorldState.map.y;bg.classList.add('dragging');bg.setPointerCapture?.(e.pointerId);
    });
    bg.addEventListener('pointermove',e=>{if(!isDragging)return;WorldState.map.x=startX+e.clientX-dragStartX;WorldState.map.y=startY+e.clientY-dragStartY;applyTransform();});
    const stop=()=>{isDragging=false;bg.classList.remove('dragging')};bg.addEventListener('pointerup',stop);bg.addEventListener('pointercancel',stop);
    bg.addEventListener('wheel',e=>{e.preventDefault();const r=bg.getBoundingClientRect();zoomAtPoint(e.deltaY>0?.9:1.1,e.clientX-r.left,e.clientY-r.top)},{passive:false});
    document.getElementById('zoomInBtn').addEventListener('click',()=>zoomCenter(1.25));document.getElementById('zoomOutBtn').addEventListener('click',()=>zoomCenter(1/1.25));document.getElementById('resetViewBtn').addEventListener('click',fitToScreen);
    window.addEventListener('resize',fitToScreen);
    WorldState.on(reason=>{if(reason==='year')renderMarkers();});
  }
  function focusLocation(id){const loc=window.WorldData.locations.find(x=>x.id===id);if(!loc)return;const bg=document.getElementById('mapBg');const targetScale=1.45;WorldState.map.scale=targetScale;WorldState.map.x=bg.clientWidth/2-loc.x*(targetScale);WorldState.map.y=bg.clientHeight/2-loc.y*(targetScale);applyTransform();document.querySelectorAll('.marker').forEach(x=>x.classList.remove('map-highlight'));const marker=document.querySelector(`.marker[data-id="${id}"]`);marker?.classList.add('map-highlight');setTimeout(()=>marker?.classList.remove('map-highlight'),2200)}
  return {init,renderMarkers,fitToScreen,zoomCenter,focusLocation,isActive,isFuture,isEnded,currentState};
})();
