    let state;
    const hashMatch=location.hash.match(/(?:^#|&)s=([^&]+)/);
    if(hashMatch){
      try{state=normalizeState(fromBase64Url(decodeURIComponent(hashMatch[1])));if(isAdmin)localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
      catch(e){state=null;console.warn('Invalid shared state',e)}
    }
    if(!state&&isAdmin){try{state=normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'))}catch{state=defaultState()}}
    if(!state)state=defaultState();

    let selectedWeek=currentWeekNumber();
    let activeView='week';

    const $=id=>document.getElementById(id);
    const tabs=isAdmin?
      [{id:'week',label:'週課表'},{id:'changes',label:'異動管理'},{id:'fixed',label:'固定課表'}]:
      [{id:'week',label:'週課表'},{id:'fixed',label:'固定課表'},{id:'semester',label:'18週行事'}];
    $('tabs').innerHTML=tabs.map((t,i)=>`<button class="tab ${i===0?'active':''}" data-view="${t.id}">${t.label}</button>`).join('');
    if(isAdmin){$('adminBadge').classList.remove('hidden');$('adminBanner').classList.remove('hidden');$('publishBtn').classList.remove('hidden');$('fixedDescription').textContent='可新增、修改或刪除整學期固定課程；單次異動請到「異動管理」。'}

    const weekSelect=$('weekSelect');
    for(let i=1;i<=18;i++){const s=weekStart(i),e=addDays(s,4);weekSelect.insertAdjacentHTML('beforeend',`<option value="${i}">第${i}週｜${md(s)}－${md(e)}</option>`)}

    function save(){state.updatedAt=new Date().toISOString();if(isAdmin)localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderAll()}
    function setView(view){activeView=view;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===view));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${view}`));if(view==='changes')renderChanges();if(view==='fixed')renderFixed();if(view==='semester')renderSemester();window.scrollTo({top:0,behavior:'smooth'})}

    function typeColor(type,title){return colors[title]||colors[type]||'#487ca7'}
    function courseHTML(c,tag=''){
      const meta=[c.teacher,c.room].filter(Boolean).map(esc).join('｜');const color=typeColor(c.type,c.title);
      return `<article class="course" style="--course:${color}">${tag?`<span class="tag">${esc(tag)}</span>`:''}<div class="course-top"><span class="period">${esc(periodLabel(c))}</span><span class="time">${esc(timeLabel(c))}</span></div><h3>${esc(c.title)}</h3>${meta?`<div class="course-meta">${meta}</div>`:''}${c.note?`<div class="course-note">${esc(c.note)}</div>`:''}</article>`
    }
    function dayChanges(key){return state.changes.filter(c=>c.date===key).sort((a,b)=>{const av=a.start==='all'?0:Number(a.start),bv=b.start==='all'?0:Number(b.start);return av-bv})}
    function resolvedCourses(dayIndex,key){
      const changes=dayChanges(key);if(changes.some(c=>c.start==='all'))return {allDay:changes.find(c=>c.start==='all'),items:[]};
      let items=clone(state.fixed[dayIndex]||[]).map(c=>({...c,source:'fixed'}));
      changes.forEach(ch=>{
        const s=Number(ch.start),e=Number(ch.end);
        if(ch.type==='停課'){
          items=items.filter(c=>Number(c.end)<s||Number(c.start)>e);
          items.push({...ch,source:'change'});
        }else{
          items=items.filter(c=>Number(c.end)<s||Number(c.start)>e);
          items.push({...ch,source:'change'});
        }
      });
      items.sort((a,b)=>Number(a.start)-Number(b.start));return {allDay:null,items};
    }
    function eventClass(type){return type==='放假'?'holiday':type==='考試'?'exam':type==='停課'?'cancel':'activity'}
    function dayCardHTML(dayIndex,date,weekly=true){
      const key=iso(date);const resolved=weekly?resolvedCourses(dayIndex,key):{allDay:null,items:clone(state.fixed[dayIndex]||[])};let body='';
      if(weekly&&resolved.allDay){const e=resolved.allDay;body=`<div class="day-event event-${eventClass(e.type)}">${esc(e.title)}<br><small>${esc(e.note||e.type)}</small></div>`}
      else if(weekly&&isInternship(date)){body='<div class="day-event event-internship">校外實習<br><small>不在校</small></div>'}
      else if(resolved.items.length){body=resolved.items.map(c=>courseHTML(c,c.source==='change'?c.type:'')).join('')}
      else body='<div class="day-empty">目前無固定課程</div>';
      return `<section class="day-card ${dayClasses[dayIndex]}"><div class="day-head"><strong>${dayNames[dayIndex]}</strong><span>${weekly?`${md(date)}｜${key}`:'固定課表'}</span></div><div class="day-body">${body}</div></section>`
    }

    function renderWeek(){
      const s=weekStart(selectedWeek),e=addDays(s,4);$('weekTitle').textContent=`第${selectedWeek}週`;$('weekRange').textContent=`${md(s)}－${md(e)}`;$('weekStatus').textContent=`第${selectedWeek}週`;weekSelect.value=selectedWeek;$('prevWeek').disabled=selectedWeek===1;$('nextWeek').disabled=selectedWeek===18;
      $('weeklyGrid').innerHTML=state.fixed.map((_,i)=>dayCardHTML(i,addDays(s,i),true)).join('');
      const notices=[];if(weekNotes[selectedWeek])notices.push(weekNotes[selectedWeek]);const count=state.changes.filter(c=>weekOfDate(c.date)===selectedWeek&&!c.id.startsWith('c-')).length;if(count)notices.push(['本週課表異動',`學藝已登錄 ${count} 筆異動，請留意各日課程卡片。`]);
      if(notices.length){$('weekNotice').classList.remove('hidden');$('noticeTitle').textContent=notices.map(n=>n[0]).join('｜');$('noticeText').textContent=notices.map(n=>n[1]).join('；')}else $('weekNotice').classList.add('hidden')
    }
