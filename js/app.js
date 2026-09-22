(function(){
  function init(){
    WorldMap.init();
    RelationUI.init();
    SidebarUI.init();
    TimelineUI.init();
    TabsUI.init();
    renderTopStats();
    WorldState.on(reason=>{if(reason==='year')renderTopStats()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('infoView').classList.contains('show'))TabsUI.setTab('map');else SidebarUI.close()}});
  }
  function renderTopStats(){
    const y=WorldState.currentYear;
    const stats=[
      ['地点',WorldData.locations.filter(x=>WorldMap.isActive(x,y)).length+'/'+WorldData.locations.length],
      ['人物',WorldData.characters.filter(x=>WorldMap.isActive(x,y)).length+'/'+WorldData.characters.length],
      ['势力',WorldData.factions.filter(x=>WorldMap.isActive(x,y)).length+'/'+WorldData.factions.length],
      ['资源',WorldData.locations.filter(x=>WorldMap.isActive(x,y)).reduce((n,x)=>n+x.res.length,0)],
      ['事件',WorldData.events.filter(x=>x.start<=y&&x.end>=y).length]
    ];
    document.getElementById('topbarStats').innerHTML=stats.map(([k,v])=>`<span class="stat-pill">${k}<b>${v}</b></span>`).join('');
  }
  window.showToast=function(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>toast.classList.remove('show'),1800)};
  document.addEventListener('DOMContentLoaded',init);
})();
