    'use strict';
    const STORAGE_KEY='hsc-5n403-admin-v2';
    const semesterStart=parseDate('2026-09-14');
    const semesterEnd=parseDate('2027-01-15');
    const internshipStart=parseDate('2026-10-05');
    const internshipEnd=parseDate('2026-10-25');
    const isAdmin=new URLSearchParams(location.search).get('manage')==='1';

    const periods={1:'08:10–09:00',2:'09:10–10:00',3:'10:10–11:00',4:'11:10–12:00',5:'12:50–13:40',6:'13:45–14:35',7:'14:50–15:40',8:'15:45–16:35'};
    const dayNames=['星期一','星期二','星期三','星期四','星期五'];
    const dayClasses=['monday','tuesday','wednesday','thursday','friday'];
    const colors={'其他':'#718096','護理倫理與法律':'#7554b7','體育（七）':'#3d995c','精神科護理學':'#3d7ec0','兒科護理學進階':'#d06d38','兒科護理學實驗':'#c45b56','通識課程':'#b78312','內外科護理學進階':'#2b837b','原住民健康促進':'#b67911','社區護理學進階':'#b34d83','停課':'#9c5b55','調課':'#7a58a5','補課':'#2b837b','活動':'#af7b18','考試':'#774e91','放假':'#b94e47'};

    const defaultFixed=[
      [{id:'f-m-2',start:2,end:2,title:'其他',teacher:'',room:''},{id:'f-m-78',start:7,end:8,title:'其他',teacher:'',room:''}],
      [{id:'f-tu-12',start:1,end:2,title:'護理倫理與法律',teacher:'陳鳳音',room:''},{id:'f-tu-3',start:3,end:3,title:'體育（七）',teacher:'施瑩悌',room:''},{id:'f-tu-56',start:5,end:6,title:'精神科護理學',teacher:'張銀玲',room:''}],
      [],
      [{id:'f-th-1',start:1,end:1,title:'精神科護理學',teacher:'張銀玲',room:''},{id:'f-th-2',start:2,end:2,title:'兒科護理學進階',teacher:'林素雯',room:''},{id:'f-th-34',start:3,end:4,title:'兒科護理學實驗',teacher:'林素雯',room:'兒科示範教室'}],
      [{id:'f-fr-12',start:1,end:2,title:'通識課程',teacher:'',room:''},{id:'f-fr-34',start:3,end:4,title:'內外科護理學進階',teacher:'王淑真',room:''},{id:'f-fr-56',start:5,end:6,title:'原住民健康促進',teacher:'楊金蘭',room:''},{id:'f-fr-78',start:7,end:8,title:'社區護理學進階',teacher:'李淑惠',room:''}]
    ];

    const defaultChanges=[
      {id:'c-reg',date:'2026-09-14',type:'活動',start:'all',end:'all',title:'註冊日',teacher:'',room:'',note:'依學校十八週課表'},
      {id:'c-mid',date:'2026-09-25',type:'放假',start:'all',end:'all',title:'中秋節放假',teacher:'',room:'',note:'全天放假'},
      {id:'c-teacher',date:'2026-09-28',type:'放假',start:'all',end:'all',title:'教師節放假',teacher:'',room:'',note:'全天放假'},
      {id:'c-national',date:'2026-10-09',type:'放假',start:'all',end:'all',title:'國慶日補假',teacher:'',room:'',note:'全天放假'},
      {id:'c-retro',date:'2026-10-26',type:'放假',start:'all',end:'all',title:'光復節放假',teacher:'',room:'',note:'全天放假'},
      {id:'c-school',date:'2026-11-23',type:'放假',start:'all',end:'all',title:'校慶日補假',teacher:'',room:'',note:'全天放假'},
      {id:'c-constitution',date:'2026-12-25',type:'放假',start:'all',end:'all',title:'行憲紀念日放假',teacher:'',room:'',note:'全天放假'},
      {id:'c-newyear',date:'2027-01-01',type:'放假',start:'all',end:'all',title:'元旦放假',teacher:'',room:'',note:'全天放假'}
    ];

    const weekNotes={1:['註冊日','9/14 註冊日'],2:['放假提醒','9/25 中秋節放假'],3:['放假提醒','9/28 教師節放假'],4:['校外實習','10/5－10/25 校外實習；10/9 國慶日補假'],5:['校外實習','10/5－10/25 校外實習'],6:['校外實習','10/5－10/25 校外實習'],7:['返校提醒','10/26 光復節放假；10/27起恢復校內課程'],9:['期中考週','實際考試科目、時間與教室依學校公告'],11:['放假提醒','11/23 校慶日補假'],15:['放假提醒','12/25 行憲紀念日放假'],16:['放假提醒','1/1 元旦放假'],18:['期末考週','實際考試科目、時間與教室依學校公告']};

    function clone(v){return JSON.parse(JSON.stringify(v))}
    function defaultState(){return {v:2,updatedAt:new Date().toISOString(),fixed:clone(defaultFixed),changes:clone(defaultChanges)}}
    function normalizeState(raw){
      if(!raw||typeof raw!=='object')return defaultState();
      const fixed=Array.isArray(raw.fixed)&&raw.fixed.length===5?raw.fixed:clone(defaultFixed);
      const changes=Array.isArray(raw.changes)?raw.changes:clone(defaultChanges);
      fixed.forEach((day,di)=>{if(!Array.isArray(day))fixed[di]=[];else day.forEach(c=>{c.id=c.id||uid('f');c.start=Number(c.start);c.end=Number(c.end);c.title=String(c.title||'未命名課程');c.teacher=String(c.teacher||'');c.room=String(c.room||'')})});
      changes.forEach(c=>{c.id=c.id||uid('c');c.date=String(c.date||'');c.type=String(c.type||'活動');c.start=c.start==='all'?'all':Number(c.start);c.end=c.end==='all'?'all':Number(c.end);c.title=String(c.title||c.type);c.teacher=String(c.teacher||'');c.room=String(c.room||'');c.note=String(c.note||'')});
      return {v:2,updatedAt:raw.updatedAt||new Date().toISOString(),fixed,changes};
    }
    function parseDate(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12,0,0)}
    function pad(n){return String(n).padStart(2,'0')}
    function iso(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
    function md(d){return `${d.getMonth()+1}/${d.getDate()}`}
    function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
    function weekStart(w){return addDays(semesterStart,(w-1)*7)}
    function uid(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}
    function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
    function fmtDateTime(s){try{return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(s))}catch{return ''}}
    function isInternship(d){return d>=internshipStart&&d<=internshipEnd}
    function periodLabel(c){if(c.start==='all')return '全天';return Number(c.start)===Number(c.end)?`第${c.start}節`:`第${c.start}–${c.end}節`}
    function timeLabel(c){if(c.start==='all')return '全天';return Number(c.start)===Number(c.end)?periods[c.start]:`${periods[c.start].split('–')[0]}–${periods[c.end].split('–')[1]}`}
    function weekOfDate(s){const d=parseDate(s);return Math.floor((d-semesterStart)/(7*86400000))+1}
    function currentWeekNumber(){const now=new Date();const diff=Math.floor((now-semesterStart)/(7*86400000))+1;return Math.min(18,Math.max(1,diff))}
    function toBase64Url(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
    function fromBase64Url(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}
