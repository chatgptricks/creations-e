import { initScene } from './scene.js';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
let motionOn = !prefersReduced.matches;
try { const saved=localStorage.getItem('e-motion'); if (saved!==null) motionOn=saved==='on' && !prefersReduced.matches; } catch {}
let sculpture;
try { sculpture=initScene($('#sculpture'),{reducedMotion:!motionOn}); } catch { $('#sculpture').classList.add('no-webgl'); }
const setMotion = enabled => {
  motionOn=enabled;
  document.body.classList.toggle('motion-paused',!enabled);
  document.documentElement.classList.toggle('motion-paused',!enabled);
  $('.motion-label').textContent=enabled?'MOTION ON':'MOTION OFF';
  $('.motion-icon').textContent=enabled?'Ⅱ':'▷';
  $('.motion-toggle').setAttribute('aria-pressed',String(!enabled));
  $('.motion-toggle').title=enabled?'Pause motion':'Enable motion';
  $('.motion-toggle').setAttribute('aria-label',enabled?'Pause all motion':'Enable motion');
  sculpture?.setMotion(enabled);
};
setMotion(motionOn);
$('.motion-toggle').addEventListener('click',()=>{
  setMotion(!motionOn);
  try {localStorage.setItem('e-motion',motionOn?'on':'off');} catch {}
});
prefersReduced.addEventListener('change',event=>{if(event.matches) setMotion(false);});
$('#sculpture-pulse').addEventListener('click',()=>{if(motionOn) sculpture?.pulse();else toast('Motion is paused. Use the play button to bring it to life.');});
$('#year').textContent=new Date().getFullYear();

const shipSVG = `<svg class="space-ship" viewBox="0 0 560 370" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="hull" x1="90" y1="80" x2="450" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="#d7dfd3"/><stop offset=".42" stop-color="#849e99"/><stop offset="1" stop-color="#294847"/></linearGradient><linearGradient id="wing" x1="200" y1="50" x2="350" y2="320" gradientUnits="userSpaceOnUse"><stop stop-color="#9fb7b2"/><stop offset="1" stop-color="#243c3e"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7"/></filter></defs><path d="M282 39 322 176 487 256 325 243 280 315 236 243 73 256 240 176Z" fill="url(#wing)" stroke="#c7d9cc" stroke-width="1"/><path d="m282 39 33 148-33 114-34-114Z" fill="url(#hull)" stroke="#d0dacc"/><path d="m249 188 33 113 33-113-33 34Z" fill="#3c5959" stroke="#91a9a3"/><path d="m282 39-2 183M240 176l42 46 40-46M73 256l167-56 42 22 43-22 162 56M236 243l46-21 43 21M107 249l121-28M455 249l-120-28" stroke="#d4e4d1" stroke-opacity=".55"/><path d="m261 153 21-52 20 52-20 35Z" fill="#152e35" stroke="#adc9bf"/><path d="m257 253 6 17M304 253l-6 17" stroke="#ff6939" stroke-width="9"/><path d="m257 253 6 17M304 253l-6 17" stroke="#ff6939" stroke-width="20" filter="url(#glow)"/><circle cx="282" cy="213" r="5" fill="#ff6b3a"/><path d="m101 291 69-11m207 0 69 11M282 7v17M282 334v17" stroke="#a8c0b5" stroke-opacity=".5"/></svg>`;

