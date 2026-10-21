(function(){
const $=s=>document.querySelector(s), app=$('#app');
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,1800)}
const getMode=()=>LS.get('sr.mode','learn');
let cur=null; // current article object
let focusIdx=0;

function route(){
  closeSheet();
  const h=location.hash.replace(/^#\/?/,'');const [p,id]=h.split('/');
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.nav===(p||'home')||(p==='a'&&a.dataset.nav==='home')));
  if(p==='a'){const a=id==='custom'?LS.get('sr.custom',null):ARTICLES.find(x=>x.id===id);return a?renderArticle(a):renderHome()}
  if(p==='paste')return renderPaste();
  if(p==='words')return renderWords();
  renderHome();
}
window.addEventListener('hashchange',()=>{route();scrollTo(0,0)});

function rate(a){const pk=LS.get('sr.peek.'+a.id,null);if(!pk)return null;return Math.round((a.paras.length-pk.length)/a.paras.length*100)}
function renderHome(){
  cur=null;const c=LS.get('sr.custom',null);
  app.innerHTML=`<h1>外文阅读器</h1><p class="sub">先硬读英文，读不懂再<b style="color:var(--red)">左滑</b>偷看中文，右滑回到英文。</p>
  <div class="alist">${ARTICLES.concat(c?[c]:[]).map(a=>{const r=rate(a);return `<a class="aitem" href="#/a/${a.id}"><b>${esc(a.title)}</b><i>${esc(a.zhTitle||'')}</i><div style="margin-top:6px"><span class="lv">${a.level}</span><span class="tg">${esc(a.tag)}</span> <span class="tg">${a.paras.length} 段</span>${r!=null?` <span class="tg" style="color:var(--red)">自主阅读率 ${r}%</span>`:''}</div></a>`}).join('')}</div>`;
}

