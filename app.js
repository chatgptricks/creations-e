import { createEtherScene } from './ether-scene.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const assetVersion = new URL(import.meta.url).search;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reducedMotion.matches;
let scene;
let projects = [];
let activeFilter = 'All';
let currentProject;
let projectTrigger;
let launchTimers = [];
const featured = [
  {id:'21', image:'engine.webp', line:'A canvas for making what comes next.', kind:'A TOOL FOR CREATORS'},
  {id:'22', image:'sentient.webp', line:'An identity that moves, reacts, and comes alive.', kind:'A LIVING IDENTITY'},
  {id:'23', image:'uss.webp', line:'Seven departments. One ship. A world to explore.', kind:'ANOTHER DIMENSION'},
  {id:'24', image:'story.webp', line:'A little storybook with an entire world inside.', kind:'A LITTLE BIT OF MAGIC'},
];
const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); reveals.unobserve(entry.target); }
}), {threshold:.1});
function observeReveals() { $$('.reveal:not(.visible)').forEach(el => reveals.observe(el)); }
observeReveals();

scene = createEtherScene($('#ether'), {reducedMotion:!motion,onReady:()=>document.body.classList.add('scene-ready')});
let scrollQueued = false;
function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    const scroll = window.scrollY;
    const height = document.documentElement.scrollHeight - innerHeight;
    $('.reading-progress').style.transform = `scaleX(${height ? scroll / height : 0})`;
    if (motion) scene.setScroll(Math.min(1, scroll / $('.hero').offsetHeight));
    if (motion) $('.manifesto-star').style.setProperty('--star-turn', `${scroll * .07}deg`);
    scrollQueued = false;
  });
}
addEventListener('scroll', onScroll, {passive:true});
addEventListener('resize', onScroll, {passive:true});
onScroll();

const pointer = $('.pointer');
addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  if (motion) scene.setPointer((event.clientX / innerWidth) * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
  pointer.style.transform = `translate(${event.clientX - 44}px,${event.clientY - 44}px)`;
}, {passive:true});
document.addEventListener('pointerover', event => {
  const card = event.target.closest('.project-image');
  pointer.classList.toggle('active', !!card && motion);
});
document.addEventListener('pointerleave', () => pointer.classList.remove('active'));
function setMotion(enabled) {
  motion = enabled;
  document.body.classList.toggle('motion-paused', !enabled);
  $('.motion-button').setAttribute('aria-pressed', String(!enabled));
  $('.motion-button').setAttribute('aria-label', enabled ? 'Pause animations' : 'Resume animations');
  $('.motion-label').textContent = enabled ? 'Motion on' : 'Motion off';
  document.documentElement.style.scrollBehavior = enabled ? '' : 'auto';
  scene.setMotion(enabled);
  if (!enabled) pointer.classList.remove('active');
}
$('.motion-button').addEventListener('click', () => setMotion(!motion));
reducedMotion.addEventListener('change', e => setMotion(!e.matches));
setMotion(motion);

let bendInterval;
function startBend() {
  if (bendInterval || !motion) return;
  scene.pulse();
  document.body.classList.add('bending');
  bendInterval = setInterval(() => scene.pulse(), 700);
}
function stopBend() {
  clearInterval(bendInterval); bendInterval = null;
  document.body.classList.remove('bending');
}
$('#gravity-control').addEventListener('pointerdown', event => {
  event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startBend();
});
$('#gravity-control').addEventListener('pointerup', stopBend);
$('#gravity-control').addEventListener('pointercancel', stopBend);
$('#gravity-control').addEventListener('lostpointercapture', stopBend);
$('#gravity-control').addEventListener('keydown', event => {
  if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); if (!event.repeat) startBend(); }
});
$('#gravity-control').addEventListener('keyup', stopBend);
$('#gravity-control').addEventListener('blur', stopBend);
addEventListener('blur', stopBend);

