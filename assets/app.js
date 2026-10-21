(function(){
const $=s=>document.querySelector(s), app=$('#app');
const LS={get:(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,1800)}
const getMode=()=>LS.get('sr.mode','learn');
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>dkey(new Date());
// meta for bundled articles: category + CSS cover
const META={'gift-of-magi':{cat:'文学',c:'#7A2E2E',cv:'GIFT<br>OF THE<br>MAGI',by:'O. Henry',short:'The Gift of the Magi'},
 'voyager-1':{cat:'科学',c:'#1F3A5F',cv:'VOYA<br>GER 1',by:'NASA',short:'Voyager 1'},
 'photosynthesis':{cat:'科学',c:'#2F5D3A',cv:'PHOTO<br>SYNTH<br>ESIS',by:'Wikipedia',short:'Photosynthesis'},
 'cot-prompting':{cat:'AI',c:'#B8901C',cv:'CHAIN<br>OF<br>THOUGHT',by:'Wei et al. · arXiv',short:'Chain-of-Thought Prompting'},
 'ai-reading-partner':{cat:'AI',c:'#3D3A6B',cv:'READ<br>ING<br>WITH AI',by:'滑读原创',short:'Reading With a Machine'},
 'custom':{cat:'我的',c:'#555',cv:'MY<br>TEXT',by:'我粘贴的'}};
const meta=a=>META[a.id]||META.custom;
const allArticles=()=>{const c=LS.get('sr.custom',null);return ARTICLES.concat(c?[c]:[])};
const findA=id=>id==='custom'?LS.get('sr.custom',null):ARTICLES.find(x=>x.id===id);
const shortT=a=>meta(a).short||a.title;
function cover(a,w,h,fs){const m=meta(a);return `<div class="cov" style="width:${w}px;height:${h}px;background:${m.c}"><small>滑读 · ${esc(m.cat)}</small><b style="font-size:${fs}px">${a.id==='custom'?esc((a.title||'MY TEXT').slice(0,18)):m.cv}</b><small>${esc(m.by.split(' · ')[0])}</small></div>`}
// progress
const seen=a=>LS.get('sr.seen.'+a.id,[]);
const prog=a=>Math.round(seen(a).length/a.paras.length*100);
function logAdd(field,n){const L=LS.get('sr.log',{}),k=today();L[k]=L[k]||{sec:0,paras:0,peeks:0};L[k][field]+=n;LS.set('sr.log',L)}
function markSeen(a,i){if(!a)return;const s=seen(a);if(s.includes(i))return;s.push(i);LS.set('sr.seen.'+a.id,s);logAdd('paras',1);
  if(getMode()==='learn'){const L=LS.get('sr.learn',{read:0,peek:0});L.read++;LS.set('sr.learn',L)}
  const el=$('#rprog');if(el)el.style.width=prog(a)+'%';const sv=$('#rsub');if(sv)sv.textContent=subLine(a)}
function rate(a){const pk=LS.get('sr.peek.'+a.id,null);if(!pk)return null;return Math.round((a.paras.length-pk.length)/a.paras.length*100)}

let cur=null,focusIdx=0,lastAct=Date.now(),io=null,pend=0;
// reading timer: counts only while an article is open, page visible, and user active in last 2 min
['touchstart','scroll','click','keydown','mousemove'].forEach(e=>addEventListener(e,()=>lastAct=Date.now(),{passive:true}));
setInterval(()=>{if(cur&&document.visibilityState==='visible'&&Date.now()-lastAct<120000){pend++;if(pend>=5){logAdd('sec',pend);pend=0}}},1000);
const flush=()=>{if(pend){logAdd('sec',pend);pend=0}};
addEventListener('visibilitychange',flush);addEventListener('pagehide',flush);

const IC={home:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',lib:'<path d="M4 5h6v15H4zM14 5h6v15h-6z"/>',search:'<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',words:'<path d="M6 4h10l3 3v13H6z"/><path d="M9 10h7M9 14h5"/>',stats:'<path d="M5 20V12M10 20V6M15 20v-9M20 20V9"/>'};
const svg=(n,s=22,c='currentColor')=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${IC[n]}</svg>`;
const SPK='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.8" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11"/></svg>';
function tabs(on){$('#tab').innerHTML=[['home','首页','#/'],['lib','书库','#/lib'],['search','搜索','#/search'],['words','生词本','#/words'],['stats','统计','#/stats']].map(([k,l,h])=>`<a href="${h}" class="${k===on?'on':''}">${svg(k)}${l}</a>`).join('')}

function route(){
  closeSheet();flush();if(io){io.disconnect();io=null}cur=null;
  const h=location.hash.replace(/^#\/?/,'');const [p,id,pi]=h.split('/');
  if(p==='a'){const a=findA(id);if(a){tabs('lib');return renderArticle(a,pi)}}
  if(p==='lib'){tabs('lib');return renderLib()}
  if(p==='search'){tabs('search');return renderSearch()}
  if(p==='words'){tabs('words');return renderWords()}
  if(p==='stats'){tabs('stats');return renderStats()}
  if(p==='paste'){tabs('lib');return renderPaste()}
  tabs('home');renderHome();
}
addEventListener('hashchange',()=>{route();scrollTo(0,0)});

function lastRead(){const l=LS.get('sr.last',null);const a=l&&findA(l);return a||null}
function subLine(a){const p=prog(a),left=a.paras.length-seen(a).length;return p>=100?'已读完 · 可以重读':`${p}% · 剩 ${left} 段`}
function contCard(a,big){
  if(!a){const s=ARTICLES.find(x=>x.id==='ai-reading-partner');return `<div class="cont">${cover(s,big?118:84,big?170:120,big?22:16)}<div class="info"><div class="t">还没开始读</div><div class="a">推荐从 B1 难度的《${esc(shortT(s))}》开始，先读英文，看不懂再左滑偷看中文。</div><div style="margin-top:14px"><a class="btn" href="#/a/${s.id}">开始阅读</a></div></div></div>`}
  const p=prog(a);return `<div class="cont">${cover(a,big?118:84,big?170:120,big?22:16)}<div class="info"><div class="t">${esc(shortT(a))}</div><div class="a">${esc(meta(a).by)} · ${esc(a.level)}</div><div class="p">${subLine(a)}</div><div class="bar" style="margin-bottom:16px"><i style="width:${p}%"></i></div><div><a class="btn" href="#/a/${a.id}">${p>=100?'再读一遍':'继续阅读'}</a></div></div></div>`}
function rows(list){return list.map(a=>{const p=prog(a),r=rate(a);return `<a class="row" href="#/a/${a.id}">${cover(a,52,72,9)}<div style="flex:1;min-width:0"><div class="t">${esc(shortT(a))}</div><div class="s">${esc(a.zhTitle||'')} · ${esc(a.level)} · ${a.paras.length} 段</div><div class="pc">${p}%${p>=100?' · 已读完':''}${r!=null?` · 自主阅读率 ${r}%`:''}</div><div class="bar lt"><i style="width:${p}%"></i></div></div></a>`}).join('')}
let cat='全部';
function libBlock(){const cats=['全部','文学','科学','AI'].concat(LS.get('sr.custom',null)?['我的']:[]);
  const list=allArticles().filter(a=>cat==='全部'||meta(a).cat===cat);
  return `<div class="pills" id="cats">${cats.map(c=>`<button class="pill ${c===cat?'on':''}" data-c="${c}">${c}</button>`).join('')}</div><div id="rows">${rows(list)}</div>
  <a class="row" href="#/paste" style="justify-content:center;color:var(--o);font-weight:600;border:0">＋ 粘贴我的英文文章</a>`}
function bindCats(re){app.querySelectorAll('#cats .pill').forEach(b=>b.onclick=()=>{cat=b.dataset.c;re()})}
function renderHome(){
  app.innerHTML=`<div class="dark"><div class="hrow"><div class="htitle">滑读 <span class="serif">Books</span></div><a href="#/search" aria-label="搜索">${svg('search',24,'#fff')}</a><div class="ava">悦</div></div>
  <div class="lbl">${lastRead()?'继续阅读':'开始阅读'}</div>${contCard(lastRead(),1)}</div>
  <div class="sheetw"><h2>文章库</h2>${libBlock()}</div>`;bindCats(renderHome)}
function renderLib(){app.innerHTML=`<div class="dark" style="padding-bottom:44px"><div class="htitle">书库 <span class="serif">Library</span></div><div style="font-size:13px;color:#aaa;margin-top:4px">${allArticles().length} 篇 · 每篇都标了出处和协议</div></div><div class="sheetw">${libBlock()}</div>`;bindCats(renderLib)}

// ---------- reading
function wrapWords(t){return esc(t).replace(/[A-Za-z][A-Za-z'’-]*/g,m=>`<span class="w">${m}</span>`)}
function renderArticle(a,startIdx){
  cur=a;focusIdx=0;const mode=getMode();LS.set('sr.last',a.id);
  app.innerHTML=`<div class="dark rhead" style="padding-bottom:44px"><div class="hrow" style="gap:10px"><a class="back" href="#/">‹</a><div style="flex:1;min-width:0"><div class="t">${esc(shortT(a))}</div><div class="s">${esc(meta(a).by)} · ${esc(a.level)} · <span id="rsub">${subLine(a)}</span></div></div></div>
  <div class="bar" style="margin-top:12px"><i id="rprog" style="width:${prog(a)}%"></i></div></div>
  <div class="sheetw gray"><div class="mbar"><button class="pill ${mode==='learn'?'on':''}" data-m="learn">学英语</button><button class="pill ${mode==='fast'?'on':''}" data-m="fast">速读</button></div>
  <div class="stat" id="stats"></div>
  <p class="hint">${mode==='learn'?'← 左滑看中文 · 右滑回英文 → · 点单词查释义':'速读模式：已显示全部中文，右滑可切回英文'}</p>
  <div id="cards">${a.paras.map((p,i)=>`<div class="card" data-i="${i}"><div class="inner"><div class="face en">${wrapWords(p[0])}<span class="no">${i+1}/${a.paras.length}</span></div><div class="face zh"><div class="zt">● 中文 · 右滑回英文 →</div><div class="zx">${p[1]?esc(p[1]):'<span style="color:#888">（滑动后自动翻译）</span>'}</div><span class="no">${i+1}/${a.paras.length}</span></div></div></div>`).join('')}</div>
  <button class="btn ghost" id="finish" style="width:100%;margin-top:4px">${mode==='learn'?'读完了，看看我的自主阅读率':'返回首页'}</button>
  <div id="done"></div><div class="src">来源与许可：${a.source}</div><div style="height:50px"></div></div>
  <button class="btn fab" id="fab">${mode==='learn'?'全文中文 · 速读':'回到学英语'}</button>`;
  app.querySelectorAll('.mbar .pill').forEach(b=>b.onclick=()=>{LS.set('sr.mode',b.dataset.m);renderArticle(a)});
  $('#fab').onclick=()=>{LS.set('sr.mode',getMode()==='learn'?'fast':'learn');renderArticle(a)};
  const cards=[...app.querySelectorAll('.card')];cards.forEach(bindCard);
  if(mode==='fast')cards.forEach(c=>setFlip(c,true,false));
  else LS.get('sr.peek.'+a.id,[]).forEach(i=>cards[i]&&cards[i].classList.add('peeked'));
  io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>=.6)setTimeout(()=>{if(cur===a&&e.target.isConnected)markSeen(a,+e.target.dataset.i)},1500)}),{threshold:[.6]});
  cards.forEach(c=>io.observe(c));
  $('#finish').onclick=()=>{if(getMode()!=='learn'){location.hash='#/';return}
    if(LS.get('sr.peek.'+a.id,null)===null)LS.set('sr.peek.'+a.id,[]);
    const r=rate(a),pk=LS.get('sr.peek.'+a.id,[]).length;
    $('#done').innerHTML=`<div class="done">自主阅读率<br><b>${r}%</b><br><small>${a.paras.length} 段中，${a.paras.length-pk} 段没偷看中文${r>=80?' · 太棒了':''}</small><br><button class="btn" style="margin-top:12px" id="reset">重新挑战</button></div>`;
    $('#reset').onclick=()=>{localStorage.removeItem('sr.peek.'+a.id);localStorage.removeItem('sr.seen.'+a.id);renderArticle(a)}};
  updStats();
  if(startIdx!=null&&cards[+startIdx])setTimeout(()=>cards[+startIdx].scrollIntoView({block:'center'}),50);
}
function updStats(){if(!cur)return;const el=$('#stats');if(!el)return;
  if(getMode()!=='learn'){el.innerHTML=`速读模式 · 共 ${cur.paras.length} 段 · 不计入自主阅读率`;return}
  const pk=LS.get('sr.peek.'+cur.id,[]);el.innerHTML=`学英语模式 · 偷看 <b>${pk.length}</b> 段 · 自主率 <b>${Math.round((cur.paras.length-pk.length)/cur.paras.length*100)}%</b>`}
async function setFlip(card,on,count=true){
  const i=+card.dataset.i;focusIdx=i;card.classList.toggle('flip',on);
  if(on&&count&&cur)markSeen(cur,i);
  if(on&&count&&getMode()==='learn'&&cur){const k='sr.peek.'+cur.id,pk=LS.get(k,[]);if(!pk.includes(i)){pk.push(i);LS.set(k,pk);logAdd('peeks',1);const L=LS.get('sr.learn',{read:0,peek:0});L.peek++;LS.set('sr.learn',L)}card.classList.add('peeked');updStats()}
  if(on&&cur&&!cur.paras[i][1]){const a=cur,zh=card.querySelector('.zx');zh.textContent='翻译中…';
    try{const t=await translate(a.paras[i][0]);a.paras[i][1]=t;if(a.id==='custom')LS.set('sr.custom',a);zh.textContent=t}
    catch(e){zh.textContent='翻译失败（可能离线或接口限额），稍后再试。'}}
}
function bindCard(card){
  let x0,y0,dir=null;
  card.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;dir=null},{passive:true});
  card.addEventListener('touchmove',e=>{if(dir==='v')return;const t=e.touches[0],dx=t.clientX-x0,dy=t.clientY-y0;
    if(!dir&&(Math.abs(dx)>10||Math.abs(dy)>10))dir=Math.abs(dx)>Math.abs(dy)*1.5?'h':'v';
    if(dir==='h'){e.preventDefault();card.querySelector('.inner').style.transform=`rotateY(${(card.classList.contains('flip')?-180:0)+Math.max(-40,Math.min(40,dx/4))}deg)`}},{passive:false});
  card.addEventListener('touchend',e=>{card.querySelector('.inner').style.transform='';if(dir!=='h')return;
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

// ---------- dictionary
function closeSheet(){const s=$('#sheet');s.hidden=true;document.querySelectorAll('.w.sel').forEach(x=>x.classList.remove('sel'))}
document.addEventListener('click',e=>{const s=$('#sheet');if(!s.hidden&&!s.contains(e.target)&&!e.target.closest('.w'))closeSheet()});
function speak(w){try{if(!('speechSynthesis' in window))return toast('这个浏览器不支持朗读');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(w);u.lang='en-US';u.rate=.9;speechSynthesis.speak(u)}catch(e){toast('朗读失败')}}
async function lookup(el){
  document.querySelectorAll('.w.sel').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');
  const word=el.textContent.replace(/[’']s$/,'').replace(/[’'-]+$/,'').toLowerCase();
  const sent=(el.closest('.face').textContent.match(new RegExp('[^.!?]*\\b'+word.replace(/[-']/g,'.')+'[^.!?]*[.!?]?','i'))||[''])[0].trim();
  const s=$('#sheet');s.hidden=false;s.innerHTML=`<h3>${esc(word)}</h3><p class="ph">查询中…</p>`;
  let phon='',defs=[];
  try{const r=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word));
    if(r.ok){const d=await r.json();phon=(d[0].phonetic||(d[0].phonetics.find(p=>p.text)||{}).text||'');
      d[0].meanings.slice(0,3).forEach(m=>m.definitions.slice(0,2).forEach(x=>defs.push(`<i>${esc(m.partOfSpeech)}</i> ${esc(x.definition)}`)))}
    else throw 0}
  catch(e){try{const r=await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(word));
      if(r.ok){const d=await r.json();(d.en||[]).slice(0,3).forEach(m=>(m.definitions||[]).slice(0,2).forEach(x=>{const t=x.definition.replace(/<[^>]+>/g,'').trim();t&&defs.push(`<i>${esc(m.partOfSpeech)}</i> ${esc(t)}`)}))}
      if(!defs.length)defs=['词典里没找到这个词（可能是专有名词或变形）。']}
    catch(e2){defs=['当前离线，无法查询释义。仍可先加入生词本，联网后再查。']}}
  if(!el.classList.contains('sel'))return;
  const has=LS.get('sr.words',[]).some(x=>x.w===word);
  s.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><h3>${esc(word)}</h3><button class="ib" id="spk" aria-label="朗读">${SPK}</button><span class="ph">${esc(phon)}</span></div><ol style="padding-left:18px;margin:8px 0;font-size:14px">${defs.map(d=>`<li>${d}</li>`).join('')}</ol>
  ${sent?`<p class="ph" style="font-family:var(--serif);font-size:13px">“${esc(sent)}”</p>`:''}
  <div class="rw"><button class="btn" id="addw" ${has?'disabled':''}>${has?'已在生词本':'＋ 加入生词本'}</button><button class="btn ghost" id="closew">关闭</button></div>`;
  $('#spk').onclick=()=>speak(word);$('#closew').onclick=closeSheet;
  $('#addw').onclick=()=>{const ws=LS.get('sr.words',[]);if(!ws.some(x=>x.w===word)){ws.unshift({w:word,p:phon,d:defs[0]?defs[0].replace(/<[^>]+>/g,''):'',s:sent,from:cur?shortT(cur):'',t:Date.now()});LS.set('sr.words',ws)}toast('已加入生词本');$('#addw').textContent='已在生词本';$('#addw').disabled=true};
}

// ---------- glossary
function occurrences(word){const re=new RegExp('\\b'+word.replace(/[^a-z'-]/gi,'').replace(/[-']/g,'.')+'(s|es|ed|d|ing)?\\b','gi');
  return ARTICLES.map(a=>({a,n:a.paras.reduce((s,p)=>s+((p[0].match(re)||[]).length),0)})).filter(x=>x.n).sort((x,y)=>y.n-x.n)}
let wq='',openW=null;
function renderWords(){
  const ws=LS.get('sr.words',[]);
  app.innerHTML=`<div style="padding:calc(18px + env(safe-area-inset-top)) 22px 10px"><div class="htitle">生词本 <span class="serif">Glossary</span></div>
  <div class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg><input id="wq" placeholder="搜索生词" value="${esc(wq)}"><small>共 ${ws.length} 词</small></div><div id="wl"></div></div>`;
  const draw=()=>{const q=wq.trim().toLowerCase(),list=ws.filter(x=>!q||x.w.includes(q)||(x.d||'').toLowerCase().includes(q));
    $('#wl').innerHTML=!ws.length?`<div class="empty"><b>Aa</b>还没有生词。<br>读文章时点一下英文单词，就能加入生词本。</div>`:!list.length?'<div class="empty">没有匹配的生词</div>':list.map(x=>{const op=openW===x.w,oc=op?occurrences(x.w):[];
      return `<div class="wc" data-w="${esc(x.w)}"><div class="hd"><span class="wd">${esc(x.w)}</span><button class="ib spk" aria-label="朗读">${SPK}</button><small style="color:#999">${esc(x.p||'')}</small><span style="flex:1"></span><button class="ib tg" style="color:#999">${op?'⌃':'⌄'}</button></div>
      <div class="df">${esc(x.d||'（暂无释义，联网后在文章里再点一次可查）')}</div>${op?`${x.s?`<div class="ex">“${esc(x.s)}”</div>`:''}<div class="ap">出现在</div>${oc.length?oc.map(o=>`<a class="ai" href="#/a/${o.a.id}">《${esc(shortT(o.a))}》 · <em>${o.n} 次</em></a>`).join(''):`<div class="ai" style="color:#999">内置文章里没有出现${x.from?`（加入自《${esc(x.from)}》）`:''}</div>`}<div style="text-align:right;margin-top:8px"><button class="ib del" style="color:#c33;font-size:12px">删除</button></div>`:''}</div>`}).join('');
    $('#wl').querySelectorAll('.wc').forEach(c=>{const w=c.dataset.w;
      c.querySelector('.spk').onclick=e=>{e.stopPropagation();speak(w)};
      const d=c.querySelector('.del');if(d)d.onclick=e=>{e.stopPropagation();const i=ws.findIndex(x=>x.w===w);ws.splice(i,1);LS.set('sr.words',ws);renderWords()};
      c.onclick=e=>{if(e.target.closest('a'))return;openW=openW===w?null:w;draw()}})};
  $('#wq').oninput=e=>{wq=e.target.value;draw()};draw();
}

// ---------- search
let sq='';
function renderSearch(){
  app.innerHTML=`<div style="padding:calc(18px + env(safe-area-inset-top)) 22px 10px"><div class="htitle">搜索 <span class="serif">Search</span></div>
  <div class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg><input id="sq" placeholder="搜标题或正文，中英文都行" value="${esc(sq)}" autocomplete="off"></div><div id="sl"></div></div>`;
  const draw=()=>{const q=sq.trim();if(!q){$('#sl').innerHTML=`<div class="empty">试试搜 <a style="color:var(--o)" href="javascript:" data-q="Christmas">Christmas</a>、<a style="color:var(--o)" href="javascript:" data-q="reasoning">reasoning</a> 或 <a style="color:var(--o)" href="javascript:" data-q="叶绿素">叶绿素</a></div>`;
      $('#sl').querySelectorAll('[data-q]').forEach(x=>x.onclick=()=>{sq=x.dataset.q;$('#sq').value=sq;draw()});return}
    const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),hl=t=>esc(t).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),m=>`<mark>${m}</mark>`);
    const out=[];allArticles().forEach(a=>{if(re.test(a.title+' '+(a.zhTitle||'')+' '+a.tag))out.push(`<a class="hit" href="#/a/${a.id}"><div class="t">${hl(shortT(a))}</div><div class="s">标题 · ${hl(a.zhTitle||'')} · ${esc(a.level)}</div></a>`);
      a.paras.forEach((p,i)=>{const t=[p[0],p[1]||''].find(x=>re.test(x));if(!t)return;const k=t.search(re),st=Math.max(0,k-40);out.push(`<a class="hit" href="#/a/${a.id}/${i}"><div class="t">${esc(shortT(a))} <small style="color:#999;font-style:normal">· 第 ${i+1} 段</small></div><div class="s">${st?'…':''}${hl(t.slice(st,k+90))}…</div></a>`)})});
    $('#sl').innerHTML=out.length?`<div style="font-size:12px;color:#999;margin-bottom:4px">${out.length} 条结果</div>`+out.join(''):'<div class="empty">没有找到相关内容</div>'};
  $('#sq').oninput=e=>{sq=e.target.value;draw()};draw();
}

