(function(){
'use strict';
const native=typeof tt!=='undefined';
const World=native?require('./src/world.js').World:window.BladeWorld.World;
const SoundBank=native?require('./src/audio.js').SoundBank:window.BladeAudio.SoundBank;
const sounds=new SoundBank(native?tt:null);
const canvas=native?tt.createCanvas():document.getElementById('game'),ctx=canvas.getContext('2d');
const info=native?tt.getSystemInfoSync():{windowWidth:innerWidth,windowHeight:innerHeight,pixelRatio:devicePixelRatio||1};
const W=info.windowWidth,H=info.windowHeight,ratio=Math.min(info.pixelRatio||1,2);
canvas.width=W*ratio;canvas.height=H*ratio;ctx.scale(ratio,ratio);
let world=new World(),screen='home',last=0,stick=null,touchId=null,best=0,buttons=[];
const input={x:0,y:0},keys=new Set();
// 图集只加载一次，异步失败时保留原有绘制，避免白屏或阻断战斗。
const atlas=native?tt.createImage():new Image();
let atlasReady=false;
atlas.addEventListener('load',()=>{atlasReady=atlas.width>0&&atlas.height>0;console.info('blade:atlas',atlasReady?'ready':'invalid');});
atlas.addEventListener('error',()=>{atlasReady=false;console.warn('blade:atlas load failed');});
atlas.src='assets/journey-characters.png';
// 地表与战斗使用独立资源，加载失败时退回纯色，不影响角色与操作。
const ground=native?tt.createImage():new Image();
let groundReady=false;
ground.addEventListener('load',()=>{groundReady=ground.width>0&&ground.height>0;console.info('blade:ground',groundReady?'ready':'invalid');});
ground.addEventListener('error',()=>{groundReady=false;console.warn('blade:ground load failed');});
ground.src='assets/huaguo-ground.png';
// 固定四等分图集，绘制尺寸只影响视觉，不改变碰撞体和首关难度。
function character(index,x,y,size,phase){
 if(!atlasReady)return false;
 const cellW=atlas.width/2,cellH=atlas.height/2;
 const bob=Math.sin(world.time*7+phase)*2;
 ctx.drawImage(atlas,(index%2)*cellW,Math.floor(index/2)*cellH,cellW,cellH,x-size/2,y-size*0.68+bob,size,size);
 return true;
}
// 仅存本机纪录，保存失败不影响战斗。
try{best=Number(native?tt.getStorageSync('blade-best'):localStorage.getItem('blade-best'))||0;}catch(e){console.warn('读取纪录失败',e);}
function save(){if(world.kills<=best)return;best=world.kills;try{if(native)tt.setStorageSync('blade-best',best);else localStorage.setItem('blade-best',String(best));}catch(e){console.warn('保存纪录失败',e);}}
function resetInput(){stick=null;touchId=null;input.x=input.y=0;keys.clear();}
function start(){sounds.stop();world=new World();screen='game';resetInput();sounds.play('start');console.info('blade:state', 'playing');}
function pause(){sounds.stop();resetInput();if(screen==='game'&&world.status==='playing')world.status='paused';}
function text(s,x,y,size=16,color='#eaf5ef',align='left'){ctx.fillStyle=color;ctx.font='bold '+size+'px sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y);}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function button(label,x,y,w,h,action,color='#c5f277'){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);text(label,x+w/2,y+h/2+6,17,'#13251c','center');buttons.push({x,y,w,h,action});}
// 全部图形现场绘制，不使用原作美术和角色。
function blade(x,y,a,color){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-5,-17);ctx.quadraticCurveTo(25,-7,7,23);ctx.quadraticCurveTo(10,0,-5,-17);ctx.fillStyle=color;ctx.fill();ctx.restore();}
function arena(){
 const p=world.player,cx=W/2,cy=H*0.53;
 ctx.fillStyle='#254d3a';ctx.fillRect(0,0,W,H);
 // 地图按世界坐标平铺，移动时跟随世界滚动；只绘制视口内的少量图块。
 if(groundReady){
  const tile=512,ox=((cx-p.x)%tile+tile)%tile,oy=((cy-p.y)%tile+tile)%tile;
  for(let x=ox-tile;x<W;x+=tile)for(let y=oy-tile;y<H;y+=tile)ctx.drawImage(ground,x,y,tile,tile);
  ctx.fillStyle='rgba(12,32,22,.18)';ctx.fillRect(0,0,W,H);
 }
 ctx.save();ctx.translate(cx-p.x,cy-p.y);
 for(const d of world.drops)circle(d.x,d.y,d.blade?7:4,d.blade?'#ffd77c':'#69dfc6');
 for(const e of world.enemies){
  circle(e.x,e.y+12,e.radius,'rgba(5,17,13,.35)');
  // 用空间位置决定两种小妖外观，不额外消耗战斗随机数。
  if(e.skin===undefined)e.skin=e.elite?3:(Math.floor(Math.abs(e.x+e.y))%2)+1;
  const skin=e.skin;
  ctx.globalAlpha=e.hit?0.65:1;
  if(!character(skin,e.x,e.y,e.elite?112:80,e.x)){
   circle(e.x,e.y,e.radius,e.elite?'#c67cf1':'#e87f69');
   circle(e.x-5,e.y-3,2,'#252a26');circle(e.x+5,e.y-3,2,'#252a26');
  }
  ctx.globalAlpha=1;
  for(let i=0;i<e.blades;i++){const a=-world.angle+i*Math.PI*2/e.blades;blade(e.x+Math.cos(a)*47,e.y+Math.sin(a)*47,a,'#e5a5ff');}
 }
 ctx.globalAlpha=p.invincible&&Math.floor(world.time*12)%2?0.4:1;
 circle(p.x,p.y+14,20,'rgba(5,17,13,.45)');
 if(!character(0,p.x,p.y,112,0)){
  circle(p.x,p.y,18,'#f3cc83');ctx.fillStyle='#27828b';ctx.fillRect(p.x-13,p.y+2,26,18);
  circle(p.x,p.y-13,12,'#f4d9b0');ctx.fillStyle='#263b37';ctx.fillRect(p.x-12,p.y-23,24,8);
 }
 ctx.globalAlpha=1;
 // 刀光轨迹与短暂飘字强化命中感，不抖动画面以免干扰手机走位。
 ctx.strokeStyle='rgba(197,242,119,.2)';ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(p.x,p.y,p.radius,world.angle,world.angle+Math.PI*1.5);ctx.stroke();
 for(const effect of world.effects){ctx.globalAlpha=Math.min(1,effect.ttl*3);text(effect.text,effect.x,effect.y,19,effect.color,'center');}ctx.globalAlpha=1;
 for(const b of world.blades())blade(b.x,b.y,b.angle,'#e4f4cd');text(String(p.blades),p.x,p.y-72,21,'#c5f277','center');ctx.restore();
}
// 手绘圆角路径兼容小游戏 Canvas，不依赖浏览器专属的 roundRect。
function panel(x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
 ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
 ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
}
function upgradePanel(){
 const count=world.choices.length,cardH=Math.min(110,Math.max(76,(H-250)/3)),gap=12;
 const groupH=count*cardH+(count-1)*gap,top=Math.max(150,(H-groupH)/2+25);
 text('花 果 山  ·  修 行 录',W/2,top-103,12,'#b5b591','center');
 text('神通精进',W/2,top-64,32,'#f2d793','center');
 text('境界提升，择一神通',W/2,top-36,14,'#b9c9b6','center');
 const styles={blades:['刃','御刃','#e8c46e'],damage:['攻','破敌','#edae88'],speed:['疾','身法','#a9d6c0'],radius:['域','刀阵','#a9cfe3'],heal:['愈','调息','#c9db97']};
 world.choices.forEach((u,i)=>{
  const y=top+i*(cardH+gap),x=24,w=W-48,style=styles[u.key];
  panel(x,y+5,w,cardH,12,'rgba(0,0,0,.28)');
  panel(x,y,w,cardH,12,'#183d32','#7e8d61');
  panel(x+5,y+5,w-10,cardH-10,9,'#214739','rgba(219,195,126,.24)');
  ctx.fillStyle=style[2];ctx.fillRect(x+1,y+22,3,cardH-44);
  circle(x+40,y+cardH/2,23,'#102c25');
  ctx.beginPath();ctx.arc(x+40,y+cardH/2,23,0,Math.PI*2);ctx.strokeStyle=style[2];ctx.stroke();
  text(style[0],x+40,y+cardH/2+8,25,style[2],'center');
  text(style[1]+'  /  神通 '+String(i+1).padStart(2,'0'),x+77,y+24,11,style[2]);
  text(u.name,x+77,y+48,21,'#fbf1d4');
  text(u.detail,x+77,y+cardH-16,12,'#c4d6c6');
  text('›',x+w-19,y+cardH/2+8,27,'#d5bf80','center');
  // 整张卡片可点击，效果说明与标题共用同一热区。
  buttons.push({x,y,w,h:cardH,action:()=>{world.choose(i);resetInput();sounds.play('choose');console.info('blade:upgrade',u.key,world.status);}});
 });
 text('点击任意神通卡，继续降妖',W/2,top+groupH+30,12,'#9ba991','center');
}
function draw(){
 buttons=[];
 if(screen==='home'){ctx.fillStyle='#102c27';ctx.fillRect(0,0,W,H);}else arena();
 const p=world.player;
 if(screen==='home'){
  ctx.fillStyle='rgba(7,22,18,.83)';ctx.fillRect(0,0,W,H);
  text('太阳的游乐场 · 西游试炼',W/2,H*0.13,14,'#a9c5b5','center');
  character(0,W/2,H*0.46,142,0);
  text('别惹',W/2,H*0.23,52,'#eaf5df','center');text('我的刀',W/2,H*0.23+58,52,'#c5f277','center');
  text('悟空出阵，群妖退散',W/2,H*0.55,17,'#bad2c4','center');
  button('开始转刀  →',W*0.15,H*0.6,W*0.7,56,start);
  text('拖动移动 · 飞刀自动攻击 · 首关90秒',W/2,H*0.74,12,'#a9c5b5','center');text('最高击败 '+best+'  /  v0.5.0',W/2,H*0.8,13,'#a9c5b5','center');return;
 }
 ctx.fillStyle='rgba(8,25,20,.9)';ctx.fillRect(0,0,W,126);text('别惹我的刀',20,34,20);text('花果山试炼 · '+world.level+' 级',20,61,13,'#c5f277');
 text('生命 '+Math.max(0,p.hp)+'/'+p.maxHp+'   飞刀 '+p.blades+'/'+p.maxBlades,20,88,14);text('击败 '+world.kills+'  ·  剩余 '+Math.ceil(Math.max(0,world.duration-world.time))+' 秒',20,110,13,'#bad2c4');
 ctx.fillStyle='#355046';ctx.fillRect(20,120,W-40,4);ctx.fillStyle='#c5f277';ctx.fillRect(20,120,(W-40)*Math.min(1,world.xp/world.nextXp),4);
 if(world.combo>=3&&world.comboClock>0)text(world.combo+' 连斩!',W-20,62,23,'#ffd77c','right');
 if(world.status==='playing'){
  button('Ⅱ',W-65,H-76,46,46,pause,'#9fbaaa');text('拖动走位，靠近光点收集经验',W/2,H-95,13,'#aac4b6','center');
  if(stick){circle(stick.x,stick.y,42,'rgba(213,245,215,.12)');circle(stick.x+input.x*32,stick.y+input.y*32,17,'#a9d99b');}return;
 }
 ctx.fillStyle=world.status==='upgrade'?'rgba(6,19,15,.86)':'rgba(6,19,15,.9)';ctx.fillRect(0,0,W,H);
 if(world.status==='upgrade'){
  upgradePanel();
 }else if(world.status==='paused'){
  text('歇一口气',W/2,H*0.38,34,'#c5f277','center');button('继续战斗',40,H*0.5,W-80,56,()=>{world.status='playing';last=0;sounds.play('choose');});
 }else{
  text(world.status==='won'?'这一圈，你赢了':'刀可再转，江湖再见',W/2,H*0.33,26,'#c5f277','center');
  text('击败 '+world.kills+'  ·  生存 '+Math.floor(world.time)+' 秒',W/2,H*0.43,18,'#eaf5ef','center');text('最高纪录 '+best,W/2,H*0.48,15,'#bad2c4','center');
  button('再转一局',40,H*0.57,W-80,56,start);text('本版没有广告和付费项目',W/2,H*0.72,13,'#bad2c4','center');
 }
}
// 锁定首个触点，避免多指操作让摇杆突然切换。
function down(x,y,id){sounds.unlock();const hit=buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(hit){hit.action();return;}if(screen==='game'&&world.status==='playing'&&!stick){stick={x,y};touchId=id;}}
function move(x,y,id){if(!stick||id!==touchId)return;const dx=(x-stick.x)/42,dy=(y-stick.y)/42,length=Math.max(1,Math.hypot(dx,dy));input.x=dx/length;input.y=dy/length;}
if(native){
 tt.onTouchStart(e=>{const t=e.changedTouches[0];if(t)down(t.clientX,t.clientY,t.identifier);});tt.onTouchMove(e=>{for(const t of e.changedTouches)move(t.clientX,t.clientY,t.identifier);});
 const end=e=>{if(e.changedTouches.some(t=>t.identifier===touchId))resetInput();};tt.onTouchEnd(end);tt.onTouchCancel(end);tt.onHide(pause);tt.onShow(()=>{last=0;});
}else{
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);down(e.clientX,e.clientY,e.pointerId);});canvas.addEventListener('pointermove',e=>move(e.clientX,e.clientY,e.pointerId));
 canvas.addEventListener('pointerup',e=>{if(e.pointerId===touchId)resetInput();});canvas.addEventListener('pointercancel',resetInput);
 window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key==='Escape')pause();});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
}
function frame(now){const dt=last?(now-last)/1000:0;last=now;if(screen==='game'){
 const movement=keys.size?{x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))}:input;
 // 每帧只挑一个最重要事件发声，避免清怪与拾取密集叠响。
 const previous={status:world.status,kills:world.kills,xp:world.xp,hp:world.player.hp};
 world.update(dt,movement);
 if(world.status!==previous.status&&world.status==='won')sounds.play('win');
 else if(world.status!==previous.status&&world.status==='lost')sounds.play('lose');
 else if(world.status!==previous.status&&world.status==='upgrade')sounds.play('upgrade');
 else if(world.player.hp<previous.hp)sounds.play('hurt');
 else if(world.kills>previous.kills)sounds.play('defeat');
 else if(world.xp>previous.xp)sounds.play('pickup');
 else if(world.status==='playing'&&world.effects.some(e=>e.ttl===0.5))sounds.play('hit');
 if(world.status==='lost'||world.status==='won')save();
}draw();button(sounds.muted?'音效：关':'音效：开',20,H-76,104,46,()=>{sounds.toggle();if(!sounds.muted)sounds.play('choose');console.info('blade:muted',sounds.muted);},'#d5c995');requestAnimationFrame(frame);}
// 只读状态探针用于 IDE 验证，不提供修改战斗数据的接口。
if(native)GameGlobal.__bladeState=()=>({screen,status:world.status,time:world.time,kills:world.kills,hp:world.player.hp,blades:world.player.blades,level:world.level,atlasReady,groundReady,muted:sounds.muted,lastCue:sounds.lastCue});
requestAnimationFrame(frame);
})();