let remix = 0;
const palettes = ['#ff753e','#c6e89b','#d7b9fc','#ffcc77'];
const remixCopy = ['Curiosity looks good on you.','Good things happen outside the grid.','Same universe. Different perspective.','A small reminder to keep playing.'];
$('#remix-button').addEventListener('click', () => {
  remix++;
  const playground = $('.playground');
  playground.style.setProperty('--remix-color',palettes[remix % palettes.length]);
  $$('.floating-words span').forEach((word,index) => {
    const x = Math.sin(remix * 2 + index) * (innerWidth < 700 ? 12 : 45);
    const y = Math.cos(remix + index * 2) * 25;
    word.style.transform = `translate(${x}px,${y}px) rotate(${Math.sin(remix + index) * 25}deg)`;
    word.style.color = palettes[(remix + index) % palettes.length];
  });
  $('.orbit-a').style.transform = `rotate(${-32 + remix * 40}deg)`;
  $('.orbit-b').style.transform = `rotate(${55 - remix * 30}deg)`;
  $('.remix-note').textContent = remixCopy[remix % remixCopy.length];
});

function renderFeatured() {
  $('#featured-work').innerHTML = featured.map(item => {
    const project = projects.find(p=>p.id === item.id);
    if (!project) return '';
    return `<button class="project-card reveal" data-project="${project.id}" aria-label="Explore ${escapeHTML(project.name)}"><div class="project-image"><img src="assets/work/${item.image}${assetVersion}" alt="${escapeHTML(project.name)} — project artwork" loading="lazy" width="1600" height="1100"><span class="project-arrow" aria-hidden="true">↗</span></div><div class="project-info"><h3>${escapeHTML(project.name)}</h3><span>${item.kind}</span></div><p>${item.line}</p><div class="card-tags">${project.tags.slice(0,3).map(tag=>`<span>${escapeHTML(tag)}</span>`).join('')}</div></button>`;
  }).join('');
  observeReveals();
  $$('.project-card').forEach(card => {
    card.addEventListener('pointermove',event=>{
      if (!motion || event.pointerType !== 'mouse') return;
      const box = card.getBoundingClientRect();
      card.style.setProperty('--rx', `${-(event.clientY-box.top-box.height/2)/box.height*3}deg`);
      card.style.setProperty('--ry', `${(event.clientX-box.left-box.width/2)/box.width*5}deg`);
    });
    card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');});
  });
}
function renderIndex() {
  const query = $('#project-search').value.toLowerCase().trim();
  const results = projects.filter(p => (activeFilter==='All'||p.category===activeFilter) && [p.name,p.description,...p.tags].join(' ').toLowerCase().includes(query));
  $('#index-list').innerHTML = results.map(p=>`<button class="index-row" data-project="${escapeHTML(p.id)}"><span class="index-num">${escapeHTML(p.id==='meme-deck'?'＋':p.id)}</span><strong>${escapeHTML(p.name)}</strong><span class="index-category">${escapeHTML(p.category)}</span><span class="index-arrow" aria-hidden="true">↗</span></button>`).join('') || '<p class="index-empty">No projects in this corner of the universe. Try another search.</p>';
  $('.results-count').textContent = `${results.length} ${results.length===1?'PROJECT':'PROJECTS'} TO EXPLORE`;
}
function setBodyLock() { document.body.classList.toggle('modal-open', !!document.querySelector('dialog[open]')); }
function openIndex() { $('#index-dialog').showModal(); setBodyLock(); renderIndex(); }
$$('.index-trigger').forEach(button=>button.addEventListener('click',openIndex));
$('.index-close').addEventListener('click',()=>$('#index-dialog').close());
$('#index-dialog').addEventListener('close',setBodyLock);
$('#project-search').addEventListener('input',renderIndex);
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  activeFilter=button.dataset.filter;
  $$('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  renderIndex();
}));