// ---------- stats (all real, from localStorage)
let per='7天';
function fmtDur(s){if(s<60)return s+'s';if(s<3600)return Math.round(s/60)+'m';return (s/3600).toFixed(1)+'h'}
function streak(L){const act=k=>L[k]&&(L[k].sec>0||L[k].paras>0);let d=new Date(),n=0;if(!act(dkey(d)))d.setDate(d.getDate()-1);while(act(dkey(d))){n++;d.setDate(d.getDate()-1)}return n}
function renderStats(){flush();
  const L=LS.get('sr.log',{}),keys=Object.keys(L),has=keys.some(k=>L[k].sec>0||L[k].paras>0);
  const head=`<div class="dark" style="padding-bottom:44px"><div class="htitle" style="margin-bottom:16px">统计 <span class="serif">Stats</span></div>${contCard(lastRead(),0)}</div>`;
  if(!has){app.innerHTML=head+`<div class="sheetw"><h2>阅读概览</h2><div class="empty"><b>0</b>还没有阅读记录。<br>打开一篇文章读几段，这里会自动统计阅读时长、连续天数和自主阅读率。<div style="margin-top:16px"><a class="btn" href="#/lib">去书库挑一篇</a></div></div></div>`;return}
  const now=new Date();let buckets=[];
  if(per==='7天'){for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);buckets.push({l:'日一二三四五六'[d.getDay()],ks:[dkey(d)]})}}
  else if(per==='月'){for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);buckets.push({l:(i%7===0)?(d.getMonth()+1)+'/'+d.getDate():'',ks:[dkey(d)]})}}
  else{for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),pre=d.getFullYear()+'-'+pad(d.getMonth()+1);buckets.push({l:(d.getMonth()+1)+'月',ks:keys.filter(k=>k.startsWith(pre))})}}
  const sum=(ks,f)=>ks.reduce((s,k)=>s+((L[k]||{})[f]||0),0);
  buckets.forEach(b=>b.v=sum(b.ks,'sec'));
  const allK=buckets.flatMap(b=>b.ks),sec=sum(allK,'sec'),paras=sum(allK,'paras'),peeks=sum(allK,'peeks');
  const lr=LS.get('sr.learn',{read:0,peek:0}),auto=lr.read?Math.max(0,Math.round((lr.read-lr.peek)/lr.read*100)):null;
  const mx=Math.max(...buckets.map(b=>b.v),1),unit=mx>=5400?'小时':'分钟',dv=v=>unit==='小时'?(v/3600).toFixed(1):Math.round(v/60);
  app.innerHTML=head+`<div class="sheetw"><h2>阅读概览</h2><div class="pills" id="per">${['7天','月','年'].map(p=>`<button class="pill ${p===per?'on':''}">${p}</button>`).join('')}</div>
  <div class="grid" style="margin-top:12px"><div class="sc"><div class="l">阅读时长</div><div class="n">${fmtDur(sec)}</div><div class="x">${per==='7天'?'近 7 天':per==='月'?'近 30 天':'近 12 个月'}</div></div>
  <div class="sc"><div class="l">连续天数</div><div class="n">${streak(L)}d</div><div class="x">累计 ${keys.filter(k=>L[k].sec>0||L[k].paras>0).length} 天读过</div></div>
  <div class="sc"><div class="l">自主阅读率</div><div class="n">${auto==null?'—':auto+'%'}</div><div class="x">${auto==null?'学英语模式下读几段就有':'学英语模式累计 '+lr.read+' 段'}</div></div>
  <div class="sc"><div class="l">已读段落</div><div class="n">${paras}</div><div class="x">偷看中文 ${peeks} 段</div></div></div>
  <div class="chart"><div style="font-size:12px;color:#666;padding-left:4px">每日阅读（${unit}）${per==='年'?' · 按月合计':''}</div><div class="bars">${buckets.map(b=>`<div title="${dv(b.v)} ${unit}"><i class="${b.v?'':'z'}" style="height:${Math.max(2,b.v/mx*84)}px"></i><span>${b.l}</span></div>`).join('')}</div></div>
  <p style="font-size:11px;color:#aaa;text-align:center;margin:14px 0 0">数据只保存在这台设备的浏览器里</p></div>`;
  app.querySelectorAll('#per .pill').forEach(b=>b.onclick=()=>{per=b.textContent;renderStats()});
}

