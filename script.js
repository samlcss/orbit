const $=s=>document.querySelector(s);
const ov=$('#ov'),cntEl=$('#cnt'),prog=$('#prog'),skipB=$('#skip'),spdB=$('#spd'),hudEl=$('#hud'),gate=$('#gate');
const PASTEL=['#9cc4ea','#a9b8f0','#bba9ec','#d9a7d6','#efadbf','#f2c29c','#e6d18e','#a6d8b8','#8fd0d6','#b7c9f2','#c9b3ee','#e8a9c9','#f4b6a8','#ecc98e','#bfdba0','#9fd3c4'];
const N=18,B=8;                 // 18 cursors in all; only the first 8 build the page
const SVG={
  arrow:()=>`<svg width="17" height="17" viewBox="0 0 17 17"><path class="cf" d="M2 2.2c0-.5.5-.8.9-.6l11.6 5.6c.5.2.4.9-.1 1l-4.6 1.2c-.2.1-.4.2-.5.4l-2 4.4c-.2.5-.9.4-1-.1L2 2.2z" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  cross:()=>`<svg class="ctr" width="18" height="18" viewBox="0 0 18 18"><path class="cl" d="M9 1v16M1 9h16" stroke-width="1.6"/><circle class="cd" cx="9" cy="9" r="2.4"/></svg>`,
  beam:()=>`<svg class="ctr" width="12" height="20" viewBox="0 0 12 20"><path class="cl" d="M2 1.5h8M6 1.5v17M2 18.5h8" stroke-width="1.6" fill="none"/><circle class="cd" cx="6" cy="10" r="1.8"/></svg>`,
  move:()=>`<svg class="ctr" width="20" height="20" viewBox="0 0 20 20"><path class="cf" d="M10 1l3 3h-2v5h5V7l3 3-3 3v-2h-5v5h2l-3 3-3-3h2v-5H4v2l-3-3 3-3v2h5V4H7z" stroke-width=".9"/></svg>`
};

const cur=[];
for(let k=0;k<N;k++){const d=document.createElement('div');d.className='cur';ov.appendChild(d);cur.push({el:d,c:'#fff',x:0,y:0,m:''});}
function setM(k,m,force){const a=cur[k];if(a.m===m&&!force)return;a.m=m;a.el.innerHTML=SVG[m]();}
function mv(k,x,y,ms,deg,ease){const a=cur[k];a.x=x;a.y=y;a.el.style.transition=`transform ${ms}ms ${ease||'cubic-bezier(.45,0,.2,1)'},opacity .4s`;a.el.style.transform=`translate(${x}px,${y}px)`+(deg!=null?` rotate(${deg}deg)`:'');}
function rip(x,y){const r=document.createElement('div');r.className='rip';r.style.left=x+'px';r.style.top=y+'px';ov.appendChild(r);setTimeout(()=>r.remove(),520);}

/* tema */
function paint(){const l=document.body.classList.contains('light');
  cur.forEach((a,k)=>{a.el.style.setProperty('--cc',l?PASTEL[k%PASTEL.length]:'var(--acc)');a.el.style.setProperty('--cs',l?'rgba(17,17,17,.7)':'#000');
    a.el.style.setProperty('--cdel',(k*45)+'ms');if(!a.m)setM(k,'arrow');});
  const t=$('#tg');t.dataset.full=l?'◐ dark':'◐ light';if(t.classList.contains('on'))setT(t,t.dataset.full.length);}
function setTheme(light){document.body.classList.toggle('light',light);paint();}

/* motor de construção */
let run=0,speed=1,state='gate',queue=[],active=new Set(),total=0,done=0,touring=true;
const D=ms=>ms*1.75/speed;
function w(ms){const id=run;return new Promise(r=>setTimeout(r,ms)).then(()=>{if(id!==run)throw 'abort'});}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const GL='!<>-_\\/[]{}=+*^?#01';
const rg=n=>{let o='';for(let i=0;i<n;i++)o+=GL[Math.random()*GL.length|0];return o;};
function setT(e,i,scr){const s=e.dataset.full;const n=scr?Math.min(3,s.length-i):0;
  e.innerHTML=esc(s.slice(0,i))+(n?`<span class="scr">${esc(rg(n))}</span>`:'')+(i+n<s.length?`<span class="gh">${esc(s.slice(i+n))}</span>`:'');}
if(matchMedia('(pointer:coarse)').matches)$('.hint').textContent='☝ tap the screen';
const LS=[...$('#pg').querySelectorAll('.L')];
LS.forEach(e=>{e._p=e.parentElement.closest('.L');if(e.hasAttribute('data-t'))e.dataset.full=e.textContent.trim().replace(/\s+/g,' ');});
const hud=()=>{cntEl.textContent=`${done} / ${total} layers`;prog.style.width=(total?done/total*100:0)+'%';};

function take(){
  let minY=Infinity;for(const e of active)minY=Math.min(minY,e._y);if(queue.length)minY=Math.min(minY,queue[0]._y);
  const lim=minY+innerHeight*1.3;
  for(let i=0;i<queue.length;i++){const e=queue[i];if(e._y>lim)break;
    const P=e._p;
    // a piece can start once its parent is built — or, if the parent is a plain box, already being drawn
    if(P&&!P.classList.contains('on')&&!(active.has(P)&&!P.classList.contains('drag')))continue;
    if(P&&P._moving)continue;
    queue.splice(i,1);return e;}
  return null;
}
function typeIt(e,k,x,y,W,H){
  const s=e.dataset.full,id=run,scr=e.hasAttribute('data-s'),dur=D(Math.min(150+s.length*(scr?50:22),1500));
  const cs=getComputedStyle(e),lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.2,lines=Math.max(1,Math.round(H/lh));
  const a=cur[k];a.el.style.transition='opacity .4s';
  return new Promise((res,rej)=>{const t0=performance.now();(function f(now){
    if(id!==run)return rej('abort');
    const p=Math.min(1,(now-t0)/dur);setT(e,Math.round(p*s.length),scr&&p<1);
    const l=Math.min(lines-1,Math.floor(p*lines)),fr=p*lines-l;
    a.x=x+W*Math.min(1,fr);a.y=y+(l+.5)*lh;a.el.style.transform=`translate(${a.x}px,${a.y}px)`;
    p<1?requestAnimationFrame(f):res();})(t0);});
}
function mkBox(x,y,W,H){const b=document.createElement('div');b.className='sel';b.style.cssText=`left:${x}px;top:${y}px;width:0;height:0`;
  b.innerHTML=`<i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><b>${Math.round(W)} × ${Math.round(H)}</b>`;ov.appendChild(b);return b;}
async function layer(k,e){
  const r=e.getBoundingClientRect(),x=r.left+scrollX,y=r.top+scrollY,W=r.width,H=r.height,a=cur[k];
  /* linha: o agente "risca" da esquerda para a direita */
  if(e.classList.contains('ln')){
    setM(k,'arrow');let t=D(Math.min(220+Math.hypot(a.x-x,a.y-y)*.5,700));mv(k,x,y,t);await w(t);
    setM(k,'cross');t=D(900);e.style.transition=`clip-path ${t}ms cubic-bezier(.5,0,.2,1)`;e.classList.add('on');mv(k,x+W,y,t);await w(t);rip(a.x,a.y);return;
  }
  /* bloco arrastável: nasce fora do lugar e é arrastado até a posição */
  const drag=e.classList.contains('drag');
  const ox=drag?(Math.random()<.5?-1:1)*(50+Math.random()*50):0,oy=drag?18+Math.random()*26:0;
  setM(k,'arrow');const t1=D(Math.min(220+Math.hypot(a.x-x-ox,a.y-y-oy)*.5,700));mv(k,x+ox,y+oy,t1);await w(t1);
  const b=mkBox(x+ox,y+oy,W,H);setM(k,'cross');
  const t2=D(Math.min(Math.max(280,(W+H)*.45),800));
  b.offsetWidth;b.style.transition=`width ${t2}ms cubic-bezier(.3,0,.2,1),height ${t2}ms cubic-bezier(.3,0,.2,1)`;
  b.style.width=W+'px';b.style.height=H+'px';mv(k,x+ox+W,y+oy+H,t2);
  try{
    await w(t2+D(100));
    if(drag){
      e._moving=true;e.style.transform=`translate(${ox}px,${oy}px)`;e.classList.add('on');
      setM(k,'move');const g=D(160);mv(k,x+ox+W/2,y+oy+H/2,g);await w(g);rip(x+ox+W/2,y+oy+H/2);
      const t3=D(650);e.offsetWidth;
      e.style.transition=`transform ${t3}ms cubic-bezier(.5,0,.15,1),background-color .45s,border-color .45s`;e.style.transform='';
      b.style.transition=`left ${t3}ms cubic-bezier(.5,0,.15,1),top ${t3}ms cubic-bezier(.5,0,.15,1)`;b.style.left=x+'px';b.style.top=y+'px';
      mv(k,x+W/2,y+H/2,t3);await w(t3+D(60));e._moving=false;e.style.transition='';
    }else{
      e.classList.add('on');
      if(e.dataset.full!==undefined){setM(k,'beam');await typeIt(e,k,x,y,W,H);}else await w(D(260));
    }
    rip(cur[k].x,cur[k].y);await w(D(140));
  }finally{e._moving=false;b.classList.add('out');setTimeout(()=>b.remove(),400);}
}
async function agent(k){
  while(queue.length||active.size){const e=take();
    if(!e){await idle(k);continue;}
    active.add(e);try{await layer(k,e);}finally{active.delete(e);}done++;hud();}
}
/* agente ocioso: um pequeno voo livre */
/* an agent with nothing to build yet goes to help: it hovers around a piece someone else is working on, or scouts the next one */
async function idle(k){
  const a=cur[k];setM(k,'arrow');
  const pool=[...active];const e=pool.length?pool[Math.random()*pool.length|0]:queue[0];
  let tx=a.x+(Math.random()-.5)*200,ty=a.y+(Math.random()-.5)*120;
  if(e){const r=e.getBoundingClientRect(),side=Math.random()*4|0,u=Math.random(),m=12+Math.random()*22;
    const x0=r.left+scrollX,y0=r.top+scrollY,W=Math.min(r.width,600),H=Math.min(r.height,300);
    tx=side===1?x0+W+m:side===3?x0-m:x0+u*W;ty=side===2?y0+H+m:side===0?y0-m:y0+u*H;}
  const d=Math.hypot(tx-a.x,ty-a.y),t=D(Math.min(950,260+d*.75));
  mv(k,tx,ty,t);await w(t+D(60+Math.random()*160));
}

/* ===== orbit: an invisible ring around the mouse. Each cursor has its own orbit centre that glides after the mouse
   (critically damped, so it eases out and back in with no jerk), then rides the ring clockwise around that centre ===== */
const mouse={x:0,y:0,set:false},fx={burst:null,tight:0,form:null};
const FL={ph:0,t:0};
const AG=cur.map((_,k)=>{const u=((k*5)%N)/(N-1),v=((k*7)%N)/(N-1),w=((k*3)%N)/(N-1);
  return{vx:0,vy:0,cx:null,cy:null,cvx:0,cvy:0,th:k/N*Math.PI*2,R:78+u*22,w:1.15+v*.45,wc:3.2+w*2.2,ph:k*1.7,corr:0};});
const TAU=Math.PI*2,IDEAL=TAU/N;
function anchor(){const h=$('#nm').getBoundingClientRect();return{x:h.left+scrollX+Math.min(h.width*.45,300),y:h.top+scrollY+h.height/2};}
const FOC=[...document.querySelectorAll('#pg a,#pg button')];
function focusAt(cx,cy){let m=1e9;for(const el of FOC){const r=el.getBoundingClientRect();const dx=Math.max(r.left-cx,0,cx-r.right),dy=Math.max(r.top-cy,0,cy-r.bottom);m=Math.min(m,Math.hypot(dx,dy));}return Math.max(0,Math.min(1,1-m/90));}
addEventListener('pointermove',e=>{mouse.x=e.pageX;mouse.y=e.pageY;mouse.set=true;fx.tight=state==='done'?focusAt(e.clientX,e.clientY):0;if(state==='build'&&touring&&e.pointerType==='touch')touring=false;});
/* click on empty space: the cursors leave the orbit and draw the signature star around the click, then fly back */
/* shapes the cursors can draw: sampled evenly along each outline, one point per cursor */
function sample(fn,closed){const M=1600,raw=[];for(let i=0;i<=M;i++)raw.push(fn(i/M));
  const L=[0];for(let i=1;i<raw.length;i++)L.push(L[i-1]+Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]));
  const tot=L[L.length-1],out=[];let j=0;const n=closed?N:N-1;
  for(let k=0;k<N;k++){const want=Math.min(tot,k/n*tot);while(j<L.length-2&&L[j+1]<want)j++;const f=(want-L[j])/(L[j+1]-L[j]||1),p=raw[j],q=raw[j+1];
    out.push({x:p[0]+(q[0]-p[0])*f,y:p[1]+(q[1]-p[1])*f,ang:Math.atan2(q[1]-p[1],q[0]-p[0])});}
  out.closed=closed;out.d='M'+raw.filter((_,i)=>i%8===0).map(v=>v[0].toFixed(3)+' '+v[1].toFixed(3)).join('L')+(closed?'Z':'');
  return out;}
const T=Math.PI*2,sg=(v,e)=>Math.sign(v)*Math.abs(v)**e;
const SHAPES=[
  {name:'star',size:105,pts:sample(u=>{const t=u*T;return[sg(Math.cos(t),3.4),sg(Math.sin(t),3.4)];},true)},
  {name:'heart',size:84,pts:sample(u=>{const t=u*T;return[16*Math.sin(t)**3/16,-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16+.1];},true)},
  {name:'infinity',size:108,pts:sample(u=>{const t=u*T,d=1+Math.sin(t)**2;return[1.3*Math.cos(t)/d,1.3*Math.sin(t)*Math.cos(t)/d];},true)},
  {name:'wave',size:108,pts:sample(u=>{const x=-1.3+u*2.6;return[x,.38*Math.sin(u*T*1.5)];},false)},
  {name:'triangle',size:95,pts:sample(u=>{const V=[[0,-1],[.95,.65],[-.95,.65]],s3=u*3,i=Math.min(2,Math.floor(s3)),f=s3-i,A=V[i],B=V[(i+1)%3];return[A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f];},true)},
  {name:'spiral',size:100,pts:sample(u=>{const t=.4+u*3.2*Math.PI,r=t/(3.6*Math.PI);return[r*Math.cos(t),r*Math.sin(t)];},false)},
];
let shapeI=-1;
addEventListener('pointerdown',e=>{
  if(state!=='done'||e.button>2)return;
  mouse.x=e.pageX;mouse.y=e.pageY;mouse.set=true;
  if(e.target.closest&&e.target.closest('a,button,#hud'))return;
  shapeI=(shapeI+1)%SHAPES.length;const sh=SHAPES[shapeI];
  if(fx.form&&fx.form.fill)fx.form.fill.remove();
  const fl=document.createElementNS('http://www.w3.org/2000/svg','svg'),S=sh.size*1.7;
  fl.setAttribute('viewBox','-1.7 -1.7 3.4 3.4');fl.setAttribute('class','shfill');
  fl.style.cssText=`left:${e.pageX-S}px;top:${e.pageY-S}px;width:${S*2}px;height:${S*2}px`;
  fl.innerHTML=sh.pts.closed?`<path d="${sh.pts.d}" fill="url(#sg)"/>`:`<path d="${sh.pts.d}" fill="none" stroke="url(#sg)" stroke-width=".11" stroke-linecap="round" stroke-linejoin="round"/>`;
  ov.prepend(fl);
  fx.form={x:e.pageX,y:e.pageY,t0:performance.now(),sh,fill:fl};rip(e.pageX,e.pageY);
  const st=$('#star');st.classList.remove('flip');void st.offsetWidth;st.classList.add('flip');
});
let tg=0;
function step(dt,c){
  FL.t+=dt;tg+=(fx.tight-tg)*Math.min(1,dt*5);
  const bu=fx.burst;fx.burst=null;
  // keep the ring even: a cursor with more empty space ahead than behind speeds up, a crowded one slows down
  const ord=AG.map((p,i)=>i).sort((i,j)=>((AG[i].th%TAU)+TAU)%TAU-((AG[j].th%TAU)+TAU)%TAU);
  for(let n=0;n<N;n++){const p=AG[ord[n]],ah=AG[ord[(n+1)%N]],bh=AG[ord[(n-1+N)%N]];
    const t0=((p.th%TAU)+TAU)%TAU,ga=((((ah.th%TAU)+TAU)%TAU-t0)+TAU)%TAU||TAU,gb=((t0-(((bh.th%TAU)+TAU)%TAU))+TAU)%TAU||TAU;
    // natural drift, but only when two get too close do they gently push apart along the ring
    const thr=IDEAL*.6;let c=0;
    if(ga<thr)c-=(thr-ga)/thr*.9;      // crowding the one ahead: ease off
    if(gb<thr)c+=(thr-gb)/thr*.9;      // being crowded from behind: step up
    c+=Math.max(-.25,Math.min(.35,(ga-gb)/IDEAL*.18));   // a faint pull toward open space, so big holes slowly close
    p.corr+=(c-p.corr)*.12;}
  for(let k=0;k<N;k++){const a=cur[k],p=AG[k];
    if(p.cx===null){p.cx=a.x;p.cy=a.y;}
    // 1) orbit centre glides after the mouse (critically damped spring)
    const wc=p.wc;p.cvx+=((c.x-p.cx)*wc*wc-2*wc*p.cvx)*dt;p.cvy+=((c.y-p.cy)*wc*wc-2*wc*p.cvy)*dt;
    p.cx+=p.cvx*dt;p.cy+=p.cvy*dt;
    // 2) point on the ring, clockwise, each at its own rhythm
    p.th+=p.w*Math.max(.6,Math.min(1.7,1+.12*Math.sin(FL.t*.6+p.ph)+p.corr))*(1+tg*.3)*dt;
    const R=p.R*(1-tg*.18);let tx=p.cx+Math.cos(p.th)*R,ty=p.cy+Math.sin(p.th)*R,fa=null;
    if(fx.form&&k===0&&fx.form.fill){const el=(performance.now()-fx.form.t0)/1000,D0=2.1,f=fx.form.fill;
      const g=Math.min(1,el/.35),ease=1-Math.pow(1-g,3),rot=.14*Math.sin(el*2.2);
      const u=Math.max(0,Math.min(1,(el-.32)/.38)),c1=1.70158,c3=c1+1,pop=u?1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2):0;   // ease-out-back: a little "like" pop
      const out=el<D0-.45?1:Math.max(0,(D0-el)/.45);
      f.style.opacity=(Math.min(1,u*1.6)*out*.92).toFixed(3);
      f.style.transform=`rotate(${rot}rad) scale(${(ease*(1+.05*Math.sin(el*9))*(.55+.45*pop)).toFixed(4)})`;
      if(el>=D0){f.remove();fx.form.fill=null;}}
    if(fx.form){const el=(performance.now()-fx.form.t0)/1000,D0=2.1;
      if(el<D0){const sp=fx.form.sh.pts[k],grow=Math.min(1,el/.35),ease=1-Math.pow(1-grow,3),size=fx.form.sh.size*ease*(1+.05*Math.sin(el*9));
        const rot=.14*Math.sin(el*2.2),cr=Math.cos(rot),sr=Math.sin(rot),px=sp.x*size,py=sp.y*size;
        const fxp=fx.form.x+px*cr-py*sr,fyp=fx.form.y+px*sr+py*cr;
        const hold=el<D0-.35?1:(D0-el)/.35;              // last moment: blend back toward the orbit
        tx=fxp*hold+tx*(1-hold);ty=fyp*hold+ty*(1-hold);if(hold>.5)fa=sp.ang+rot;}
      else if(k===N-1)fx.form=null;}
    // 3) cursor eases onto that point (critically damped: smooth, no overshoot)
    const wp=fx.form?13:9;p.vx+=((tx-a.x)*wp*wp-2*wp*p.vx)*dt;p.vy+=((ty-a.y)*wp*wp-2*wp*p.vy)*dt;
    if(bu){const ex=a.x-bu.x,ey=a.y-bu.y,e=Math.hypot(ex,ey)||1;if(e<320){p.vx+=ex/e*650;p.vy+=ey/e*650;}}
    a.x+=p.vx*dt;a.y+=p.vy*dt;
    const sp=Math.hypot(p.vx,p.vy),tang=fa!==null?fa:p.th+Math.PI/2,mov=Math.atan2(p.vy,p.vx);
    const mix=Math.min(1,sp/400);                                   // slow: follow the orbit tangent; fast: follow motion
    const ang=Math.atan2(Math.sin(tang)*(1-mix)+Math.sin(mov)*mix,Math.cos(tang)*(1-mix)+Math.cos(mov)*mix);
    a.el.style.transform=`translate3d(${a.x}px,${a.y}px,0) rotate(${ang*57.2958+135}deg)`;
  }
}
function fly(target,ms){
  AG.forEach(p=>{p.cx=null;p.cvx=p.cvy=0;});
  const id=run;let last=performance.now();const end=ms?last+ms:Infinity;
  cur.forEach((a,k)=>{setM(k,'arrow');a.el.style.transition='opacity .5s';if(!a.hid)a.el.style.opacity=1;});
  return new Promise((res,rej)=>{(function f(now){
    if(id!==run)return ms?rej('abort'):res();
    const dt=Math.min(.033,(now-last)/1000);last=now;step(dt,target());
    now<end?requestAnimationFrame(f):res();})(last);});
}

/* fluxo principal */
function clear(){alt=false;swapTok++;ov.querySelectorAll('.sel,.rip,.scan,.bigstar,.shfill').forEach(b=>b.remove());
  LS.forEach(e=>{e._tok=(e._tok||0)+1;e.classList.remove('on');e._moving=false;e.style.transform='';e.style.transition='';if(e.dataset.full!==undefined)setT(e,0);});
  document.body.classList.remove('built');}
/* after /init: /init turns into the big signature star, the cursors burst out of it like sparks and go straight to work,
   while the star flies to its home next to the name */
async function intro(o){
  cntEl.textContent='initializing…';
  const big=document.createElement('span');big.className='star bigstar';big.innerHTML=$('#star').innerHTML;
  const S0=Math.min(200,innerWidth*.42);
  big.style.cssText=`left:${o.x-S0/2}px;top:${o.y-S0/2}px;width:${S0}px;height:${S0}px`;ov.appendChild(big);
  big.offsetWidth;big.classList.add('in');const tA=performance.now();
  cur.forEach((a,k)=>{a.m='';setM(k,'arrow');a.x=o.x;a.y=o.y;a.el.style.transition='none';a.el.style.transform=`translate(${o.x}px,${o.y}px)`;a.el.style.opacity=0;});
  await w(500);
  // sparks
  const t1=850;
  cur.forEach((a,k)=>{if(k>=B)return;const an=k/B*T+(Math.random()-.5)*.3,r=S0*.55+Math.random()*S0*.9;
    a.el.style.opacity=1;mv(k,o.x+Math.cos(an)*r,o.y+Math.sin(an)*r*.85,t1,an*57.2958+135,'cubic-bezier(.08,.85,.2,1)');});
  // 2-second count with the star on screen (counted from when it appeared), sparks drifting slowly around it
  await w(t1);
  cur.forEach((a,k)=>{if(k>=B)return;const dx=a.x-o.x,dy=a.y-o.y,l=Math.hypot(dx,dy)||1;mv(k,a.x+dx/l*18,a.y+dy/l*18,2600,Math.atan2(dy,dx)*57.2958+135,'ease-out');});
  await w(Math.max(0,2000-(performance.now()-tA)));
  // gradual fade; the agents start only once it is completely gone
  cntEl.textContent='initializing…';
  big.classList.add('fade');await w(1300);big.remove();
}
/* last touch: the star next to the name is built on its own (selection box, pop, three rings) while the cursors already orbit the mouse */
function starFinale(){
  const st=$('#star'),r=st.getBoundingClientRect(),pad=10,x=r.left+scrollX-pad,y=r.top+scrollY-pad,W=r.width+pad*2,H=r.height+pad*2;
  const b=mkBox(x,y,W,H);
  setTimeout(()=>{b.style.transition='width 420ms cubic-bezier(.3,0,.2,1),height 420ms cubic-bezier(.3,0,.2,1)';b.style.width=W+'px';b.style.height=H+'px';},30);
  setTimeout(()=>{
    if(state!=='done')return b.remove();
    st.classList.add('on','burst');rip(x+W/2,y+H/2);
    const cx=x+W/2,cy=y+H/2;
    cur.forEach((a,k)=>{if(!a.hid)return;const p=AG[k],an=(k-B)/(N-B)*T+Math.random()*.4,v=520+Math.random()*260;
      a.x=cx;a.y=cy;p.cx=cx;p.cy=cy;p.cvx=p.cvy=0;p.vx=Math.cos(an)*v;p.vy=Math.sin(an)*v;
      a.el.style.transform=`translate3d(${cx}px,${cy}px,0)`;a.hid=false;a.el.style.transition='opacity .25s';a.el.style.opacity=1;});
    for(let i=0;i<3;i++){const e=document.createElement('span');e.className='xr';e.style.animationDelay=(i*.18)+'s';st.appendChild(e);setTimeout(()=>e.remove(),1900);}
    b.classList.add('out');setTimeout(()=>b.remove(),400);
    setTimeout(()=>st.classList.remove('burst'),1200);
  },650);
}
async function build(from){
  cur.forEach((a,k)=>{a.hid=k>=B;});
  run++;state='build';touring=true;clear();hudEl.classList.remove('hide','mini');skipB.textContent='skip';
  window.scrollTo(0,0);
  LS.forEach(e=>e._y=e.getBoundingClientRect().top+scrollY);
  queue=[...LS].sort((a,b)=>a._y-b._y).filter(e=>e.id!=='star');active.clear();total=LS.length;done=0;cntEl.textContent='starting agents…';
  const o=from||{x:scrollX+innerWidth/2,y:scrollY+innerHeight/2};
  cur.forEach((a,k)=>{a.x=o.x+(Math.random()-.5)*20;a.y=o.y+(Math.random()-.5)*10;const an=-1.57+(k/N-.5)*1.6;AG[k].vx=Math.cos(an)*520;AG[k].vy=Math.sin(an)*520;});FL.ph=-1.57;
  try{await intro(o);hud();
    await Promise.all(cur.slice(0,B).map((_,k)=>agent(k)));finish(true);}catch(e){}
}
function finish(natural){
  run++;state='done';
  cur.forEach((a,k)=>{a.hid=!!natural&&k>=B;a.el.style.opacity=a.hid?0:1;});   // the rest of the team waits inside the star
  ov.querySelectorAll('.sel,.scan,.bigstar').forEach(b=>b.remove());$('#star').classList.remove('burst');
  LS.forEach(e=>{e._moving=false;e.style.transform='';e.style.transition='';if(natural&&e.id==='star')return;e.classList.add('on');if(e.dataset.full!==undefined)setT(e,e.dataset.full.length);});
  done=total;hud();cntEl.textContent=`✓ ${total} layers`;
  document.body.classList.add('built');skipB.textContent='↻ rebuild';idleCaret();
  const rid=run;setTimeout(()=>{if(run===rid)hudEl.classList.add('mini');},2500);
  fly(()=>mouse.set?mouse:anchor(),0);
  if(natural)starFinale();
}
setInterval(()=>{if(state!=='build'||!touring)return;let y=Infinity;for(const e of active)y=Math.min(y,e._y);
  if(y===Infinity&&queue.length)y=queue[0]._y;if(y===Infinity)return;const t=Math.max(0,y-innerHeight*.35);
  if(Math.abs(t-scrollY)>80)window.scrollTo({top:t,behavior:'smooth'});},700);
addEventListener('wheel',()=>{if(state==='build')touring=false;},{passive:true});
spdB.onclick=()=>{speed=speed===1?2:speed===2?4:1;spdB.textContent=speed+'x';};
skipB.onclick=()=>state==='build'?finish():build();

/* /init */
let initDone=false;
async function typeInit(){const s='/init',el=$('#itx');for(let i=1;i<=s.length;i++){await new Promise(r=>setTimeout(r,110+Math.random()*60));el.textContent=s.slice(0,i);}
  setTimeout(()=>$('#gh2').classList.add('on'),400);}
function enter(){
  if(initDone)return;initDone=true;
  const b=$('#initb');b.classList.add('go');const r=b.getBoundingClientRect();
  const from={x:r.left+scrollX+r.width/2,y:r.top+scrollY+r.height/2};
  setTimeout(()=>{gate.classList.add('off');build(from);},350);
}
$('#initb').onclick=enter;
addEventListener('keydown',e=>{if(!initDone&&(e.key==='Enter'||e.key===' ')){e.preventDefault();enter();}});
gate.addEventListener('click',e=>{if(e.target===gate)enter();});

/* interações do site */
$('#tg').onclick=()=>setTheme(!document.body.classList.contains('light'));
function decode(e,to,ms,caret){                // scramble from whatever is shown into `to`; optional caret rides the frontier
  const tok=(e._tok||0)+1;e._tok=tok;const t0=performance.now();
  return new Promise(res=>{(function f(now){if(e._tok!==tok)return res(false);
    const p=Math.min(1,(now-t0)/ms),i=Math.floor(p*to.length);
    const rest=to.slice(i).split('').map(ch=>ch===' '?' ':GL[Math.random()*GL.length|0]).join('');
    e.innerHTML=esc(to.slice(0,i))+(caret?'<span class="kc"></span>':'')+(rest?`<span class="scr">${esc(rest)}</span>`:'');
    if(p<1)requestAnimationFrame(f);else res(true);})(t0);});}
function idleCaret(){if(state!=='done')return;const e=$('#tg2');const txt=alt?e.dataset.alt:e.dataset.full;e.innerHTML=esc(txt)+'<span class="kc idle"></span>';}
/* hero: hovering (or tapping) swaps the three lines together, like decrypting a second message */
const HERO=[$('#k1'),$('#nm'),$('#tg2')];let alt=false,swapTok=0;
async function swap(on){if(state!=='done'||on===alt)return;alt=on;const my=++swapTok;
  for(let i=0;i<HERO.length;i++){const e=HERO[i],to=on?e.dataset.alt:e.dataset.full;
    const ok=await decode(e,to,[420,700,560][i],true);if(my!==swapTok||state!=='done')return;
    if(ok&&i<HERO.length-1)e.textContent=to;}      // caret leaves this line and moves on to the next
  if(my===swapTok)idleCaret();
  // decryption finished: the star turns, and as it expands back it sends out a pulse, a notice that something changed
  const st=$('#star');st.classList.remove('flip');void st.offsetWidth;st.classList.add('flip');
  setTimeout(()=>{if(my!==swapTok)return;const x=document.createElement('span');x.className='xr ping';st.appendChild(x);setTimeout(()=>x.remove(),1500);},430);}
const heroEl=$('.hero');
heroEl.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')swap(true);});
heroEl.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')swap(false);});
heroEl.addEventListener('click',()=>{if(matchMedia('(pointer:coarse)').matches)swap(!alt);});
$('#star').addEventListener('animationend',ev=>{if(ev.animationName==='flip')ev.target.classList.remove('flip');});
/* links keep their own little re-decode on hover */
document.querySelectorAll('.row [data-s],.top [data-s]').forEach(e=>{const tgt=e.closest('a')||e;
  tgt.addEventListener('pointerenter',()=>{if(state==='done')decode(e,e.dataset.full,Math.min(900,250+e.dataset.full.length*18));});});
/* discord row: copies the username */
async function copyText(t){try{await navigator.clipboard.writeText(t);return true;}catch(_){
  try{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(__){return false;}}}
$('#dc').addEventListener('click',async ev=>{ev.preventDefault();if(state!=='done')return;
  const h=$('#dch'),ok=await copyText('lowx.gg');h.textContent=ok?'copied ✓':'@lowx.gg';h.classList.toggle('ok',ok);
  clearTimeout(h._t);h._t=setTimeout(()=>{h.classList.remove('ok');setT(h,h.dataset.full.length);},1600);});
const SYM=['◴','◷','◶','◵'];
function tick(){const d=new Date(),t=d.toLocaleTimeString('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
  const sec=d.getSeconds();$('#clk').innerHTML=`<b>${SYM[sec%4]}</b>${t.replace(':',sec%2?':':'<span style="opacity:.35">:</span>')}`;}
tick();setInterval(tick,1000);

/* começo */
setTheme(false);
LS.forEach(e=>{if(e.dataset.full!==undefined)setT(e,0);});
typeInit();
