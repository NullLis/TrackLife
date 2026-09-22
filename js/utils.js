window.WorldUtils = {
  svgNS:'http://www.w3.org/2000/svg',
  hexA(hex,alpha){
    let value=String(hex||'').replace('#','');
    if(value.length===3)value=value.split('').map(c=>c+c).join('');
    const n=parseInt(value,16);
    if(Number.isNaN(n))return `rgba(255,255,255,${alpha})`;
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
  },
  toCN(n){return ['','元','二','三','四','五','六','七','八','九','十'][n]||String(n);},
  yearName(n){return `天启${this.toCN(n)}年`;},
  clamp(value,min,max){return Math.max(min,Math.min(max,value));},
  escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));},
  makeIdList(values){return [...new Set(values||[])];}
};
