import { createWindowManager } from './windows.js';
import { createExplorer, createProjectView, iconFor } from './explorer.js';
import { initScene } from './scene.js';
import { createBrowserView, withProgramSplash } from './browser.js';
import { enableDesktopDragging, resetDesktopPositions } from './desktop-drag.js';
const $ = (s, root=document)=>root.querySelector(s);
const $$ = (s, root=document)=>[...root.querySelectorAll(s)];
const safe = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name=>`assets/icons/${name}.svg`;
const readSetting=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const saveSetting=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let motionOn=readSetting('ce-motion','on')==='on'&&!reduced.matches;
let soundOn=readSetting('ce-sound','off')==='on';
let wallpaper=readSetting('ce-wallpaper','dreamcore');
let sorted=false;
let projects=[];
let windowStates=[];
let chromeScene;
let toastTimer;
let desktopDragCleanup;
const manager=createWindowManager({layer:$('#window-layer'),taskList:$('#task-list'),onChange:states=>{windowStates=states;}});

function toast(message){$('.desktop-toast').textContent=message;$('.desktop-toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.desktop-toast').classList.remove('show'),3200);}
let audioContext;
function chime(kind='open'){
  if(!soundOn)return;
  try{
    audioContext??=new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const now=audioContext.currentTime;
    const notes=kind==='startup'?[392,523.25,659.25,783.99]:kind==='close'?[523,392]:[660,880];
    notes.forEach((frequency,i)=>{const osc=audioContext.createOscillator();const gain=audioContext.createGain();osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,now+i*.055);gain.gain.linearRampToValueAtTime(.026,now+i*.055+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.055+.23);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.055);osc.stop(now+i*.055+.25);});
  }catch{}
}
function setMotion(value){motionOn=Boolean(value);document.body.classList.toggle('motion-paused',!motionOn);$('#motion-button').setAttribute('aria-label',motionOn?'Pause animations':'Enable animations');$('#motion-button').title=motionOn?'Pause animations':'Enable animations';$('#motion-button').style.opacity=motionOn?'1':'.55';$('#start-motion-label').textContent=motionOn?'Pause motion':'Enable motion';$$('.settings-motion').forEach(button=>{button.textContent=motionOn?'On':'Off';});chromeScene?.setMotion(motionOn);saveSetting('ce-motion',motionOn?'on':'off');}
function setSound(value){soundOn=Boolean(value);$('.sound-off').hidden=soundOn;$('#sound-button').setAttribute('aria-label',soundOn?'Mute interface sounds':'Enable interface sounds');$('#sound-button').title=soundOn?'Mute interface sounds':'Enable interface sounds';$$('.settings-sound').forEach(button=>{button.textContent=soundOn?'On':'Off';});saveSetting('ce-sound',soundOn?'on':'off');}
function setWallpaper(value){wallpaper=['dreamcore','classic','midnight'].includes(value)?value:'dreamcore';const src=wallpaper==='classic'?'wallpaper-classic.png':'wallpaper-dreamcore.png';document.documentElement.style.setProperty('--wallpaper',wallpaper==='midnight'?'linear-gradient(135deg,#172548,#0c1427)':`url('assets/${src}')`);$('#desktop').dataset.wallpaper=wallpaper;$$('.wallpaper-choice').forEach(button=>{const selected=button.dataset.wallpaper===wallpaper;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});saveSetting('ce-wallpaper',wallpaper);}
setMotion(motionOn);setSound(soundOn);setWallpaper(wallpaper);
reduced.addEventListener('change',event=>{if(event.matches)setMotion(false);});
$('#motion-button').addEventListener('click',()=>{setMotion(!motionOn);toast(motionOn?'Motion is on. Let the ideas move.':'Motion paused. Take your time.');});
$('#sound-button').addEventListener('click',()=>{setSound(!soundOn);if(soundOn)chime('startup');toast(soundOn?'Interface sounds on':'Interface sounds muted');});