// ---------- translation + paste
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
function renderPaste(){const c=LS.get('sr.ai',{});const old=LS.get('sr.custom',null);
  app.innerHTML=`<div class="dark" style="padding-bottom:44px"><div class="hrow" style="gap:10px"><a class="back" style="font-size:26px" href="#/lib">‹</a><div class="htitle" style="font-size:24px">粘贴文章 <span class="serif">Paste</span></div></div><div style="font-size:13px;color:#aaa;margin-top:6px">粘贴英文，用空行分段。每段变成一张卡片，滑动时才翻译那一段。</div></div>
  <div class="sheetw"><label>标题（可选）</label><input id="pt" placeholder="My article" value="${old?esc(old.title):''}">
  <label>英文正文</label><textarea id="px" placeholder="Paste English text here…&#10;&#10;Separate paragraphs with a blank line.">${old?esc(old.paras.map(p=>p[0]).join('\n\n')):''}</textarea>
  <div style="margin-top:12px"><button class="btn" id="go">生成卡片开始读</button></div>
  <details><summary>翻译设置（可选：用自己的 AI Key 翻译更准）</summary>
  <p style="font-size:13px;color:#888;margin-top:8px">默认使用免费的 MyMemory 翻译（有每日额度）。填了下面三项就改用你的 OpenAI 兼容接口。Key 只保存在本机浏览器 localStorage，不会上传到别处。</p>
  <label>Base URL</label><input id="ab" placeholder="https://api.openai.com/v1" value="${esc(c.base||'')}">
  <label>API Key</label><input id="ak" type="password" placeholder="sk-…" value="${esc(c.key||'')}">
  <label>模型</label><input id="am" placeholder="gpt-4o-mini" value="${esc(c.model||'')}">
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" id="sv">保存</button><button class="btn ghost" id="cl">清除</button></div></details></div>`;
  $('#sv').onclick=()=>{LS.set('sr.ai',{base:$('#ab').value.trim(),key:$('#ak').value.trim(),model:$('#am').value.trim()});toast('已保存在本机')};
  $('#cl').onclick=()=>{localStorage.removeItem('sr.ai');renderPaste();toast('已清除')};
  $('#go').onclick=()=>{const ps=$('#px').value.split(/\n\s*\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
    if(!ps.length)return toast('先粘贴一些英文');
    LS.set('sr.custom',{id:'custom',title:$('#pt').value.trim()||'我粘贴的文章',zhTitle:'自定义文本',level:'自定',tag:'我的文本',source:'用户粘贴的文本，译文由机器翻译生成，仅供参考。',paras:ps.map(p=>[p,null])});
    ['sr.peek.custom','sr.seen.custom'].forEach(k=>localStorage.removeItem(k));location.hash='#/a/custom'};
}
route();
})();