function visual(project) {
  const label=`<span class="visual-label">${escapeHTML(project.category.toUpperCase())}</span><span class="visual-number">[ ${escapeHTML(project.id==='meme-deck'?'MD':project.id)} / E ]</span>`;
  if(project.id==='21') return `<div class="project-visual visual-engine">${label}<div class="engine-wordmark">engine<span>®</span></div><div class="editor-window"><div class="editor-topbar"><span>engine / Untitled exploration</span><span class="editor-dots">● ● ●</span></div><div class="editor-toolbar"><span>↖</span><span>▧</span><span>T</span><span>○</span><span>◇</span></div><div class="editor-art"><strong>MAKE<br>SOME<br>THING.</strong><img src="assets/engine-art.svg" alt="" loading="lazy"><span class="editor-selection"></span></div><div class="editor-layerbar">DESIGN<br>LAYERS<br>▧ Image<br>T Heading<br>□ Shape<br>+ Add layer</div></div></div>`;
  if(project.id==='22') return `<div class="project-visual visual-sentient"><img class="sentient-image" src="assets/sentient-cover.jpg" alt="Sentient 2.0 — the agency’s sculptural visual identity" loading="lazy"><span class="visual-number">[ 22 / E ]</span></div>`;
  if(project.id==='24') return `<div class="project-visual visual-story">${label}<div class="storybook"><span class="storybook-title">Cuentacuentos</span><div class="storybook-illustration" role="img" aria-label="Original watercolor fox character from Cuentacuentos"></div><span class="storybook-subtitle">UN MUNDO POR DESCUBRIR</span></div><span class="story-spark" aria-hidden="true">✧</span></div>`;
  if(project.id==='23') return `<div class="project-visual visual-space">${label}<div class="space-orbit"></div>${shipSVG}<span class="space-cross">+</span><div class="space-wordmark">USS SENTIENT<span>AN INTERACTIVE SPACE ODYSSEY</span></div></div>`;
  const themes={'Digital products':['#b8c89b','#1d3428','⊞'],'Web experiences':['#b4b4d2','#272439','↗'],'AI & automation':['#c9cd64','#30331d','✳'],'Creative experiments':['#bc5335','#f2dfbd','✶']};
  const [bg,fg,symbol]=themes[project.category]||themes['Web experiences'];
  return `<div class="project-visual visual-generic" style="--cover-bg:${bg};--cover-fg:${fg}">${label}<span class="generic-symbol" aria-hidden="true">${symbol}</span><span class="generic-name">${escapeHTML(project.name)}</span><span class="generic-category">${escapeHTML(project.tags.join(' / '))}</span></div>`;
}

