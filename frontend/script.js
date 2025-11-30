  (function(){
      // simple local state
      let tasks = []; // array of task objects
      let nextId = 1;
      const STORAGE_KEY = 'smart_tasks_history_v1';

      // helper selectors
      const qs = s => document.querySelector(s);

      // render current tasks (left id, middle name+created, right score if present)
      function renderTasks(){
        const el = qs('#tasksList'); el.innerHTML='';
        tasks.forEach(t => {
          const row = document.createElement('div'); row.className='task-line';
          const idSpan = document.createElement('div'); idSpan.className='task-id'; idSpan.textContent = t.id;
          const left = document.createElement('div'); left.className='task-left';
          const info = document.createElement('div');
          info.innerHTML = `<div><strong>${escapeHtml(t.title||'Untitled')}</strong></div><div class='task-meta'>Created: ${new Date(t.created_at||Date.now()).toLocaleString()}</div>`;
          left.appendChild(idSpan); left.appendChild(info);
          const scoreDiv = document.createElement('div'); scoreDiv.className='task-score'; scoreDiv.textContent = (t.score !== undefined) ? t.score : '-';
          row.appendChild(left); row.appendChild(scoreDiv);
          el.appendChild(row);
        });
      }

      // escape helper
      function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[c])); }

      // add single task
      qs('#addBtn').addEventListener('click', ()=>{
        const title = qs('#title').value.trim();
        const due_date = qs('#due_date').value || '';
        const est = qs('#estimated_hours').value.trim();
        const importance = qs('#importance').value.trim() || 5;
        let deps = qs('#dependencies').value.trim();
        if(!title) return alert('Please enter title');
        deps = deps ? deps.split(',').map(x=>Number(x.trim())).filter(x=>!isNaN(x)) : [];
        const t = { id: nextId++, title, due_date, estimated_hours: Number(est)||0, importance: Number(importance)||5, dependencies: deps, created_at: new Date().toISOString() };
        tasks.push(t); renderTasks(); qs('#addStatus').textContent='Task added.'; setTimeout(()=>qs('#addStatus').textContent='',1800);
      });
      qs('#clearFormBtn').addEventListener('click', ()=>{ qs('#title').value=''; qs('#due_date').value=''; qs('#estimated_hours').value=''; qs('#dependencies').value=''; qs('#importance').value=5; });

      // load sample JSON
      qs('#pasteSampleBtn').addEventListener('click', ()=>{
        const sample = JSON.stringify([
          {id:1,title:'Fix login bug',due_date:'2025-11-30',estimated_hours:3,importance:8,dependencies:[]},
          {id:2,title:'Hotfix',due_date:'2025-11-15',estimated_hours:1,importance:10,dependencies:[]}
        ], null, 2);
        qs('#bulkInput').value = sample;
      });

      // load bulk
      qs('#loadBulkBtn').addEventListener('click', ()=>{
        const raw = qs('#bulkInput').value.trim();
        if(!raw) return qs('#bulkStatus').textContent='Paste JSON first.';
        try{ const arr = JSON.parse(raw); if(!Array.isArray(arr)) throw 0; arr.forEach(a=>{ a.id = a.id || nextId++; a.created_at = a.created_at || new Date().toISOString(); a.dependencies = a.dependencies || []; tasks.push(a); }); renderTasks(); qs('#bulkStatus').textContent='Loaded.'; setTimeout(()=>qs('#bulkStatus').textContent='',1500);}catch(e){qs('#bulkStatus').textContent='Invalid JSON';}
      });

      // analyze -> call backend
      qs('#analyzeBtn').addEventListener('click', async ()=>{
        qs('#cycleStatus').textContent=''; qs('#recTitle').style.display='none'; qs('#recommended').innerHTML='';
        const type = qs('#analyzeType').value;
        if(tasks.length===0){ return alert('No tasks to analyze. Add tasks or paste JSON.'); }
        const payload = { Tasks: tasks, analyseType: type };
        // call server - fallback to local mock if server fails
        const url = 'http://127.0.0.1:8000/api/tasks/analyze/';
        try{
          const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
          if(!res.ok) throw 0;
          const json = await res.json();
          renderRecommendations(json.recommendations || [], json.cycleStatus || '');
        }catch(err){
          // fallback: do simple client-side mock ranking by score if server not reachable
          console.warn('Backend not reachable, using client-side mock score.');
          const recs = clientSideAnalyze(tasks, type);
          renderRecommendations(recs, '');
        }
      });
      // clear all current tasks
      qs('#clearTasksBtn').addEventListener('click', () => {
        if (!confirm('Clear ALL current tasks?')) return;
        tasks = [];
        nextId = 1;
        renderTasks();
        alert('All current tasks cleared.');
      });


      // render recommendations (array)
      function renderRecommendations(recs, cycleMsg){
        qs('#recTitle').style.display='block'; qs('#recommended').innerHTML=''; qs('#cycleStatus').textContent = cycleMsg || '';
        recs.forEach((task, idx)=>{
          // update local tasks score display if matching id
          const local = tasks.find(t=>t.id === task.id);
          if(local) local.score = task.score;

          const card = document.createElement('div'); card.className='reco-card';
          card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div style="font-weight:700">${escapeHtml(task.title || 'Untitled')}</div>
                <div class="small-muted">ID: ${task.id} • Est: ${task.estimated_hours||'-'}h • Created: ${new Date(task.created_at||Date.now()).toLocaleString()}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:800; font-size:1.1rem">${task.score !== undefined ? task.score : '-'}</div>
                <div class="small-muted">Rank: ${idx+1}</div>
              </div>
            </div>
            <div class="mt-2 small-muted">${escapeHtml(task.remarks || (task.explanation || 'No remarks provided'))}</div>
          `;
          qs('#recommended').appendChild(card);
        });
        renderTasks();
      }

      // save recommendations to localStorage
      qs('#saveRecoBtn').addEventListener('click', ()=>{
        const recEl = qs('#recommended'); if(!recEl.children.length) return alert('No recommendations to save');
        // build snapshot
        const ts = new Date().toISOString();
        const recs = Array.from(recEl.children).map(c=>{
          return {
            id: Number(c.querySelector('.small-muted')?.textContent?.match(/ID: (\d+)/)?.[1]) || null
          };
        });
        // better: take tasks array ordered by score
        const snapshot = { when: ts, items: tasks.map(t=>({...t})) };
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        existing.unshift(snapshot);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        alert('Saved recommended snapshot to local storage.');
      });

      // clear current recommendations
      qs('#clearRecoBtn').addEventListener('click', ()=>{ qs('#recommended').innerHTML=''; qs('#recTitle').style.display='none'; /* keep tasks */ });

      // show previous saved analyses
      qs('#seePrevBtn').addEventListener('click', ()=>{
        const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const list = qs('#prevList'); list.innerHTML='';
        if(!arr.length) list.innerHTML = '<div class="small-muted">No previous snapshots found.</div>';
        arr.forEach((snap, idx)=>{
          const div = document.createElement('div'); div.className='p-2 mb-2 border rounded';
          div.innerHTML = `<div class='d-flex justify-content-between align-items-center'><div><strong>${new Date(snap.when).toLocaleString()}</strong><div class='small-muted'>${snap.items.length} tasks</div></div>
            <div><button class='btn btn-sm btn-outline-primary loadSnap'>Load</button> <button class='btn btn-sm btn-outline-danger delSnap'>Delete</button></div></div>`;
          list.appendChild(div);
          div.querySelector('.loadSnap').addEventListener('click', ()=>{
            loadSnapshot(snap); qs('#previousWrapper').style.display='none';
          });
          div.querySelector('.delSnap').addEventListener('click', ()=>{
            if(!confirm('Delete this snapshot?')) return; arr.splice(idx,1); localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); div.remove();
          });
        });
        qs('#previousWrapper').style.display='block';
      });
      qs('#closePrev').addEventListener('click', ()=>qs('#previousWrapper').style.display='none');

      // load snapshot into previous data container (shows on top)
      function loadSnapshot(snap){
        // Replace current tasks completely
        tasks = snap.items.map(t => ({...t}));
        nextId = Math.max(...tasks.map(t=>t.id)) + 1;
        renderTasks();
        
        qs('#previousDataContainer').style.display='block'; const el = qs('#loadedPrevContent'); el.innerHTML='';
        snap.items.forEach(t=>{ const line = document.createElement('div'); line.className='task-line'; line.innerHTML = `<div class='task-left'><div class='task-id'>${t.id}</div><div><strong>${escapeHtml(t.title||'')}</strong><div class='task-meta'>Created: ${new Date(t.created_at||Date.now()).toLocaleString()}</div></div></div><div class='task-score'>${t.score !== undefined ? t.score : '-'}</div>`; el.appendChild(line); });
        qs('#closeLoadedPrev').addEventListener('click', ()=>{ qs('#previousDataContainer').style.display='none'; });
      }(snap)=>{
        qs('#previousDataContainer').style.display='block'; const el = qs('#loadedPrevContent'); el.innerHTML='';
        snap.items.forEach(t=>{ const line = document.createElement('div'); line.className='task-line'; line.innerHTML = `<div class='task-left'><div class='task-id'>${t.id}</div><div><strong>${escapeHtml(t.title||'')}</strong><div class='task-meta'>Created: ${new Date(t.created_at||Date.now()).toLocaleString()}</div></div></div><div class='task-score'>${t.score !== undefined ? t.score : '-'}</div>`; el.appendChild(line); });
        qs('#closeLoadedPrev').addEventListener('click', ()=>{ qs('#previousDataContainer').style.display='none'; });
      }

      // client-side fallback analyze (mock) - simple scoring so UI remains usable without backend
      function clientSideAnalyze(tasksArr, type){
        // shallow copy
        const copy = tasksArr.map(t=>({...t}));
        // simple score depending on type
        copy.forEach(t=>{
          if(type==='fastest') t.score = (1/(1+(t.estimated_hours||0))).toFixed(3);
          else if(type==='impact') t.score = ((t.importance||0)/10).toFixed(3);
          else if(type==='deadline'){
            const d = t.due_date ? new Date(t.due_date) : null; const days = d ? Math.max(0, Math.ceil((d - new Date())/86400000)) : 999; t.score = (1/(1+days)).toFixed(3);
          } else { // smart
            const urgency = t.due_date ? Math.max(0, 1 - (Math.ceil((new Date(t.due_date) - new Date())/86400000)/30)) : 0;
            const imp = (t.importance||0)/10; const effort = 1 - Math.min((t.estimated_hours||20)/20,1);
            t.score = (0.4*urgency + 0.35*imp + 0.15*effort).toFixed(3);
          }
        });
        // return sorted by score desc (no dependency resolution in mock)
        return copy.sort((a,b)=>Number(b.score)-Number(a.score));
      }

      // highlight & pulse analyzeType when Smart Balance is selected
     // ===== Find Today's Task: fetch & render recommendations =====
(function attachFindToday() {
  const sel = s => document.querySelector(s);

  // mount point & button
  const recommendedEl = sel('#recommended');
  const recTitle = sel('#recTitle');
  const findBtn = sel('#findTodayBtn');

  if (!findBtn || !recommendedEl) return; // nothing to do

  // Build header with close X and optional req id
  function makeHeader(reqId) {
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';

    const left = document.createElement('div');
    left.innerHTML = `<strong>Recommended (for Today)</strong>${reqId ? ' • ' + reqId : ''}`;
    left.style.fontSize = '1rem';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'btn btn-sm btn-light';
    closeBtn.style.marginLeft = '8px';

    closeBtn.addEventListener('click', () => {
      // hide recommendations area
      recTitle.style.display = 'none';
      recommendedEl.innerHTML = '';
    });

    header.appendChild(left);
    header.appendChild(closeBtn);
    return header;
  }

  // Render one recommendation card (keeps markup similar to your earlier cards)
  function renderCard(task, index) {
    const card = document.createElement('div');
    card.className = 'reco-card';
    card.style.marginBottom = '10px';

    const score = task.score ?? task.priority_score ?? task.priority ?? '-';
    const title = task.title || task.name || 'Untitled Task';
    const created = task.created_at ? new Date(task.created_at).toLocaleString() : '';

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div style="font-weight:700">${escapeHtml(title)}</div>
          <div class="small-muted">ID: ${task.remote_id ?? task.id ?? '-'} • Est: ${task.estimated_hours ?? '-'}h • Created: ${created}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800; font-size:1.1rem">${score}</div>
          <div class="small-muted">Rank: ${index + 1}</div>
        </div>
      </div>
      <div class="mt-2 small-muted">${escapeHtml(task.remarks || task.explanation || '')}</div>
    `;
    return card;
  }

  // Main fetch + render
  async function fetchAndRender() {
    // show loading
    recTitle.style.display = 'block';
    recommendedEl.innerHTML = '<div class="small-muted">Loading recommendations…</div>';

    try {
      const res = await fetch('http://127.0.0.1:8000/api/tasks/suggest/', { method: 'GET' });
      if (!res.ok) throw new Error('Server returned ' + res.status);

      const json = await res.json();
      // detect recommendations array
      let recs = [];
      if (Array.isArray(json.recommendations)) recs = json.recommendations;
      else if (Array.isArray(json)) recs = json;
      else if (json.results && Array.isArray(json.results)) recs = json.results;
      else if (json.data && Array.isArray(json.data.recommendations)) recs = json.data.recommendations;

      if (!Array.isArray(recs) || recs.length === 0) {
        recommendedEl.innerHTML = '<div class="small-muted">No recommendations returned.</div>';
        return;
      }

      // clear and add header + cards
      recommendedEl.innerHTML = '';
      const header = makeHeader(json.req_id || json.reqId || '');
      recommendedEl.appendChild(header);

      recs.forEach((r, i) => {
        const card = renderCard(r, i);
        recommendedEl.appendChild(card);

        // If local tasks exist and id matches, update local display
        try {
          const local = (typeof tasks !== 'undefined' && Array.isArray(tasks)) ? tasks.find(t => (t.id === r.id || t.id === r.remote_id)) : null;
          if (local) local.score = r.score ?? r.priority_score ?? r.priority;
        } catch (e) { /* ignore if tasks not in scope */ }
      });

      // ensure recTitle visible
      recTitle.style.display = 'block';
      // re-render tasks list if renderTasks exists
      if (typeof renderTasks === 'function') renderTasks();

    } catch (err) {
      recommendedEl.innerHTML = `<div class="text-danger small">${escapeHtml('Request failed')}</div>`;
      console.warn('suggest fetch error', err);
    }
  }

  // attach
  findBtn.addEventListener('click', fetchAndRender);
})();



      // init
      renderTasks();

    })();