const projectDialog = $('#project-dialog');
function clearLaunch() { launchTimers.forEach(clearTimeout); launchTimers=[]; }
function renderProject(project) {
  clearLaunch();
  const artwork=featured.find(item=>item.id===project.id);
  const hue = Number.parseInt(project.id,10) || 28;
  $('.viewer-label').textContent = 'CREATIONS E / PROJECT EXPLORER';
  $('#project-content').innerHTML = `<div class="project-overview"><div class="project-cover" style="--cover-color:hsl(${(hue*31)%360} 18% 22%)">${artwork?`<img src="assets/work/${artwork.image}${assetVersion}" alt="${escapeHTML(project.name)} project artwork">`:`<div class="cover-orbit"></div><span class="cover-initial">${escapeHTML(project.name.split(' ').map(word=>word[0]).slice(0,2).join(''))}</span>`}</div><div class="project-details"><span class="eyebrow">${escapeHTML(project.category)} / ${escapeHTML(project.id)}</span><h2 id="project-title">${escapeHTML(project.name)}</h2><p class="project-description">${escapeHTML(project.description)}</p><div class="card-tags">${project.tags.map(tag=>`<span>${escapeHTML(tag)}</span>`).join('')}</div>${project.highlights?.length?`<ul class="project-highlights">${project.highlights.map(line=>`<li>${escapeHTML(line)}</li>`).join('')}</ul>`:''}<div class="project-actions">${project.url?`<button class="pill dark launch-project">Launch experience <span>↗</span></button><a class="external-link" href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a>`:`<span class="project-status">${project.id==='27'?'You’re already inside this experiment.':'Part of my creative practice. A public version isn’t available yet.'}</span>`}</div></div></div>`;
  $('#project-content').scrollTop = 0;
  $('.launch-project')?.addEventListener('click',()=>launchProject(project));
}
function openProject(id,trigger) {
  const project=projects.find(p=>p.id===id);
  if (!project) return;
  currentProject=project;
  projectTrigger=trigger;
  renderProject(project);
  if (!projectDialog.open) projectDialog.showModal();
  setBodyLock();
  pointer.classList.remove('active');
}
function launchProject(project) {
  clearLaunch();
  $('.viewer-label').textContent = `NOW EXPLORING / ${project.name.toUpperCase()}`;
  const url = new URL(project.url);
  if (!['https:','http:'].includes(url.protocol)) return;
  $('#project-content').innerHTML=`<div class="app-stage"><div class="stage-toolbar"><button class="back-project">← Project overview</button><span class="stage-url" id="project-title">${escapeHTML(project.name)} / ${escapeHTML(url.hostname)}</span><a href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer">Open in new tab ↗</a></div><iframe title="${escapeHTML(project.name)} live website" allow="fullscreen; autoplay" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="stage-loader"><span class="loader-mark" aria-hidden="true">✳</span><p>ENTERING ANOTHER WORLD</p><h3>${escapeHTML(project.name)}</h3><div class="loading-bar"></div><p class="launch-status">Getting things ready…</p></div><p class="stage-note">Some experiences need their own tab. <a href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer">Open ${escapeHTML(project.name)} ↗</a></p></div>`;
  const frame=$('.app-stage iframe');
  const start=performance.now();
  const reveal=()=>{
    launchTimers.push(setTimeout(()=>$('.stage-loader')?.classList.add('done'),Math.max(0,1100-(performance.now()-start))));
  };
  frame.addEventListener('load',reveal,{once:true});
  frame.src=project.url;
  launchTimers.push(setTimeout(()=>{const status=$('.launch-status');if(status)status.textContent='Still loading — you can also open the experience in a new tab.';},6500));
  launchTimers.push(setTimeout(reveal,12000));
  $('.back-project').addEventListener('click',()=>{renderProject(project);$('.launch-project')?.focus();});
  $('.back-project').focus();
}
$('.dialog-close').addEventListener('click',()=>projectDialog.close());
projectDialog.addEventListener('close',()=>{
  clearLaunch(); $('#project-content').innerHTML=''; setBodyLock(); currentProject=null;
  if(projectTrigger?.isConnected) projectTrigger.focus({preventScroll:true});
});
projectDialog.addEventListener('click',event=>{if(event.target===projectDialog)projectDialog.close();});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-project]');
  if(button)openProject(button.dataset.project,button);
});
document.addEventListener('keydown',event=>{
  if(event.key==='/' && !event.metaKey && !event.ctrlKey && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !projectDialog.open){event.preventDefault();if(!$('#index-dialog').open)openIndex();$('#project-search').focus();}
});
$('#year').textContent=new Date().getFullYear();
try {
  const response=await fetch(new URL(`./assets/projects.json${assetVersion}`,import.meta.url));
  if(!response.ok)throw new Error('Project catalog unavailable');
  ({projects}=await response.json());
  $$('.project-count').forEach(el=>el.textContent=projects.length);
  renderFeatured();renderIndex();
} catch(error) {
  $('#featured-work').innerHTML='<p>The project collection couldn’t load. <a href="https://github.com/chatgptricks" target="_blank" rel="noopener noreferrer">Explore my work on GitHub ↗</a></p>';
  $('#index-list').innerHTML='<p class="index-empty">The collection is temporarily unavailable. Please refresh to try again.</p>';
  console.error(error);
}