let projects=[];
let category='All';
let search='';
let activeProject;
let dialogTrigger;
const dialog=$('#project-dialog');
function openProject(project, trigger) {
  if(!project) return;
  activeProject=project;
  if(trigger) dialogTrigger=trigger;
  const highlights=project.highlights?.length?`<ul class="dialog-highlights">${project.highlights.map(h=>`<li>${escapeHTML(h)}</li>`).join('')}</ul>`:'';
  const visit=project.url?`<a class="visit-project" href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer">EXPLORE THE LIVE PROJECT <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`:`<p class="project-note">${project.status==='Prototype'?'An exploration from the ongoing creative practice.':'Part of E’s collection of products, systems, and creative work.'}<br>Presented here as a project overview.</p>`;
  $('#dialog-content').innerHTML=`<div class="dialog-layout">${visual(project)}<div class="dialog-copy"><span class="dialog-index">[ ${escapeHTML(project.category.toUpperCase())} / ${escapeHTML(project.status.toUpperCase())} ]</span><h2 id="dialog-title">${escapeHTML(project.name)}</h2><p class="dialog-description">${escapeHTML(project.description.replace(/\.$/,''))}</p><div class="dialog-tags">${project.tags.map(tag=>`<span>${escapeHTML(tag)}</span>`).join('')}</div>${highlights}${visit}<button class="next-project" type="button">NEXT WORLD <span>→</span></button></div></div>`;
  $('.next-project',dialog).addEventListener('click',()=>{
    const index=projects.findIndex(p=>p.id===activeProject.id);
    openProject(projects[(index+1)%projects.length]);
    dialog.scrollTop=0;
    $('.dialog-close').focus();
  });
  if(!dialog.open) {dialog.showModal();document.body.style.overflow='hidden';}
  dialog.scrollTop=0;
}
function closeDialog(){dialog.close();}
$('.dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeDialog();}});
dialog.addEventListener('close',()=>{document.body.style.overflow='';dialogTrigger?.focus({preventScroll:true});});
function renderArchive() {
  const query=search.trim().toLowerCase();
  const filtered=projects.filter(p=>(category==='All'||p.category===category)&&(!query||[p.name,p.description,...p.tags].join(' ').toLowerCase().includes(query)));
  $('#project-list').innerHTML=filtered.length?filtered.map(p=>`<button class="project-row" data-id="${p.id}" aria-label="Explore ${escapeHTML(p.name)}"><span class="row-number">${p.id==='meme-deck'?'MD':p.id.padStart(2,'0')}</span><span class="row-name">${escapeHTML(p.name)}</span><span class="row-category">${escapeHTML(p.category)}</span><span class="row-arrow" aria-hidden="true">↗</span></button>`).join(''):`<div class="empty-results">No worlds found. <button class="reset-search">Try a fresh start ↗</button></div>`;
  $('#archive-result').textContent=`SHOWING ${String(filtered.length).padStart(2,'0')} OF ${projects.length} EXPLORATIONS${query?' · SEARCH: '+search.toUpperCase():''}`;
  $$('.project-row').forEach(button=>button.addEventListener('click',()=>openProject(projects.find(p=>p.id===button.dataset.id),button)));
  $('.reset-search')?.addEventListener('click',()=>{
    search='';category='All';$('#project-search').value='';
    $$('.filters button').forEach(button=>{const active=button.dataset.filter==='All';button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
    renderArchive();$('#project-search').focus();
  });
}
$$('.filters button').forEach(button=>button.addEventListener('click',()=>{
  category=button.dataset.filter;
  $$('.filters button').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);});
  renderArchive();
}));
$('#project-search').addEventListener('input',event=>{search=event.target.value;renderArchive();});
document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
    event.preventDefault();$('#archive').scrollIntoView({behavior:motionOn?'smooth':'auto'});$('#project-search').focus({preventScroll:true});
  }
});
function observeReveals(){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.1});
  $$('.reveal:not(.in-view)').forEach(el=>observer.observe(el));
}
observeReveals();
try {
  const response=await fetch('assets/projects.json');
  if(!response.ok) throw new Error('Project archive could not load');
  projects=(await response.json()).projects;
  $$('.project-count').forEach(el=>el.textContent=projects.length);
  const ids=['21','22','24','23'];
  $('#featured-projects').innerHTML=ids.map((id,index)=>{
    const p=projects.find(p=>p.id===id);
    return `<button class="project-card reveal" data-id="${p.id}" aria-label="Explore ${escapeHTML(p.name)}">${visual(p)}<div class="project-info"><div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.tags.slice(0,2).join(' / '))}</p></div><span class="project-arrow" aria-hidden="true">↗</span></div></button>`;
  }).join('');
  $$('.project-card').forEach(button=>{
    button.addEventListener('click',()=>openProject(projects.find(p=>p.id===button.dataset.id),button));
    const art=$('.project-visual',button);
    button.addEventListener('pointermove',event=>{
      if(!motionOn||event.pointerType==='touch')return;
      const r=art.getBoundingClientRect();
      const x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;
      art.style.transform=`perspective(1100px) rotateX(${-y*4}deg) rotateY(${x*5}deg)`;
    });
    button.addEventListener('pointerleave',()=>{art.style.transform='';});
  });
  renderArchive();observeReveals();
} catch (error){
  $('#project-list').innerHTML='<p class="empty-results">The archive could not load. Please refresh to try again.</p>';
  console.error(error);
}

const cursor=$('.cursor');
let pointerX=0,pointerY=0;
document.addEventListener('pointermove',event=>{
  pointerX=event.clientX;pointerY=event.clientY;
  cursor.style.left=`${pointerX}px`;cursor.style.top=`${pointerY}px`;
  const overCard=event.target.closest('.project-card');
  cursor.classList.toggle('visible',!!overCard&&!dialog.open&&motionOn&&event.pointerType!=='touch');
});
document.addEventListener('pointerleave',()=>cursor.classList.remove('visible'));
let scrollTick=false;
window.addEventListener('scroll',()=>{
  if(scrollTick)return;
  scrollTick=true;
  requestAnimationFrame(()=>{
    const max=document.documentElement.scrollHeight-innerHeight;
    $('.scroll-progress').style.width=`${max>0?scrollY/max*100:0}%`;
    scrollTick=false;
  });
},{passive:true});
let toastTimer;
function toast(message){$('.toast').textContent=message;$('.toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').classList.remove('show'),3500);}
window.addEventListener('pagehide',event=>{if(!event.persisted) sculpture?.dispose();});
