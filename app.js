import { createPlayground } from './playground-scene.js';
import { createPlaygroundAudio } from './playground-audio.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const version = new URL(import.meta.url).search;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const audio = createPlaygroundAudio();
const media = matchMedia('(prefers-reduced-motion:reduce)');
const canvas = $('#playground-canvas');
const hoverLabel = $('#hover-label');
let scene;
let projects=[];
let sound=false;
let motion=!media.matches;
let filter='All';
let activeProject;
let priorFocus;
let timers=[];
let announcementTimer;
let readyTimeout;
let hoverProject;
let mouseX=0;
let mouseY=0;
const covers={'21':'engine','22':'sentient','23':'uss','24':'story'};
const modeCopy={drift:['ZERO','GRAVITY','FREE FLOAT / NO RULES','LET IT FLOAT'],gravity:['THINGS','FALL APART','GRAVITY ON / EXPECT A MESS','GRAVITY ON'],orbit:['AROUND','WE GO','ORBIT / ROUND AND ROUND','ORBIT ON'],grid:['UNDER','CONTROL','SORTED / FOR NOW','COLLECTION SORTED']};

function dismissHint(){ $('#first-instruction').classList.add('hidden'); }
function announce(text){clearTimeout(announcementTimer);$('.mode-announcement').textContent=text;$('.mode-announcement').classList.add('visible');announcementTimer=setTimeout(()=>$('.mode-announcement').classList.remove('visible'),1900);}
function setMode(mode){
  if(!scene)return;
  scene.setMode(mode); audio.play('mode'); dismissHint();
  $$('[data-mode]').forEach(button=>{const selected=button.dataset.mode===mode;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  const [first,second,readout,message]=modeCopy[mode];
  $('#mode-word-one').textContent=first;$('#mode-word-two').textContent=second;$('#mode-readout').textContent=readout;announce(message);
}
function shuffle(){if(!scene)return;scene.shuffle();audio.play('shuffle');dismissHint();announce('COLLECTION SHUFFLED');}
$$('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
$('#shuffle-button').addEventListener('click',shuffle);
function setMotion(enabled){
  motion=enabled;
  document.body.classList.toggle('motion-paused',!motion);
  $('#motion-toggle').setAttribute('aria-pressed',String(!motion));
  $('#motion-toggle').setAttribute('aria-label',motion?'Pause motion':'Resume motion');
  $('#motion-toggle').textContent=motion?'Ⅱ':'▷';
  scene?.setMotion(motion && !document.querySelector('dialog[open]'));
}
$('#motion-toggle').addEventListener('click',()=>{setMotion(!motion);announce(motion?'MOTION RESUMED':'MOTION PAUSED / YOU CAN STILL EXPLORE');});
media.addEventListener('change',event=>setMotion(!event.matches));
setMotion(motion);
$('#sound-toggle').addEventListener('click',async()=>{sound=await audio.setEnabled(!sound);$('#sound-toggle').setAttribute('aria-pressed',String(sound));$('.sound-label').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)audio.play('mode');});

function updateHoverPosition(){
  const width=hoverLabel.offsetWidth||200;
  const height=hoverLabel.offsetHeight||90;
  const left=Math.max(12,Math.min(innerWidth-width-16,mouseX+23));
  const top=Math.max(12,Math.min(innerHeight-height-20,mouseY+20));
  hoverLabel.style.transform=`translate(${left}px,${top}px) rotate(-3deg)`;
}
canvas.addEventListener('pointermove',event=>{mouseX=event.clientX;mouseY=event.clientY;if(event.pointerType==='mouse')updateHoverPosition();},{passive:true});
canvas.addEventListener('pointerdown',()=>{dismissHint();document.body.classList.add('dragging');hoverLabel.classList.remove('visible');audio.play('grab');});
function stopDragging(){if(document.body.classList.contains('dragging'))audio.play('release');document.body.classList.remove('dragging');}
addEventListener('pointerup',stopDragging);addEventListener('pointercancel',stopDragging);addEventListener('blur',stopDragging);
canvas.addEventListener('pointerleave',()=>hoverLabel.classList.remove('visible'));
function onHover(project){
  canvas.classList.toggle('hovering',!!project);
  if(project && project.id!==hoverProject?.id)audio.play('hover');
  hoverProject=project;
  if(!project || document.querySelector('dialog[open]') || document.body.classList.contains('dragging')){hoverLabel.classList.remove('visible');return;}
  hoverLabel.querySelector('strong').textContent=project.name;
  $('.hover-num').textContent=`OBJECT ${project.id==='meme-deck'?'MD':project.id} / ${project.category.toUpperCase()}`;
  updateHoverPosition();hoverLabel.classList.add('visible');
}
function closeHover(){hoverLabel.classList.remove('visible');}
function showDialog(dialog){dialog.showModal();scene?.setMotion(false);}

function renderIndex(){
  const query=$('#project-search').value.trim().toLowerCase();
  const matches=projects.filter(project=>(filter==='All'||project.category===filter)&&[project.name,project.description,...project.tags].join(' ').toLowerCase().includes(query));
  $('#project-list').innerHTML=matches.map(project=>`<button class="project-row" data-project="${escapeHTML(project.id)}"><span class="row-id">${project.id==='meme-deck'?'MD':escapeHTML(project.id)}</span><span class="row-name">${escapeHTML(project.name)}</span><span class="row-category">${escapeHTML(project.category)}</span><span class="row-arrow" aria-hidden="true">↗</span></button>`).join('')||'<p class="empty-result">Nothing here. Try a different rabbit hole.</p>';
  $('.results-count').textContent=`${matches.length} ${matches.length===1?'OBJECT':'OBJECTS'} IN THE COLLECTION`;
}
function openIndex(){closeHover();renderIndex();showDialog($('#index-dialog'));audio.play('open');}
$('#index-button').addEventListener('click',openIndex);$('#fallback-index').addEventListener('click',openIndex);
$('.index-close').addEventListener('click',()=>$('#index-dialog').close());
$('#project-search').addEventListener('input',renderIndex);
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  filter=button.dataset.filter;$$('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});renderIndex();audio.play('hover');
}));
$('#about-button').addEventListener('click',()=>{showDialog($('#about-dialog'));closeHover();audio.play('open');});
$('.about-close').addEventListener('click',()=>$('#about-dialog').close());
$('#help-button').addEventListener('click',()=>{showDialog($('#help-dialog'));closeHover();audio.play('open');});
$$('.help-close').forEach(button=>button.addEventListener('click',()=>$('#help-dialog').close()));
$$('dialog').forEach(dialog=>{
  dialog.addEventListener('click',event=>{if(event.target===dialog && event.clientX){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{audio.play('close');scene?.setMotion(motion && !document.querySelector('dialog[open]'));});
});
function clearTimers(){timers.forEach(clearTimeout);timers=[];}
const projectDialog=$('#project-dialog');
function renderProject(project){
  clearTimers();projectDialog.classList.remove('is-running');projectDialog.setAttribute('aria-label',project.name);$('.project-stamp').textContent='CREATIONS E / INSPECT';
  const cover=covers[project.id];
  $('#project-content').innerHTML=`${cover?`<img class="inspector-art" src="assets/work/${cover}.webp${version}" alt="${escapeHTML(project.name)} project artwork">`:''}<div class="inspector-info"><span class="inspector-number" aria-hidden="true">${project.id==='meme-deck'?'MD':escapeHTML(project.id)}</span><span class="inspector-category">${escapeHTML(project.category.toUpperCase())}</span><h2>${escapeHTML(project.name)}</h2><p>${escapeHTML(project.description)}</p><div class="inspector-tags">${project.tags.map(tag=>`<span>${escapeHTML(tag.toUpperCase())}</span>`).join('')}</div>${project.url?`<button class="solid-button" id="launch-button"><span>ENTER THE PROJECT</span><span>↗</span></button><a class="inspector-external" href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer">OPEN IN A SEPARATE TAB ↗</a>`:`<div class="inspector-note">${project.id==='27'?'You’re already playing with this one.':'From my personal collection. A public version isn’t available yet.'}</div>`}</div>`;
  $('#project-content').scrollTop=0;
  $('#launch-button')?.addEventListener('click',()=>launchProject(project));
}
function openProject(project,trigger){
  if(typeof project==='string')project=projects.find(p=>p.id===project);
  if(!project)return;
  activeProject=project;priorFocus=trigger||document.activeElement;
  closeHover();dismissHint();audio.play('open');renderProject(project);
  if(!projectDialog.open)showDialog(projectDialog);
}
function launchProject(project){
  clearTimers();audio.play('open');projectDialog.classList.add('is-running');projectDialog.setAttribute('aria-label',`${project.name} — live experience`);$('.project-stamp').textContent=`NOW OPEN / ${project.name.toUpperCase()}`;
  const parsed=new URL(project.url);if(!['https:','http:'].includes(parsed.protocol))return;
  $('#project-content').innerHTML=`<div class="live-stage"><div class="live-toolbar"><button id="back-to-project">← BACK TO OBJECT</button><span class="stage-name">${escapeHTML(project.name)}</span><a href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer">OPEN IN NEW TAB ↗</a></div><iframe title="${escapeHTML(project.name)} live website" allow="fullscreen; autoplay" referrerpolicy="strict-origin-when-cross-origin"></iframe><p class="live-note">If this experience needs its own tab, <a href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer">open it here ↗</a></p><div class="launch-curtain"><div class="launch-symbol" aria-hidden="true">✳</div><span>OPENING OBJECT ${escapeHTML(project.id)}</span><h3>${escapeHTML(project.name)}</h3><div class="loading-track"><span></span></div><p class="launch-status">Opening the live project…</p></div></div>`;
  const frame=$('.live-stage iframe');const started=performance.now();
  const reveal=()=>timers.push(setTimeout(()=>{const curtain=$('.launch-curtain');curtain?.classList.add('done');curtain?.setAttribute('aria-hidden','true');},Math.max(0,1000-(performance.now()-started))));
  frame.addEventListener('load',reveal,{once:true});frame.src=project.url;
  timers.push(setTimeout(()=>{if($('.launch-status'))$('.launch-status').textContent='Still loading. You can also open the project in a new tab.';},6500));
  timers.push(setTimeout(reveal,12000));
  $('#back-to-project').addEventListener('click',()=>{renderProject(project);$('#launch-button')?.focus();});$('#back-to-project').focus();
}
$('.project-close').addEventListener('click',()=>projectDialog.close());
projectDialog.addEventListener('close',()=>{clearTimers();$('#project-content').innerHTML='';projectDialog.classList.remove('is-running');activeProject=null;if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});});
$('#project-list').addEventListener('click',event=>{const button=event.target.closest('[data-project]');if(button){scene?.focusProject(button.dataset.project);openProject(button.dataset.project,button);}});

