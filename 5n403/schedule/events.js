    $('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view)});
    $('prevWeek').addEventListener('click',()=>{if(selectedWeek>1){selectedWeek--;renderWeek()}});$('nextWeek').addEventListener('click',()=>{if(selectedWeek<18){selectedWeek++;renderWeek()}});weekSelect.addEventListener('change',()=>{selectedWeek=Number(weekSelect.value);renderWeek()});
    $('printBtn').addEventListener('click',()=>window.print());$('shareViewBtn').addEventListener('click',()=>copyText(location.href,'目前頁面連結已複製'));
    $('publishBtn').addEventListener('click',()=>{save();copyText(publicShareUrl(),'最新班群連結已複製，請貼到班群')});
    $('addChangeBtn').addEventListener('click',()=>openChange());$('changeStart').addEventListener('change',syncAllDay);
    document.addEventListener('click',e=>{
      const close=e.target.closest('[data-close]');if(close)closeModal(close.dataset.close);
      const ec=e.target.closest('[data-edit-change]');if(ec)openChange(ec.dataset.editChange);
      const dc=e.target.closest('[data-delete-change]');if(dc&&confirm('確定刪除這筆異動？')){state.changes=state.changes.filter(c=>c.id!==dc.dataset.deleteChange);save();toast('異動已刪除')}
      const af=e.target.closest('[data-add-fixed]');if(af)openFixed(Number(af.dataset.addFixed));
      const ef=e.target.closest('[data-edit-fixed]');if(ef)openFixed(Number(ef.dataset.day),ef.dataset.editFixed);
      const df=e.target.closest('[data-delete-fixed]');if(df&&confirm('確定刪除這門固定課程？')){const day=Number(df.dataset.day);state.fixed[day]=state.fixed[day].filter(c=>c.id!==df.dataset.deleteFixed);save();toast('固定課程已刪除')}
      if(e.target.classList.contains('modal-backdrop'))closeModal(e.target.id)
    });

    $('changeForm').addEventListener('submit',e=>{
      e.preventDefault();const start=$('changeStart').value;const end=start==='all'?'all':Number($('changeEnd').value);if(start!=='all'&&Number(start)>Number(end)){toast('結束節次不可早於開始節次');return}
      const item={id:$('changeId').value||uid('c'),date:$('changeDate').value,type:$('changeType').value,start:start==='all'?'all':Number(start),end,title:$('changeTitle').value.trim(),teacher:$('changeTeacher').value.trim(),room:$('changeRoom').value.trim(),note:$('changeNote').value.trim()};
      const duplicate=state.changes.find(c=>c.id!==item.id&&c.date===item.date&&String(c.start)===String(item.start)&&String(c.end)===String(item.end));if(duplicate&&!confirm('同一天同一節已有其他異動，仍要保留兩筆嗎？'))return;
      const i=state.changes.findIndex(c=>c.id===item.id);if(i>=0)state.changes[i]=item;else state.changes.push(item);save();closeModal('changeModal');toast('異動已儲存')
    });

    $('fixedForm').addEventListener('submit',e=>{
      e.preventDefault();const oldDay=Number($('fixedDay').value),day=Number($('fixedDaySelect').value),start=Number($('fixedStart').value),end=Number($('fixedEnd').value);if(start>end){toast('結束節次不可早於開始節次');return}
      const item={id:$('fixedId').value||uid('f'),start,end,title:$('fixedTitle').value.trim(),teacher:$('fixedTeacher').value.trim(),room:$('fixedRoom').value.trim()};
      if($('fixedId').value)state.fixed[oldDay]=state.fixed[oldDay].filter(c=>c.id!==item.id);state.fixed[day].push(item);state.fixed[day].sort((a,b)=>a.start-b.start);save();closeModal('fixedModal');toast('固定課程已儲存')
    });

    $('backupBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`5N403課表備份_${iso(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);toast('備份檔已下載')});
    $('importBtn').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{state=normalizeState(JSON.parse(await f.text()));save();toast('備份已匯入')}catch{toast('備份檔格式不正確')}finally{e.target.value=''}});
    $('resetBtn').addEventListener('click',()=>{if(confirm('確定恢復原始課表？自行新增的固定課與異動都會清除。')){state=defaultState();save();toast('已恢復原始課表')}});

    renderAll();
    const footerNote=document.querySelector('.footer-note div:last-child');if(footerNote)footerNote.innerHTML='<strong>課表提醒</strong><br>星期一第2、7、8節為「其他」；星期五第1、2節為「通識課程」。10/5－10/25為校外實習期間；臨時異動以學藝發布的最新班群連結為準。';