function wrapWords(t){return esc(t).replace(/[A-Za-z][A-Za-z'’-]*/g,m=>`<span class="w">${m}</span>`)}
function renderArticle(a){
  cur=a;focusIdx=0;const mode=getMode();
  app.innerHTML=`<p class="sub"><a href="#/">← 文章列表</a></p><h1 style="font-family:Georgia,serif">${esc(a.title)}</h1>
  <p class="sub">${esc(a.zhTitle||'')} · <span class="lv">${a.level}</span><span class="tg">${esc(a.tag)}</span></p>
  <div class="modes"><button data-m="learn" class="${mode==='learn'?'on':''}">学英语模式</button><button data-m="fast" class="${mode==='fast'?'on':''}">速读模式</button></div>
  <div class="stats" id="stats"></div>
  <p class="hint">${mode==='learn'?'👈 左滑看中文 · 右滑回英文 👉 · 点单词查释义 · 电脑可用 ← → 键':'速读模式：已显示全部中文，左右滑可切回英文'}</p>
  <div id="cards">${a.paras.map((p,i)=>`<div class="card" data-i="${i}"><div class="inner"><div class="face en">${wrapWords(p[0])}<span class="no">${i+1}/${a.paras.length}</span></div><div class="face zh">${p[1]?esc(p[1]):'<span class="ph" style="color:var(--mute)">（滑动后自动翻译）</span>'}<span class="no">${i+1}/${a.paras.length} · 中文</span></div></div></div>`).join('')}</div>
  <button class="btn ghost" id="finish" style="width:100%">${mode==='learn'?'读完了，看看我的自主阅读率':'返回列表'}</button>
  <div id="done"></div>
  <div class="src">来源与许可：${a.source}</div>`;
  app.querySelectorAll('.modes button').forEach(b=>b.onclick=()=>{LS.set('sr.mode',b.dataset.m);renderArticle(a)});
  const cards=[...app.querySelectorAll('.card')];
  cards.forEach(bindCard);
  if(mode==='fast'){cards.forEach(c=>setFlip(c,true,false))}
  else{(LS.get('sr.peek.'+a.id,[])).forEach(i=>cards[i]&&cards[i].classList.add('peeked'))}
  $('#finish').onclick=()=>{if(getMode()!=='learn'){location.hash='#/';return}
    const r=rate(a)??100;const pk=(LS.get('sr.peek.'+a.id,[])).length;
    if(LS.get('sr.peek.'+a.id,null)===null)LS.set('sr.peek.'+a.id,[]);
    $('#done').innerHTML=`<div class="done">自主阅读率<br><b>${r}%</b><br><small>${a.paras.length} 段中，${a.paras.length-pk} 段没偷看中文${r>=80?' · 太棒了 🎉':''}</small><br><button class="btn" style="margin-top:10px" id="reset">重新挑战</button></div>`;
    $('#reset').onclick=()=>{localStorage.removeItem('sr.peek.'+a.id);renderArticle(a)}};
  updStats();
}
function updStats(){if(!cur)return;const el=$('#stats');if(!el)return;
  if(getMode()!=='learn'){el.innerHTML=`共 ${cur.paras.length} 段 · 速读模式不计入统计`;return}
  const pk=LS.get('sr.peek.'+cur.id,[]);el.innerHTML=`偷看 <b>${pk.length}</b> 段 · 自主阅读率 <b>${Math.round((cur.paras.length-pk.length)/cur.paras.length*100)}%</b>`}

async function setFlip(card,on,count=true){
  const i=+card.dataset.i;focusIdx=i;card.classList.toggle('flip',on);
  if(on&&count&&getMode()==='learn'&&cur){const k='sr.peek.'+cur.id,pk=LS.get(k,[]);if(!pk.includes(i)){pk.push(i);LS.set(k,pk)}card.classList.add('peeked');updStats()}
  if(on&&cur&&!cur.paras[i][1]){const zh=card.querySelector('.face.zh');zh.firstChild.textContent='翻译中…';
    try{const t=await translate(cur.paras[i][0]);cur.paras[i][1]=t;if(cur.id==='custom')LS.set('sr.custom',cur);zh.firstChild.textContent=t}
    catch(e){zh.firstChild.textContent='翻译失败（可能离线或接口限额），稍后再试。';}}
}
function bindCard(card){
  let x0,y0,dir=null,t0;
  card.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;dir=null;t0=Date.now()},{passive:true});
  card.addEventListener('touchmove',e=>{if(dir==='v')return;const t=e.touches[0],dx=t.clientX-x0,dy=t.clientY-y0;
    if(!dir&&(Math.abs(dx)>10||Math.abs(dy)>10))dir=Math.abs(dx)>Math.abs(dy)*1.5?'h':'v';
    if(dir==='h'){e.preventDefault();card.querySelector('.inner').style.transform=`rotateY(${(card.classList.contains('flip')?-180:0)+Math.max(-40,Math.min(40,dx/4))}deg)`}},{passive:false});
  card.addEventListener('touchend',e=>{const inner=card.querySelector('.inner');inner.style.transform='';if(dir!=='h')return;
    const dx=e.changedTouches[0].clientX-x0;card._swiped=Date.now();
    if(dx<-45)setFlip(card,true);else if(dx>45)setFlip(card,false)});
  card.addEventListener('click',e=>{if(card._swiped&&Date.now()-card._swiped<400)return;
    const w=e.target.closest('.w');if(w&&!card.classList.contains('flip')){lookup(w);return}
    setFlip(card,!card.classList.contains('flip'))});
}
document.addEventListener('keydown',e=>{if(!cur||/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
  const cards=[...document.querySelectorAll('.card')];if(!cards.length)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const c=cards[focusIdx]||cards[0];setFlip(c,e.key==='ArrowLeft');c.scrollIntoView({block:'nearest',behavior:'smooth'})}
  if(e.key==='ArrowDown'||e.key==='j'){if(focusIdx<cards.length-1){focusIdx++;e.preventDefault();cards[focusIdx].scrollIntoView({block:'center',behavior:'smooth'})}}
  if(e.key==='ArrowUp'||e.key==='k'){if(focusIdx>0){focusIdx--;e.preventDefault();cards[focusIdx].scrollIntoView({block:'center',behavior:'smooth'})}}
});

// dictionary
function closeSheet(){const s=$('#sheet');s.hidden=true;document.querySelectorAll('.w.sel').forEach(x=>x.classList.remove('sel'))}
document.addEventListener('click',e=>{const s=$('#sheet');if(!s.hidden&&!s.contains(e.target)&&!e.target.closest('.w'))closeSheet()});
async function lookup(el){
  document.querySelectorAll('.w.sel').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');
  const word=el.textContent.replace(/[’']s$/,'').replace(/[’'-]+$/,'').toLowerCase();
  const sent=(el.closest('.face').textContent.match(new RegExp('[^.!?]*\\b'+word.replace(/[-']/g,'.')+'[^.!?]*[.!?]?','i'))||[''])[0].trim();
  const s=$('#sheet');s.hidden=false;s.innerHTML=`<h3>${esc(word)}</h3><p class="ph">查询中…</p>`;
  let phon='',defs=[];
  try{const r=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word));
    if(r.ok){const d=await r.json();phon=(d[0].phonetic||(d[0].phonetics.find(p=>p.text)||{}).text||'');
      d[0].meanings.slice(0,3).forEach(m=>m.definitions.slice(0,2).forEach(x=>defs.push(`<i>${m.partOfSpeech}</i> ${esc(x.definition)}`)))}
    else throw 0}
  catch(e){try{const r=await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(word));
      if(r.ok){const d=await r.json();(d.en||[]).slice(0,3).forEach(m=>(m.definitions||[]).slice(0,2).forEach(x=>{const t=x.definition.replace(/<[^>]+>/g,'').trim();t&&defs.push(`<i>${esc(m.partOfSpeech)}</i> ${esc(t)}`)}))}
      if(!defs.length)defs=['词典里没找到这个词（可能是专有名词或变形）。']}
    catch(e2){defs=['当前离线，无法查询释义。仍可先加入生词本，联网后再查。']}}
  const has=LS.get('sr.words',[]).some(x=>x.w===word);
  s.innerHTML=`<h3>${esc(word)} <span class="ph" style="font-size:15px">${esc(phon)}</span></h3><ol style="padding-left:18px;margin:8px 0">${defs.map(d=>`<li>${d}</li>`).join('')}</ol>
  ${sent?`<p class="ph" style="font-family:Georgia,serif;font-size:13px">“${esc(sent)}”</p>`:''}
  <div class="row"><button class="btn" id="addw" ${has?'disabled':''}>${has?'已在生词本':'＋ 加入生词本'}</button><button class="btn ghost" id="closew">关闭</button></div>`;
  $('#closew').onclick=closeSheet;
  $('#addw').onclick=()=>{const ws=LS.get('sr.words',[]);if(!ws.some(x=>x.w===word)){ws.unshift({w:word,p:phon,d:defs[0]?defs[0].replace(/<[^>]+>/g,''):'',s:sent,from:cur?cur.title:'',t:Date.now()});LS.set('sr.words',ws)}toast('已加入生词本');$('#addw').textContent='已在生词本';$('#addw').disabled=true};
}
function renderWords(){cur=null;const ws=LS.get('sr.words',[]);
  app.innerHTML=`<h1>生词本</h1><p class="sub">共 ${ws.length} 个词 · 只保存在这台设备的浏览器里</p>${ws.length?ws.map((x,i)=>`<div class="wordrow"><div><b>${esc(x.w)}</b> <small style="display:inline">${esc(x.p||'')}</small><small>${esc(x.d||'')}</small>${x.s?`<small style="font-family:Georgia,serif">“${esc(x.s)}”</small>`:''}<small>来自：${esc(x.from||'')}</small></div><button data-i="${i}" title="删除">×</button></div>`).join(''):'<p class="empty">还没有生词。读文章时点一下英文单词，就能加入生词本。</p>'}`;
  app.querySelectorAll('.wordrow button').forEach(b=>b.onclick=()=>{ws.splice(+b.dataset.i,1);LS.set('sr.words',ws);renderWords()});
}

// translation
async function translate(text){
  const cfg=LS.get('sr.ai',{});
  if(cfg.key&&cfg.base&&cfg.model){
    const r=await fetch(cfg.base.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},
      body:JSON.stringify({model:cfg.model,temperature:0.2,messages:[{role:'system',content:'把用户给的英文段落翻译成自然、准确的简体中文。只输出译文。'},{role:'user',content:text}]})});
    if(!r.ok)throw new Error('ai '+r.status);const d=await r.json();return d.choices[0].message.content.trim();
  }
  const parts=[];let buf='';for(const s of text.match(/[^.!?]+[.!?]*\s*/g)||[text]){if((buf+s).length>450&&buf){parts.push(buf);buf=''}buf+=s}if(buf)parts.push(buf);
  const out=[];for(const p of parts){const r=await fetch('https://api.mymemory.translated.net/get?langpair=en|zh-CN&q='+encodeURIComponent(p.slice(0,500)));
    const d=await r.json();if(d.responseStatus!=200&&d.responseStatus!=='200')throw new Error(d.responseDetails);out.push(d.responseData.translatedText)}
  return out.join('');
}
function renderPaste(){cur=null;const c=LS.get('sr.ai',{});const old=LS.get('sr.custom',null);
  app.innerHTML=`<h1>粘贴我的文章</h1><p class="sub">粘贴英文，用空行分段。每段变成一张卡片，滑动时才翻译那一段。</p>
  <label>标题（可选）</label><input id="pt" placeholder="My article" value="${old?esc(old.title):''}">
  <label>英文正文</label><textarea id="px" placeholder="Paste English text here…&#10;&#10;Separate paragraphs with a blank line.">${old?esc(old.paras.map(p=>p[0]).join('\n\n')):''}</textarea>
  <div style="margin-top:12px"><button class="btn" id="go">生成卡片开始读</button></div>
  <details><summary>翻译设置（可选：用自己的 AI Key 翻译更准）</summary>
  <p class="sub" style="margin-top:8px">默认使用免费的 MyMemory 翻译（有每日额度）。填了下面三项就改用你的 OpenAI 兼容接口。Key 只保存在本机浏览器 localStorage，不会上传到别处。</p>
  <label>Base URL</label><input id="ab" placeholder="https://api.openai.com/v1" value="${esc(c.base||'')}">
  <label>API Key</label><input id="ak" type="password" placeholder="sk-…" value="${esc(c.key||'')}">
  <label>模型</label><input id="am" placeholder="gpt-4o-mini" value="${esc(c.model||'')}">
  <div class="row" style="display:flex;gap:8px;margin-top:10px"><button class="btn" id="sv">保存</button><button class="btn ghost" id="cl">清除</button></div></details>`;
  $('#sv').onclick=()=>{LS.set('sr.ai',{base:$('#ab').value.trim(),key:$('#ak').value.trim(),model:$('#am').value.trim()});toast('已保存在本机')};
  $('#cl').onclick=()=>{localStorage.removeItem('sr.ai');renderPaste();toast('已清除')};
  $('#go').onclick=()=>{const ps=$('#px').value.split(/\n\s*\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
    if(!ps.length)return toast('先粘贴一些英文');
    LS.set('sr.custom',{id:'custom',title:$('#pt').value.trim()||'我粘贴的文章',zhTitle:'自定义文本',level:'自定',tag:'我的文本',source:'用户粘贴的文本，译文由机器翻译生成，仅供参考。',paras:ps.map(p=>[p,null])});
    localStorage.removeItem('sr.peek.custom');location.hash='#/a/custom'};
}
route();
})();