function node(markup,className='os-app'){const root=document.createElement('section');root.className=className;root.innerHTML=markup;return root;}
function openProjectInfo(project){
  const content=createProjectView(project);
  const live=$('.ce-live-link',content);
  if(live){live.addEventListener('click',event=>{event.preventDefault();openProject(project);});live.textContent='Open in Creations E ↗';}
  manager.open({id:`details-${project.id}`,title:`About ${project.name}`,icon:iconFor(project),content,width:680,height:570});
}
function openProject(project){
  closeStart();chime();
  const id=`project-${project.id}`;
  if(manager.getWindow(id)){manager.restore(id);return;}
  const image=iconFor(project);
  const content=project.url?createBrowserView(project,{icon:image,reducedMotion:!motionOn,onDetails:()=>openProjectInfo(project)}):withProgramSplash(createProjectView(project),project,{icon:image,reducedMotion:!motionOn});
  manager.open({id,title:project.name,icon:image,content,width:project.url?Math.min(1120,innerWidth-100):740,height:project.url?Math.min(760,innerHeight-100):570,onClose:()=>content.dispose?.()});
}
function openExplorer(type='All',focusSearch=false){
  closeStart();chime();
  const id=type==='All'?'my-creations':`explorer-${type}`;
  let record=manager.getWindow(id);
  if(record){manager.restore(id);}
  else{
    const width=Math.min(910,innerWidth-300);
    const content=createExplorer({projects,onOpen:openProject,initialFilter:type});
    record=manager.open({id,title:type==='All'?'My Creations':type,icon:icon('folder'),content,width:Math.max(650,width),height:Math.min(620,innerHeight-165),x:Math.max(280,innerWidth*.29),y:Math.max(100,innerHeight*.17)});
  }
  if(focusSearch)requestAnimationFrame(()=>$('input[type=search]',record.content)?.focus());
  return record;
}
function openAbout(){closeStart();chime();const content=node(`<div class="about-profile"><img src="${icon('user')}" alt=""><div><h1>Hello, I’m E.</h1><small>Designer · Creator · Professional daydreamer</small></div></div><p>I move between design, technology, and storytelling to make ideas tangible. Sometimes that’s a useful tool. Sometimes it’s an entire world.</p><p>Creations E is my desktop-shaped corner of the internet: a collection of digital products, immersive experiences, and experiments that begin with <i>“what if?”</i></p><div class="about-disciplines"><span>Art direction</span><span>Digital experiences</span><span>Creative development</span><span>World building</span></div><div class="about-stats"><div><b>${projects.length}</b>projects & experiments</div><div><b>${projects.filter(p=>p.url).length}</b>worlds to visit online</div></div><div class="os-footer-actions"><button class="os-button primary" data-action="explorer">Explore My Creations</button><button class="os-button" data-close="about-e">OK</button></div>`);manager.open({id:'about-e',title:'About E',icon:icon('user'),content,width:530,height:550});}
function openInternet(){closeStart();chime();const content=node(`<div class="web-directory-header"><h1>You’ve got places to be.</h1><p>A portal to the projects you can explore online.</p></div>${projects.filter(p=>p.url).map(p=>`<a data-live-project="${p.id}" href="${safe(p.url)}"><img src="${iconFor(p)}" alt=""><span><b>${safe(p.name)}</b><small>${safe(new URL(p.url).hostname)}</small></span><span aria-hidden="true">↗</span><span class="visually-hidden">Opens in a new tab</span></a>`).join('')}`,'os-app web-directory');content.addEventListener('click',event=>{const link=event.target.closest('[data-live-project]');if(link){event.preventDefault();openProject(projects.find(p=>p.id===link.dataset.liveProject));}});manager.open({id:'the-internet',title:'The Internet — Creations E',icon:icon('globe'),content,width:610,height:580});}
function openRecycle(){closeStart();chime();const content=node(`<img src="${icon('recycle')}" alt=""><h1>Nothing to see here. Yet.</h1><p>Even the weird ideas deserve a second chance.</p><p>0 items · A little room for the next “what if?”</p><button class="os-button" data-close="recycle-bin">Close</button>`,'os-app recycle-empty');manager.open({id:'recycle-bin',title:'Recycle Bin',icon:icon('recycle'),content,width:460,height:360});}
function openPlayground(){
  closeStart();chime();if(manager.getWindow('playground')){manager.restore('playground');return;}
  const content=node('<div class="playground-info"><h1>Objects of curiosity.</h1><p>Move your pointer. Catch a reflection.<br>A little experiment in light, metal, and motion.</p></div><canvas aria-label="Interactive chrome sculpture"></canvas><button class="playground-spin">✳ Give it a spin</button>','playground-app');
  const record=manager.open({id:'playground',title:'3D Playground — Objects of curiosity',icon:icon('paint'),content,width:760,height:610,onClose:()=>{chromeScene?.dispose();chromeScene=null;}});
  requestAnimationFrame(()=>{if(!manager.getWindow('playground'))return;chromeScene=initScene($('canvas',record.content),{reducedMotion:!motionOn});$('.playground-spin',content).addEventListener('click',()=>{if(motionOn){chromeScene.pulse();chime();}else toast('Enable motion in the taskbar to spin the sculpture.');});});
}
function openSettings(){
  closeStart();chime();if(manager.getWindow('display-settings')){manager.restore('display-settings');return;}
  const content=node(`<div class="settings-tabs"><span class="settings-tab">Desktop</span></div><div class="display-monitor"><div class="display-preview"></div></div><p>Every good idea deserves a different backdrop.</p><div class="wallpaper-choices"><button class="wallpaper-choice" data-wallpaper="dreamcore" aria-pressed="false"><span style="background-image:url('assets/wallpaper-dreamcore.png')"></span><span>Orange daydream</span></button><button class="wallpaper-choice" data-wallpaper="classic" aria-pressed="false"><span style="background-image:url('assets/wallpaper-classic.png')"></span><span>Classic blue</span></button><button class="wallpaper-choice" data-wallpaper="midnight" aria-pressed="false"><span class="night-swatch"></span><span>After hours</span></button></div><div class="setting-row"><span><b>Motion effects</b><small>Window transitions and playful details</small></span><button class="os-button settings-motion">${motionOn?'On':'Off'}</button></div><div class="setting-row"><span><b>Interface sounds</b><small>A little nostalgia for your ears</small></span><button class="os-button settings-sound">${soundOn?'On':'Off'}</button></div><div class="os-footer-actions"><button class="os-button primary" data-close="display-settings">OK</button></div>`);
  $$('.wallpaper-choice',content).forEach(button=>button.addEventListener('click',()=>{setWallpaper(button.dataset.wallpaper);chime();}));
  $('.settings-motion',content).addEventListener('click',event=>{setMotion(!motionOn);event.currentTarget.textContent=motionOn?'On':'Off';});
  $('.settings-sound',content).addEventListener('click',event=>{setSound(!soundOn);event.currentTarget.textContent=soundOn?'On':'Off';if(soundOn)chime('startup');});
  manager.open({id:'display-settings',title:'Display Properties',icon:icon('settings'),content,width:480,height:590});setWallpaper(wallpaper);
}
function openHelp(){closeStart();chime();const content=node(`<h1>Make yourself at home.</h1><p>This is a portfolio disguised as a tiny operating system. There are a few rabbit holes.</p><div class="help-grid"><div><h2>Open a creation</h2><p>Double-click a desktop icon, or press <kbd>Enter</kbd> on a selected shortcut. On a phone, one tap is enough.</p></div><div><h2>Move things around</h2><p>Drag a window’s blue title bar. Double-click it to maximize. The corner grip resizes it.</p></div><div><h2>Find your way</h2><p>The Start menu opens the whole collection. <kbd>/</kbd> opens project search. <kbd>Esc</kbd> dismisses menus.</p></div><div><h2>A little quiet</h2><p>The star in the taskbar pauses motion. Interface sounds are optional. Display Properties changes the wallpaper.</p></div></div><div class="os-footer-actions"><button class="os-button primary" data-close="help">Got it</button></div>`);manager.open({id:'help',title:'Help and Support',icon:icon('search'),content,width:610,height:410});}
function showDesktop(){closeStart();windowStates.filter(s=>!s.minimized).forEach(s=>manager.minimize(s.id));chime('close');}
function restart(){closeStart();manager.closeAll();sorted=false;resetDesktopPositions();renderDesktop();boot(true);openExplorer();chime('startup');}
const actions={explorer:()=>openExplorer(),about:openAbout,internet:openInternet,playground:openPlayground,settings:openSettings,help:openHelp,recycle:openRecycle,creative:()=>openExplorer('Creative experiments'),products:()=>openExplorer('Digital products'),recent:()=>openSelected(),search:()=>openExplorer('All',true),'show-desktop':showDesktop,motion:()=>{setMotion(!motionOn);closeStart();},restart,programs:()=>{$('#programs-menu').hidden=!$('#programs-menu').hidden;}};
function openSelected(){closeStart();chime();const chosen=['21','22','24','23'].map(id=>projects.find(p=>p.id===id));const content=createExplorer({projects:chosen,onOpen:openProject});manager.open({id:'selected-work',title:'Selected Work',icon:icon('engine'),content,width:800,height:500});}
document.addEventListener('click',event=>{const action=event.target.closest('[data-action]');if(action){actions[action.dataset.action]?.();}const close=event.target.closest('[data-close]');if(close){chime('close');manager.close(close.dataset.close);}});

