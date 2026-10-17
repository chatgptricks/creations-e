const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};

export function withProgramSplash(content, project, { icon, reducedMotion=false, ready, onDispose }={}) {
  const root=el('div','program-container');
  const splash=el('div','program-splash');splash.setAttribute('role','status');splash.setAttribute('aria-label',`Starting ${project.name}`);
  const card=el('div','program-splash-card');
  const brand=el('div','splash-system','CREATIONS E / PROGRAM LAUNCHER');
  const image=el('img','splash-program-icon');image.src=icon;image.alt='';
  card.append(brand,image,el('h1','',project.name),el('p','splash-category',project.category||'Creative application'));
  const progress=el('div','splash-progress');progress.append(el('i'),el('i'),el('i'));
  const status=el('p','splash-status',project.url?'Connecting to your creative universe…':'Loading this creation…');
  card.append(progress,status,el('small','splash-footer','A little curiosity goes a long way.'));splash.append(card);
  root.append(content,splash);
  let disposed=false,finished=false;
  const began=performance.now();
  const minimum=reducedMotion?0:950;
  let minimumTimer,timeoutTimer;
  const finish=()=>{
    if(disposed||finished)return;finished=true;clearTimeout(timeoutTimer);
    minimumTimer=setTimeout(()=>{if(disposed)return;splash.classList.add('is-complete');splash.setAttribute('aria-hidden','true');setTimeout(()=>splash.remove(),reducedMotion?0:250);},Math.max(0,minimum-(performance.now()-began)));
  };
  if(ready)Promise.resolve(ready).then(finish,finish);else finish();
  timeoutTimer=setTimeout(()=>{status.textContent='This one is taking a moment. Opening the window…';finish();},14000);
  root.dispose=()=>{disposed=true;clearTimeout(minimumTimer);clearTimeout(timeoutTimer);onDispose?.();};
  return root;
}

export function createBrowserView(project,{icon,onDetails=()=>{},reducedMotion=false}={}){
  const browser=el('section','program-browser');browser.setAttribute('aria-label',`${project.name} live website`);
  const toolbar=el('div','program-toolbar');
  const reload=el('button','program-tool','↻');reload.type='button';reload.title='Reload application';reload.setAttribute('aria-label',`Reload ${project.name}`);
  const address=el('div','program-address');const addressIcon=el('img');addressIcon.src=icon;addressIcon.alt='';address.append(addressIcon,el('span','',new URL(project.url).hostname+new URL(project.url).pathname.replace(/\/$/,'')));
  const info=el('button','program-tool program-info','ⓘ');info.type='button';info.title='About this creation';info.setAttribute('aria-label',`About ${project.name}`);info.addEventListener('click',onDetails);
  const external=el('a','program-tool program-external','↗');external.href=project.url;external.target='_blank';external.rel='noopener noreferrer';external.title='Open in a browser tab';external.setAttribute('aria-label',`Open ${project.name} in a browser tab`);
  toolbar.append(reload,address,info,external);
  const frame=el('iframe','program-frame');frame.title=project.name;frame.src=project.url;frame.setAttribute('allow','autoplay; fullscreen; clipboard-write; gamepad; xr-spatial-tracking');frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock allow-orientation-lock allow-presentation');
  const status=el('div','program-status');status.append(el('span','',`Live application · ${new URL(project.url).hostname}`),el('span','','Creations E'));
  browser.append(toolbar,frame,status);
  let readyResolve;const ready=new Promise(resolve=>{readyResolve=resolve;});
  frame.addEventListener('load',()=>readyResolve(),{once:true});frame.addEventListener('error',()=>readyResolve(),{once:true});
  reload.addEventListener('click',()=>{frame.src=project.url;});
  return withProgramSplash(browser,project,{icon,reducedMotion,ready,onDispose:()=>{frame.src='about:blank';frame.remove();}});
}