document.addEventListener('keydown',event=>{
  if(event.metaKey||event.ctrlKey||event.altKey||event.repeat||['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(document.querySelector('dialog[open]'))return;
  const modes={'1':'drift','2':'gravity','3':'orbit','4':'grid'};
  if(modes[event.key]){event.preventDefault();setMode(modes[event.key]);}
  if(event.key===' '&&!['BUTTON','A'].includes(document.activeElement.tagName)){event.preventDefault();shuffle();}
  if(event.key==='/'){event.preventDefault();openIndex();$('#project-search').focus();}
  if(event.key==='?'){showDialog($('#help-dialog'));closeHover();}
});
function ready(){clearTimeout(readyTimeout);document.body.classList.add('scene-ready');}
function fallback(){ready();$('.canvas-fallback').hidden=false;canvas.hidden=true;}
try{
  const response=await fetch(new URL(`./assets/projects.json${version}`,import.meta.url));
  if(!response.ok)throw new Error('Project collection unavailable');
  ({projects}=await response.json());$$('.project-count').forEach(element=>element.textContent=projects.length);renderIndex();
  readyTimeout=setTimeout(ready,6500);
  scene=createPlayground(canvas,{projects,onHover,onSelect:project=>openProject(project,canvas),onReady:ready,reducedMotion:!motion});
  if(canvas.classList.contains('no-webgl')||canvas.parentElement.classList.contains('scene-fallback'))fallback();
}catch(error){console.error(error);fallback();$('#mode-readout').textContent='OBJECT FIELD UNAVAILABLE';}