const specialShortcuts=[{name:'My Creations',image:'folder',action:'explorer'},{name:'About E',image:'user',action:'about'},{name:'The Internet',image:'globe',action:'internet'},{name:'3D Playground',image:'paint',action:'playground'},{name:'Recycle Bin',image:'recycle',action:'recycle'}];
function renderDesktop(){
  desktopDragCleanup?.();
  const favorites=['21','22','24','23','09','06'];
  const ordered=sorted?[...projects].sort((a,b)=>a.name.localeCompare(b.name)):[...projects].sort((a,b)=>{const ai=favorites.indexOf(a.id),bi=favorites.indexOf(b.id);return (ai<0?100:ai)-(bi<0?100:bi);});
  $('#desktop-icons').innerHTML=specialShortcuts.map(item=>`<button class="desktop-icon" data-shortcut="${item.action}" title="${safe(item.name)} — double-click to open" aria-label="Open ${safe(item.name)}"><img src="${icon(item.image)}" alt=""><span>${safe(item.name)}</span></button>`).join('')+ordered.map(p=>`<button class="desktop-icon" data-project="${p.id}" title="${safe(p.name)} — ${safe(p.description)}" aria-label="Open ${safe(p.name)}"><img src="${iconFor(p)}" alt=""><i class="shortcut-arrow" aria-hidden="true">↗</i><span>${safe(p.name)}</span></button>`).join('');
  $$('.desktop-icon').forEach(button=>{
    const open=()=>{if(button.dataset.project)openProject(projects.find(p=>p.id===button.dataset.project));else actions[button.dataset.shortcut]?.();};
    button.addEventListener('click',event=>{$$('.desktop-icon.selected').forEach(el=>el.classList.remove('selected'));button.classList.add('selected');if(innerWidth<700||event.detail===0)open();});
    button.addEventListener('dblclick',()=>{if(innerWidth>=700)open();});
  });
  desktopDragCleanup=enableDesktopDragging($('#desktop-icons'));
}
function closeStart(){$('#start-menu').hidden=true;$('#programs-menu').hidden=true;$('#start-button').setAttribute('aria-expanded','false');}
$('#start-button').addEventListener('click',event=>{const isOpen=!$('#start-menu').hidden;closeStart();if(!isOpen){$('#start-menu').hidden=false;$('#start-button').setAttribute('aria-expanded','true');if(event.detail===0)$('button',$('#start-menu')).focus();chime();}});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#start-menu,#start-button'))closeStart();if(!event.target.closest('#context-menu'))$('#context-menu').hidden=true;if(!event.target.closest('#calendar-popup,#clock'))$('#calendar-popup').hidden=true;if(event.target.classList.contains('desktop')||event.target.classList.contains('desktop-icons'))$$('.desktop-icon.selected').forEach(el=>el.classList.remove('selected'));});
$('#desktop').addEventListener('contextmenu',event=>{
  if(event.target.closest('.xp-window'))return;
  event.preventDefault();closeStart();
  const menu=$('#context-menu');
  const shortcut=event.target.closest('.desktop-icon');
  const project=shortcut?.dataset.project?projects.find(p=>p.id===shortcut.dataset.project):null;
  menu.innerHTML=`${project?`<button role="menuitem" class="context-open"><b>Open ${safe(project.name)}</b></button><hr>`:''}<button role="menuitem" data-action="explorer">Open My Creations</button><button role="menuitem" id="arrange-icons">Arrange Icons by Name</button><button role="menuitem" id="refresh-desktop">Refresh</button><hr><button role="menuitem" data-action="show-desktop">Show Desktop</button><hr><button role="menuitem" data-action="settings">Properties</button>`;
  menu.hidden=false;menu.style.left=`${Math.max(4,Math.min(event.clientX,innerWidth-240))}px`;menu.style.top=`${Math.max(4,Math.min(event.clientY,innerHeight-250))}px`;
  $('.context-open',menu)?.addEventListener('click',()=>{menu.hidden=true;openProject(project);});
  $('#arrange-icons').addEventListener('click',()=>{sorted=true;resetDesktopPositions();renderDesktop();menu.hidden=true;chime();});
  $('#refresh-desktop').addEventListener('click',()=>{renderDesktop();menu.hidden=true;toast('Desktop refreshed. Curiosity intact.');});
  $$('[data-action]',menu).forEach(button=>button.addEventListener('click',()=>{menu.hidden=true;}));
  $('button',menu)?.focus();
});
$('.desktop-tip>button').addEventListener('click',()=>{$('.desktop-tip').hidden=true;saveSetting('ce-tip-dismissed','yes');});
if(readSetting('ce-tip-dismissed','no')==='yes')$('.desktop-tip').hidden=true;
document.addEventListener('keydown',event=>{
  const menu=event.target.closest('#context-menu,#programs-menu,#start-menu');
  if(menu&&['ArrowDown','ArrowUp'].includes(event.key)){
    const buttons=$$('button',menu).filter(button=>button.getClientRects().length);
    const index=buttons.indexOf(document.activeElement);
    event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  }
  if(event.key==='Escape'){const open=!$('#start-menu').hidden;closeStart();$('#context-menu').hidden=true;$('#calendar-popup').hidden=true;if(open)$('#start-button').focus();}
  if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();openExplorer('All',true);}
});
function updateClock(){const now=new Date();$('#clock').textContent=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Costa_Rica'}).format(now);$('#clock').title=new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeZone:'America/Costa_Rica'}).format(now);}
updateClock();setInterval(updateClock,15000);
$('#clock').addEventListener('click',()=>{
  const popup=$('#calendar-popup');if(!popup.hidden){popup.hidden=true;return;}
  const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(({type,value})=>[type,value]));
  const year=Number(dateParts.year),month=Number(dateParts.month),day=Number(dateParts.day);const first=new Date(year,month-1,1).getDay();const days=new Date(year,month,0).getDate();
  popup.innerHTML=`<div class="calendar-heading">${new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(year,month-1,1))}</div><div class="calendar-grid">${['S','M','T','W','T','F','S'].map(d=>`<span class="calendar-day">${d}</span>`).join('')}${Array(first).fill('<span></span>').join('')}${Array.from({length:days},(_,i)=>`<span class="${i+1===day?'today':''}">${i+1}</span>`).join('')}</div><div class="calendar-zone">America / Costa Rica · A good day to make something.</div>`;popup.hidden=false;
});
function boot(force=false){let seen=false;try{seen=sessionStorage.getItem('ce-booted')==='yes';sessionStorage.setItem('ce-booted','yes');}catch{}const screen=$('#boot-screen');screen.classList.remove('is-finished');setTimeout(()=>screen.classList.add('is-finished'),motionOn&&(!seen||force)?750:0);}
boot();
try{
  const response=await fetch('assets/projects.json');if(!response.ok)throw new Error('Could not load projects');
  projects=(await response.json()).projects;
  renderDesktop();
  $('#programs-menu').innerHTML=projects.map(p=>`<button data-program="${p.id}"><img src="${iconFor(p)}" alt=""><span>${safe(p.name)}</span></button>`).join('');
  $$('[data-program]').forEach(button=>button.addEventListener('click',()=>openProject(projects.find(p=>p.id===button.dataset.program))));
  openExplorer();
}catch(error){toast('The project library could not load. Refresh to try again.');console.error(error);}
window.addEventListener('pagehide',event=>{if(!event.persisted)chromeScene?.dispose();});
