/* JEMMO LIVE · MOTOR VISUAL DE MASCOTA 2.5D · PRUEBA 64 */
(()=>{
  'use strict';
  if(window.JemmoMascotRenderer)return;

  const TAU=Math.PI*2;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rand=(a,b)=>a+Math.random()*(b-a);

  class JemmoMascotRenderer{
    constructor(canvas,options={}){
      if(!(canvas instanceof HTMLCanvasElement))throw new Error('Canvas de mascota no válido');
      this.canvas=canvas;
      this.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
      this.options=options;
      this.width=1;this.height=1;this.dpr=1;
      this.running=false;this.frame=0;this.last=0;this.idleAt=0;
      this.reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
      this.status={level:1,food:100,clean:100,mood:100};
      this.fish={x:.5,y:.48,tx:.63,ty:.45,vx:0,vy:0,dir:1,angle:0,blink:0,blinkAt:performance.now()+rand(1800,4200),tail:0,fin:0,breath:0,action:'idle',actionUntil:0,lookX:0,lookY:0};
      this.bubbles=Array.from({length:24},()=>this.makeBubble(true));
      this.sand=Array.from({length:48},(_,i)=>({x:(i*67)%997/997,y:(i*31)%101/101,r:.55+(i%4)*.34,a:.08+(i%5)*.025}));
      this.sparks=[];this.food=[];this.cleanWave=0;
      this.pointerDown=false;
      this.resizeObserver=new ResizeObserver(()=>this.resize());
      this.resizeObserver.observe(canvas);
      this.bind();this.resize();
    }
    bind(){
      const point=event=>{
        const rect=this.canvas.getBoundingClientRect();
        return{x:clamp((event.clientX-rect.left)/Math.max(1,rect.width),.30,.70),y:clamp((event.clientY-rect.top)/Math.max(1,rect.height),.25,.69)};
      };
      this.canvas.addEventListener('pointerdown',event=>{
        this.pointerDown=true;this.canvas.setPointerCapture?.(event.pointerId);
        const p=point(event);this.setTarget(p.x,p.y,true);this.trigger('touch');this.options.onInteraction?.('touch');
      });
      this.canvas.addEventListener('pointermove',event=>{if(this.pointerDown){const p=point(event);this.setTarget(p.x,p.y,true)}});
      const release=event=>{this.pointerDown=false;this.canvas.releasePointerCapture?.(event.pointerId);this.idleAt=performance.now()+1800};
      this.canvas.addEventListener('pointerup',release);this.canvas.addEventListener('pointercancel',release);
      document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();else if(!this.canvas.closest('[hidden]'))this.start()});
    }
    makeBubble(initial=false){
      return{x:rand(.05,.95),y:initial?rand(0,1):1.08,r:rand(2.5,10),speed:rand(.025,.075),drift:rand(-.02,.02),phase:rand(0,TAU),alpha:rand(.16,.56)};
    }
    resize(){
      const rect=this.canvas.getBoundingClientRect();
      const dpr=Math.min(2,Math.max(1,devicePixelRatio||1));
      const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.width=rect.width;this.height=rect.height;this.dpr=dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0)}
    }
    start(){if(this.running)return;this.running=true;this.last=performance.now();this.frame=requestAnimationFrame(t=>this.loop(t))}
    stop(){this.running=false;cancelAnimationFrame(this.frame)}
    destroy(){this.stop();this.resizeObserver.disconnect()}
    setStatus(status={}){this.status={...this.status,...status}}
    setTarget(x,y,fast=false){
      const f=this.fish;f.tx=clamp(x,.30,.70);f.ty=clamp(y,.25,.69);f.action=fast?'follow':f.action;f.actionUntil=fast?performance.now()+900:f.actionUntil;this.idleAt=performance.now()+2600;
    }
    trigger(type){
      const f=this.fish,now=performance.now();f.action=type;f.actionUntil=now+(type==='gift'?2100:type==='play'?1800:1300);
      if(type==='feed'||type==='gift'){
        const amount=type==='gift'?24:12;
        for(let i=0;i<amount;i++)this.food.push({x:rand(.14,.86),y:rand(-.12,.02),vx:rand(-.02,.02),vy:rand(.025,.06),life:1,size:rand(2.5,5.5),gold:type==='gift'});
      }
      if(type==='clean')this.cleanWave=1;
      const count=type==='gift'?52:type==='play'?28:18;
      for(let i=0;i<count;i++)this.sparks.push({x:f.x,y:f.y,vx:rand(-.18,.18),vy:rand(-.18,.12),life:1,size:rand(1.5,4.8),hue:type==='clean'?185:type==='gift'?44:rand(282,328)});
      if(type==='play'){f.tx=rand(.58,.68);f.ty=rand(.28,.4)}
    }
    loop(time){
      if(!this.running)return;
      const dt=Math.min(.034,Math.max(.001,(time-this.last)/1000));this.last=time;
      this.update(dt,time);this.draw(time);
      this.frame=requestAnimationFrame(t=>this.loop(t));
    }
    update(dt,time){
      const f=this.fish;
      if(this.reduced&&!this.pointerDown){
        f.tx=.5;f.ty=.48;
      }else if(!this.pointerDown&&time>this.idleAt){
        f.tx=rand(.32,.68);f.ty=rand(.29,.63);this.idleAt=time+rand(3600,6200);
      }
      const motion=this.reduced?.16:1;
      const dx=f.tx-f.x,dy=f.ty-f.y;
      const accel=((f.action==='play'||f.action==='gift')?3.2:1.75)*motion;
      f.vx=(f.vx+dx*accel*dt)*Math.pow(.13,dt);f.vy=(f.vy+dy*accel*dt)*Math.pow(.13,dt);
      const max=(f.action==='play'?0.36:0.2);f.vx=clamp(f.vx,-max,max);f.vy=clamp(f.vy,-max*.75,max*.75);
      f.x=clamp(f.x+f.vx*dt,.30,.70);f.y=clamp(f.y+f.vy*dt,.25,.69);
      if(Math.abs(f.vx)>.008)f.dir=f.vx>=0?1:-1;
      f.angle=lerp(f.angle,clamp(f.vy*1.7,-.18,.18),1-Math.pow(.001,dt));
      f.tail+=dt*(6.2+Math.min(.18,Math.abs(f.vx))*18)*motion;f.fin+=dt*3.8*motion;f.breath+=dt*2.2*motion;
      if(time>f.blinkAt&&f.blink===0){f.blink=1;f.blinkAt=time+rand(2300,5200)}
      if(f.blink>0){f.blink+=dt*8;if(f.blink>2)f.blink=0}
      if(time>f.actionUntil)f.action='idle';
      for(const b of this.bubbles){b.y-=b.speed*dt*motion;b.x+=Math.sin(time*.001+b.phase)*b.drift*dt*motion;if(b.y<-.08)Object.assign(b,this.makeBubble(false))}
      this.sparks=this.sparks.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.08*dt;p.life-=dt*(p.hue===44?.42:.62);return p.life>0});
      this.food=this.food.filter(p=>{const mx=f.x+p.vx,my=f.y;const dx2=mx-p.x,dy2=my-p.y;p.vx+=dx2*.5*dt;p.vy+=dy2*.32*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*.22;return p.life>0&&p.y<.92});
      this.cleanWave=Math.max(0,this.cleanWave-dt*.42);
    }
    draw(time){
      const c=this.ctx,w=this.width,h=this.height;
      c.clearRect(0,0,w,h);this.drawWater(c,w,h,time);this.drawPortal(c,w,h,time);this.drawBackReef(c,w,h,time);this.drawBubbles(c,w,h,time);this.drawFishShadow(c,w,h);this.drawFish(c,w,h,time);this.drawForeground(c,w,h,time);this.drawEffects(c,w,h,time);this.drawGlass(c,w,h,time);
    }
    drawWater(c,w,h,time){
      const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0e7399');g.addColorStop(.24,'#0a477b');g.addColorStop(.58,'#111f59');g.addColorStop(1,'#100c2c');c.fillStyle=g;c.fillRect(0,0,w,h);
      const glow=c.createRadialGradient(w*.5,h*.03,0,w*.5,h*.03,w*.62);glow.addColorStop(0,'rgba(94,241,255,.35)');glow.addColorStop(.32,'rgba(45,177,232,.12)');glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,w,h*.62);
      c.save();c.globalCompositeOperation='screen';c.lineCap='round';
      for(let i=0;i<7;i++){c.beginPath();const y=20+i*12;for(let x=-20;x<=w+20;x+=18){const yy=y+Math.sin(x*.026+time*.0009+i)*5;c.lineTo(x,yy)}c.strokeStyle=`rgba(160,246,255,${.045+i*.008})`;c.lineWidth=2+i*.25;c.stroke()}
      c.restore();
      if(this.status.clean<55){c.fillStyle=`rgba(58,37,37,${(55-this.status.clean)/220})`;c.fillRect(0,0,w,h)}
    }
    drawPortal(c,w,h,time){
      const x=w*.5,y=h*.47,rx=Math.max(48,Math.min(w*.36,h*.34)),ry=rx*.92;
      c.save();c.translate(x,y);c.globalCompositeOperation='screen';
      for(let i=0;i<4;i++){c.beginPath();c.ellipse(0,0,Math.max(6,rx-i*11),Math.max(6,ry-i*10),0,0,TAU);const boost=(this.status.level-1)*.025;c.strokeStyle=i%2?`rgba(255,200,74,${.12+i*.025+boost})`:`rgba(186,53,255,${.22+i*.04+boost})`;c.lineWidth=i===0?5:2;c.shadowBlur=18;c.shadowColor=i%2?'#ffbe43':'#b82cff';c.stroke()}
      c.rotate(time*.00016);c.setLineDash([18,23]);c.beginPath();c.ellipse(0,0,rx+8,ry+8,0,0,TAU);c.strokeStyle='rgba(202,73,255,.42)';c.lineWidth=2;c.stroke();c.setLineDash([]);c.restore();
    }
    drawBackReef(c,w,h,time){
      c.save();c.globalAlpha=.48;
      const hill=c.createLinearGradient(0,h*.5,0,h);hill.addColorStop(0,'#172356');hill.addColorStop(1,'#090919');c.fillStyle=hill;c.beginPath();c.moveTo(0,h*.72);for(let x=0;x<=w;x+=w/8)c.lineTo(x,h*.68+Math.sin(x*.032+1.2)*20+Math.sin(x*.01)*25);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
      c.globalAlpha=1;
      this.drawPlant(c,w*.09,h*.9,h*.29,-.18,time,0);this.drawPlant(c,w*.92,h*.91,h*.31,.16,time,1);
      this.drawCoral(c,w*.21,h*.89,h*.18,1);this.drawCoral(c,w*.78,h*.9,h*.2,-1);
      if(this.status.level>=3){this.drawCoral(c,w*.36,h*.92,h*.12,-1);this.drawCoral(c,w*.64,h*.92,h*.13,1)}
      if(this.status.level>=4){c.save();c.globalCompositeOperation='screen';c.strokeStyle='rgba(255,213,85,.28)';c.lineWidth=2;c.shadowBlur=12;c.shadowColor='#ffd45e';for(let i=0;i<5;i++){c.beginPath();c.moveTo(w*(.34+i*.08),h*.84);c.lineTo(w*(.4+i*.05),h*.67);c.stroke()}c.restore()}
      const sand=c.createLinearGradient(0,h*.82,0,h);sand.addColorStop(0,'#d6a052');sand.addColorStop(.42,'#8d5634');sand.addColorStop(1,'#2c1b2d');c.fillStyle=sand;c.beginPath();c.moveTo(0,h*.86);c.quadraticCurveTo(w*.23,h*.8,w*.48,h*.87);c.quadraticCurveTo(w*.72,h*.93,w,h*.84);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
      for(const grain of this.sand){c.fillStyle=`rgba(255,220,150,${grain.a})`;c.beginPath();c.arc(grain.x*w,h*.86+grain.y*Math.max(8,h*.12),grain.r,0,TAU);c.fill()}
      c.restore();
    }
    drawPlant(c,x,y,len,lean,time,phase){
      c.save();c.translate(x,y);c.lineCap='round';
      for(let i=0;i<5;i++){const t=i/4;const sway=Math.sin(time*.0012+phase+i)*7;c.beginPath();c.moveTo(0,0);c.bezierCurveTo((lean*len)+sway*.2,-len*.35,(lean*len*.6)+sway,-len*.7,sway,-len*(.76+t*.13));const g=c.createLinearGradient(0,0,0,-len);g.addColorStop(0,'#057c67');g.addColorStop(.55,'#16ca94');g.addColorStop(1,'#6bffd0');c.strokeStyle=g;c.lineWidth=Math.max(4,len*.035-i*.35);c.shadowBlur=8;c.shadowColor='#0affc6';c.globalAlpha=.5+t*.1;c.stroke()}
      c.restore();
    }
    drawCoral(c,x,y,len,dir){
      c.save();c.translate(x,y);c.lineCap='round';c.strokeStyle='rgba(255,82,195,.76)';c.shadowBlur=9;c.shadowColor='#ff3cbc';
      const branch=(sx,sy,ex,ey,width)=>{c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+ex)*.48+dir*len*.08,(sy+ey)*.55,ex,ey);c.lineWidth=width;c.stroke()};
      branch(0,0,0,-len,8);branch(0,-len*.35,dir*len*.35,-len*.62,6);branch(0,-len*.55,-dir*len*.28,-len*.83,5);branch(dir*len*.15,-len*.55,dir*len*.43,-len*.88,4);c.restore();
    }
    drawBubbles(c,w,h,time){
      c.save();
      for(const b of this.bubbles){const x=b.x*w+Math.sin(time*.001+b.phase)*9,y=b.y*h;c.beginPath();c.arc(x,y,b.r,0,TAU);const g=c.createRadialGradient(x-b.r*.3,y-b.r*.35,0,x,y,b.r);g.addColorStop(0,'rgba(255,255,255,.72)');g.addColorStop(.22,'rgba(170,248,255,.2)');g.addColorStop(.7,'rgba(85,204,255,.06)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.globalAlpha=b.alpha;c.fill();c.strokeStyle='rgba(190,247,255,.22)';c.lineWidth=1;c.stroke()}
      c.restore();
    }
    drawFishShadow(c,w,h){
      const f=this.fish,x=f.x*w,y=Math.min(h*.86,f.y*h+h*.2);c.save();c.translate(x,y);c.scale(1,.24);const g=c.createRadialGradient(0,0,0,0,0,w*.18);g.addColorStop(0,'rgba(0,0,0,.38)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,w*.18,0,TAU);c.fill();c.restore();
    }
    drawFish(c,w,h,time){
      const f=this.fish;const base=Math.min(w/560,h/650);const scale=clamp(base,.50,.78)*(1+Math.sin(f.breath)*.012);
      const x=f.x*w,y=f.y*h,dir=f.dir;
      c.save();c.translate(x,y);c.rotate(f.angle);c.scale(dir*scale,scale);
      c.shadowBlur=28;c.shadowColor=this.status.level>=4?'rgba(255,201,65,.55)':'rgba(179,39,255,.55)';
      this.drawTail(c,f,time);this.drawFinsBehind(c,f,time);this.drawBody(c,f,time);this.drawFace(c,f,time);this.drawFinsFront(c,f,time);
      c.restore();
      c.save();c.translate(x,y);c.rotate(f.angle);c.scale(scale,scale);c.font='900 78px Arial Black, Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=8;c.strokeStyle='#6c3507';c.strokeText('J',dir*8,21);const jg=c.createLinearGradient(0,-35,0,55);jg.addColorStop(0,'#fff4a9');jg.addColorStop(.35,'#ffd65b');jg.addColorStop(.72,'#ef9a24');jg.addColorStop(1,'#9d470f');c.fillStyle=jg;c.shadowBlur=12;c.shadowColor='#ffbf35';c.fillText('J',dir*8,21);c.restore();
    }
    drawTail(c,f,time){
      c.save();c.translate(-116,6);c.rotate(Math.sin(f.tail)*.11+(f.action==='play'?.1:0));
      const g=c.createLinearGradient(-5,-58,-92,48);g.addColorStop(0,'rgba(255,126,221,.96)');g.addColorStop(.42,'rgba(147,49,244,.95)');g.addColorStop(1,'rgba(42,12,112,.95)');
      c.fillStyle=g;c.strokeStyle='#ffd865';c.lineWidth=6;c.beginPath();c.moveTo(0,-22);c.bezierCurveTo(-34,-54,-72,-59,-96,-76);c.bezierCurveTo(-86,-34,-69,-7,-45,7);c.bezierCurveTo(-67,22,-86,46,-98,76);c.bezierCurveTo(-65,60,-32,53,2,31);c.closePath();c.fill();c.stroke();
      c.strokeStyle='rgba(255,184,238,.55)';c.lineWidth=3;c.beginPath();c.moveTo(-7,-15);c.quadraticCurveTo(-45,-38,-82,-61);c.moveTo(-5,23);c.quadraticCurveTo(-43,39,-82,61);c.stroke();
      c.restore();
    }
    drawFinsBehind(c,f,time){
      const gold=c.createLinearGradient(0,-102,0,-42);gold.addColorStop(0,'#fff4a6');gold.addColorStop(.42,'#ffc83e');gold.addColorStop(1,'#a54a0d');
      c.fillStyle=gold;c.strokeStyle='#ffe982';c.lineWidth=4.5;
      const rays=[[-64,-58,-48,-103,-29,-63],[-28,-68,-10,-116,10,-67],[10,-67,31,-109,47,-58]];
      for(const r of rays){c.beginPath();c.moveTo(r[0],r[1]);c.quadraticCurveTo(r[2],r[3],r[4],r[5]);c.closePath();c.fill();c.stroke()}
      c.save();c.translate(-28,54);c.rotate(Math.sin(f.fin)*.07-.1);const fg=c.createLinearGradient(0,0,50,58);fg.addColorStop(0,'rgba(241,99,229,.84)');fg.addColorStop(1,'rgba(79,22,169,.58)');c.fillStyle=fg;c.strokeStyle='#ffd75b';c.lineWidth=4.5;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(35,10,53,55);c.quadraticCurveTo(17,48,-12,17);c.closePath();c.fill();c.stroke();c.restore();
    }
    drawBody(c,f,time){
      const body=c.createLinearGradient(-122,-62,138,63);body.addColorStop(0,'#241057');body.addColorStop(.2,'#4b178f');body.addColorStop(.48,'#8d22d1');body.addColorStop(.73,'#da38e4');body.addColorStop(1,'#6f1ab2');
      c.fillStyle=body;c.strokeStyle='#3c0b70';c.lineWidth=8;c.beginPath();c.moveTo(-118,-18);c.bezierCurveTo(-78,-76,31,-88,105,-51);c.bezierCurveTo(141,-33,158,-9,151,18);c.bezierCurveTo(140,56,66,84,-27,75);c.bezierCurveTo(-78,70,-112,44,-125,20);c.bezierCurveTo(-137,-2,-132,-14,-118,-18);c.closePath();c.fill();c.stroke();
      const hi=c.createRadialGradient(46,-43,3,20,-8,165);hi.addColorStop(0,'rgba(255,255,255,.62)');hi.addColorStop(.16,'rgba(255,190,251,.3)');hi.addColorStop(.48,'rgba(172,69,255,.1)');hi.addColorStop(1,'rgba(18,3,52,0)');c.fillStyle=hi;c.fill();
      const belly=c.createLinearGradient(0,8,0,80);belly.addColorStop(0,'rgba(235,94,224,.08)');belly.addColorStop(1,'rgba(19,5,67,.72)');c.fillStyle=belly;c.beginPath();c.moveTo(-107,25);c.bezierCurveTo(-40,66,60,76,137,34);c.bezierCurveTo(99,77,17,91,-30,76);c.bezierCurveTo(-78,70,-106,46,-107,25);c.closePath();c.fill();
      c.save();c.globalAlpha=.2;c.strokeStyle='#ffb9ef';c.lineWidth=2;for(let i=-73;i<58;i+=22){c.beginPath();c.arc(i,8,22,-.82,.82);c.stroke()}c.restore();
      const armor=c.createLinearGradient(0,-62,0,58);armor.addColorStop(0,'#fff3a5');armor.addColorStop(.3,'#ffd35b');armor.addColorStop(.72,'#ef9a24');armor.addColorStop(1,'#773007');c.strokeStyle=armor;c.lineCap='round';c.lineWidth=9;c.beginPath();c.moveTo(52,-55);c.quadraticCurveTo(70,-11,57,53);c.stroke();c.lineWidth=3.5;c.strokeStyle='rgba(255,247,184,.9)';c.beginPath();c.moveTo(58,-52);c.quadraticCurveTo(74,-11,62,49);c.stroke();
      c.strokeStyle='rgba(255,221,100,.7)';c.lineWidth=5;c.beginPath();c.moveTo(-75,-53);c.quadraticCurveTo(-23,-78,31,-69);c.stroke();
      for(let i=0;i<20;i++){const px=-94+(i*13)%170,py=-34+((i*17)%56);c.fillStyle=`rgba(255,255,255,${.08+(i%4)*.025})`;c.beginPath();c.arc(px,py,1+(i%3)*.45,0,TAU);c.fill()}
      if(this.status.level>=3){c.save();c.globalCompositeOperation='screen';for(let i=0;i<this.status.level*3;i++){const px=-78+(i*29)%150,py=-36+((i*19)%62);c.fillStyle=i%2?'rgba(255,226,99,.45)':'rgba(240,137,255,.42)';c.beginPath();c.arc(px,py,1.2+(i%3)*.4,0,TAU);c.fill()}c.restore()}
    }
    drawFace(c,f,time){
      const blink=f.blink===0?1:Math.max(.08,Math.abs(Math.cos(f.blink*Math.PI*.5)));
      c.save();c.translate(92,-25);c.scale(1,blink);c.fillStyle='#f7f9ff';c.strokeStyle='#ffcf58';c.lineWidth=5;c.beginPath();c.ellipse(0,0,22,24,0,0,TAU);c.fill();c.stroke();
      const iris=c.createRadialGradient(-5,-7,1,0,0,16);iris.addColorStop(0,'#efffff');iris.addColorStop(.22,'#64f7ff');iris.addColorStop(.57,'#1b8fff');iris.addColorStop(.83,'#17369d');iris.addColorStop(1,'#06133a');c.fillStyle=iris;c.beginPath();c.arc(2,2,16,0,TAU);c.fill();c.fillStyle='#06102e';c.beginPath();c.arc(5,4,7,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-3,-7,5,0,TAU);c.fill();c.beginPath();c.arc(7,-2,2.2,0,TAU);c.fill();c.restore();
      c.strokeStyle='rgba(66,5,86,.88)';c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(72,-52);c.quadraticCurveTo(93,-63,110,-53);c.stroke();
      c.fillStyle='#1c0225';c.strokeStyle='#ff94d4';c.lineWidth=5;c.beginPath();c.moveTo(123,0);c.quadraticCurveTo(151,4,153,19);c.quadraticCurveTo(151,33,136,39);c.quadraticCurveTo(121,38,111,28);c.quadraticCurveTo(123,18,123,0);c.closePath();c.fill();c.stroke();
      c.fillStyle='#ff6f9d';c.beginPath();c.ellipse(136,29,10,4,-.12,0,TAU);c.fill();
      c.strokeStyle='#ffd45e';c.lineWidth=7;c.beginPath();c.moveTo(36,-51);c.quadraticCurveTo(49,-16,39,31);c.stroke();
      c.fillStyle='rgba(255,255,255,.42)';c.beginPath();c.ellipse(121,-25,6,2.5,-.28,0,TAU);c.fill();
    }
    drawFinsFront(c,f,time){
      c.save();c.translate(-18,20);c.rotate(Math.sin(f.fin*1.2)*.1+.12);const g=c.createLinearGradient(0,0,61,41);g.addColorStop(0,'rgba(255,111,231,.96)');g.addColorStop(.54,'rgba(142,39,228,.9)');g.addColorStop(1,'rgba(57,15,142,.68)');c.fillStyle=g;c.strokeStyle='#ffd45e';c.lineWidth=4.5;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(38,-2,64,22);c.quadraticCurveTo(34,43,-10,33);c.closePath();c.fill();c.stroke();c.strokeStyle='rgba(255,198,243,.55)';c.lineWidth=1.8;c.beginPath();c.moveTo(6,8);c.lineTo(49,22);c.moveTo(5,17);c.lineTo(39,30);c.stroke();c.restore();
    }
    drawForeground(c,w,h,time){
      c.save();c.globalAlpha=.9;this.drawPlant(c,w*.025,h*1.02,h*.28,-.1,time,3);this.drawPlant(c,w*.975,h*1.02,h*.26,.1,time,4);c.restore();
    }
    drawEffects(c,w,h,time){
      c.save();c.globalCompositeOperation='screen';
      for(const p of this.sparks){const x=p.x*w,y=p.y*h;c.globalAlpha=p.life;c.fillStyle=`hsl(${p.hue} 100% 68%)`;c.shadowBlur=11;c.shadowColor=c.fillStyle;c.beginPath();c.arc(x,y,p.size,0,TAU);c.fill()}
      for(const p of this.food){const x=p.x*w,y=p.y*h;c.globalAlpha=Math.min(1,p.life);c.fillStyle=p.gold?'#ffd65a':'#ff8de5';c.shadowBlur=9;c.shadowColor=c.fillStyle;c.beginPath();c.moveTo(x,y-p.size);c.lineTo(x+p.size,y);c.lineTo(x,y+p.size);c.lineTo(x-p.size,y);c.closePath();c.fill()}
      if(this.cleanWave>0){const r=(1-this.cleanWave)*Math.max(w,h)*.85;c.globalAlpha=this.cleanWave*.7;c.strokeStyle='#8ffbff';c.lineWidth=8;c.shadowBlur=26;c.shadowColor='#50efff';c.beginPath();c.arc(w*.5,h*.5,r,0,TAU);c.stroke()}
      c.restore();
    }
    drawGlass(c,w,h,time){
      c.save();const edge=c.createLinearGradient(0,0,w,h);edge.addColorStop(0,'rgba(255,255,255,.17)');edge.addColorStop(.22,'rgba(255,255,255,0)');edge.addColorStop(.8,'rgba(255,255,255,.05)');edge.addColorStop(1,'rgba(255,255,255,.14)');c.fillStyle=edge;c.fillRect(0,0,w,h);
      c.globalCompositeOperation='screen';c.fillStyle='rgba(210,250,255,.08)';c.beginPath();c.moveTo(w*.07,0);c.lineTo(w*.22,0);c.lineTo(w*.05,h*.72);c.lineTo(0,h*.84);c.closePath();c.fill();
      c.restore();
    }
  }

  window.JemmoMascotRenderer=JemmoMascotRenderer;
})();
