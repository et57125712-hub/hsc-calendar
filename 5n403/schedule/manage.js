    function fixedCardHTML(c,dayIndex){
      const base=courseHTML(c);if(!isAdmin)return base;
      return `<div class="editable-course" data-id="${esc(c.id)}">${base}<div class="edit-tools"><button type="button" data-edit-fixed="${esc(c.id)}" data-day="${dayIndex}">編輯</button><button type="button" data-delete-fixed="${esc(c.id)}" data-day="${dayIndex}">刪除</button></div></div>`
    }
    function renderFixed(){
      $('fixedGrid').innerHTML=state.fixed.map((courses,i)=>`<section class="fixed-admin-day ${dayClasses[i]}"><div class="day-head"><div><strong>${dayNames[i]}</strong><span>固定課表</span></div>${isAdmin?`<button class="btn small" data-add-fixed="${i}">＋新增</button>`:''}</div><div class="fixed-list">${courses.length?courses.slice().sort((a,b)=>a.start-b.start).map(c=>fixedCardHTML(c,i)).join(''):'<div class="day-empty">目前無固定課程</div>'}</div></section>`).join('')
    }

    function changeMeta(c){return [c.type,periodLabel(c),c.teacher,c.room,c.note].filter(Boolean).map(esc).join('｜')}
    function renderChanges(){
      const list=state.changes.slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.start).localeCompare(String(b.start)));$('changeCount').textContent=`${list.length}筆異動`;
      $('changeList').innerHTML=list.length?list.map(c=>`<article class="record" style="border-left-color:${typeColor(c.type,c.title)}"><div class="record-date"><strong>${esc(c.date)}（${dayNames[(parseDate(c.date).getDay()+6)%7]||'週末'}）</strong><span>${esc(periodLabel(c))}</span></div><div class="record-main"><h3><span class="tag" style="--course:${typeColor(c.type,c.title)}">${esc(c.type)}</span> ${esc(c.title)}</h3><p>${changeMeta(c)}</p></div><div class="record-buttons"><button class="btn small" data-edit-change="${esc(c.id)}">編輯</button><button class="btn small danger" data-delete-change="${esc(c.id)}">刪除</button></div></article>`).join(''):'<div class="empty-state">尚無課程異動。<br>點選「新增異動」即可開始登錄。</div>'
    }

    function renderSemester(){
      const current=currentWeekNumber();$('semesterGrid').innerHTML=Array.from({length:18},(_,idx)=>{const w=idx+1,s=weekStart(w),e=addDays(s,4);let cls='',note='<span class="week-normal">一般上課週</span>';if([4,5,6].includes(w)){cls='intern';note=weekNotes[w][1]}else if([9,18].includes(w)){cls='exam';note=weekNotes[w][0]}else if(weekNotes[w]){cls='special';note=weekNotes[w][1]}const custom=state.changes.filter(c=>weekOfDate(c.date)===w&&!c.id.startsWith('c-')).length;if(custom)note+=`<br><span class="week-normal">另有 ${custom} 筆學藝異動</span>`;return `<article class="week-card ${cls} ${w===current?'current':''}"><div class="week-no">第${w}週${w===current?'・本週':''}</div><div class="week-range">${md(s)}－${md(e)}</div><div class="week-note">${note}</div></article>`}).join('')
    }

    function renderFooter(){const date=state.updatedAt?fmtDateTime(state.updatedAt):'';$('footerText').textContent=`最後更新：${date||'原始版本'}｜5N403班級課表${hashMatch&&!isAdmin?'・班群分享版':''}`}
    function renderAll(){renderWeek();renderFixed();renderChanges();renderSemester();renderFooter()}

    function openChange(id=''){
      const c=id?state.changes.find(x=>x.id===id):null;$('changeModalTitle').textContent=c?'編輯異動':'新增異動';$('changeId').value=c?.id||'';$('changeDate').value=c?.date||iso(weekStart(selectedWeek));$('changeType').value=c?.type||'調課';$('changeStart').value=String(c?.start??'1');$('changeEnd').value=String(c?.end??'1');$('changeTitle').value=c?.title||'';$('changeTeacher').value=c?.teacher||'';$('changeRoom').value=c?.room||'';$('changeNote').value=c?.note||'';syncAllDay();$('changeModal').classList.remove('hidden')
    }
    function syncAllDay(){const all=$('changeStart').value==='all';$('changeEnd').value=all?'all':($('changeEnd').value==='all'?'1':$('changeEnd').value);$('changeEnd').disabled=all}
    function openFixed(day,id=''){
      const c=id?state.fixed[day].find(x=>x.id===id):null;$('fixedModalTitle').textContent=c?'編輯固定課程':'新增固定課程';$('fixedId').value=c?.id||'';$('fixedDay').value=day;$('fixedDaySelect').value=String(day);$('fixedTitle').value=c?.title||'';$('fixedStart').value=String(c?.start||1);$('fixedEnd').value=String(c?.end||1);$('fixedTeacher').value=c?.teacher||'';$('fixedRoom').value=c?.room||'';$('fixedModal').classList.remove('hidden')
    }
    function closeModal(id){$(id).classList.add('hidden')}
    function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2300)}

    function publicShareUrl(){const payload={v:2,updatedAt:state.updatedAt,fixed:state.fixed,changes:state.changes};return `${location.origin}${location.pathname}#s=${encodeURIComponent(toBase64Url(payload))}`}
    function copyText(text,msg){window.prompt(msg+'（長按或全選複製）',text)}
