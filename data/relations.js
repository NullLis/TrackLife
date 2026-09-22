window.WorldData = window.WorldData || {};
window.WorldData.factionRelations = [
  {from:'f1',to:'f2',label:'同盟',startYear:2,endYear:null,color:'#d4a76a'},
  {from:'f1',to:'f3',label:'敌对',startYear:2,endYear:null,color:'#d46a6a'},
  {from:'f1',to:'f4',label:'合作',startYear:2,endYear:null,color:'#a78bda'},
  {from:'f1',to:'f5',label:'利用',startYear:2,endYear:null,color:'#6ad48a',dashed:true},
  {from:'f1',to:'f6',label:'中立',startYear:2,endYear:null,color:'#8b949e'},
  {from:'f2',to:'f3',label:'宿怨',startYear:4,endYear:null,color:'#d46a6a'},
  {from:'f4',to:'f3',label:'暗通',startYear:4,endYear:null,color:'#d46a6a',dashed:true},
  {from:'f5',to:'f6',label:'金主',startYear:2,endYear:null,color:'#6ad48a'}
];
window.WorldData.characterRelations = [
  {from:'r1',to:'r2',label:'知己',startYear:3,endYear:null,color:'#6ba3d4'},
  {from:'r1',to:'r3',label:'挚友',startYear:3,endYear:null,color:'#6ad48a'},
  {from:'r1',to:'r4',label:'师徒',startYear:3,endYear:3,color:'#a78bda'},
  {from:'r1',to:'r5',label:'宿敌',startYear:4,endYear:null,color:'#d46a6a'},
  {from:'r1',to:'r6',label:'血仇',startYear:5,endYear:null,color:'#d46a6a'},
  {from:'r4',to:'r6',label:'封印',startYear:1,endYear:3,color:'#d46a6a',dashed:true},
  {from:'r5',to:'r6',label:'主仆',startYear:5,endYear:null,color:'#d46a6a',dashed:true}
];
