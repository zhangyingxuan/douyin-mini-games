(function(root) {
'use strict';
const upgrades = [
  {name:'万刃归宗', detail:'飞刀上限 +2，并补满', key:'blades'},
  {name:'锋芒毕露', detail:'伤害 +1', key:'damage'},
  {name:'踏风而行', detail:'移动速度 +12%', key:'speed'},
  {name:'长虹贯日', detail:'攻击半径 +10', key:'radius'},
  {name:'生生不息', detail:'恢复 2 点生命', key:'heal'}
];
// 战斗不依赖平台，让抖音和浏览器复用可测试的规则。
class World {
  constructor(random = Math.random) {
    this.random=random;
    this.player={x:0,y:0,hp:7,maxHp:7,blades:6,maxBlades:6,damage:2,speed:180,radius:75,invincible:0};
    this.enemies=[]; this.drops=[]; this.time=0; this.angle=0;
    this.duration=90; this.effects=[]; this.combo=0; this.comboClock=0;
    this.kills=0; this.xp=0; this.level=1; this.nextXp=3;
    this.spawnClock=0; this.regenClock=0; this.status='playing'; this.choices=[];
  }
  blades() {
    const p=this.player;
    return Array.from({length:p.blades},(_,i)=>{
      const angle=this.angle+i*Math.PI*2/p.blades;
      return {x:p.x+Math.cos(angle)*p.radius,y:p.y+Math.sin(angle)*p.radius,angle};
    });
  }
  // 排除满级属性并无放回抽取，避免重复和无效选项。
  levelUp() {
    if(this.xp<this.nextXp)return;
    this.xp-=this.nextXp; this.level++; this.nextXp+=3;
    // 升级必给可见成长与少量恢复，避免抽到非输出选项时毫无变强感。
    const p=this.player; p.maxBlades=Math.min(24,p.maxBlades+1); p.blades=p.maxBlades; p.hp=Math.min(p.maxHp,p.hp+1);
    const pool=upgrades.filter(u=>(u.key!=='blades'||this.player.maxBlades<24)&&(u.key!=='radius'||this.player.radius<145)&&(u.key!=='heal'||this.player.hp<this.player.maxHp));
    this.choices=[]; const count=Math.min(3,pool.length);
    while(this.choices.length<count)this.choices.push(pool.splice(Math.floor(this.random()*pool.length),1)[0]);
    this.status='upgrade';
  }
  choose(index) {
    if(this.status!=='upgrade'||!this.choices[index])return;
    const p=this.player;
    switch(this.choices[index].key){
      case 'blades': p.maxBlades=Math.min(24,p.maxBlades+2); p.blades=p.maxBlades; break;
      case 'damage': p.damage++; break;
      case 'speed': p.speed*=1.12; break;
      case 'radius': p.radius=Math.min(145,p.radius+10); break;
      case 'heal': p.hp=Math.min(p.maxHp,p.hp+2); break;
    }
    this.choices=[]; this.status='playing';
  }
  spawn() {
    const a=this.random()*Math.PI*2,elite=this.time>=60&&this.random()<0.12;
    this.enemies.push({x:this.player.x+Math.cos(a)*280,y:this.player.y+Math.sin(a)*280,
      hp:elite?8:2+Math.floor(this.time/60),radius:elite?23:15,
      speed:elite?45:32+this.random()*16,elite,blades:elite?4:0,hit:0,clash:0});
  }
  // 限制步长并冻结非战斗状态，避免后台恢复时补算大量伤害。
  update(delta,input={x:0,y:0}) {
    if(this.status!=='playing')return;
    const dt=Math.max(0,Math.min(delta,0.05)),p=this.player;
    this.time+=dt; this.angle=(this.angle+dt*4.5)%(Math.PI*2);
    p.invincible=Math.max(0,p.invincible-dt);
    this.comboClock=Math.max(0,this.comboClock-dt); if(!this.comboClock)this.combo=0;
    this.effects=this.effects.filter(e=>{e.ttl-=dt;e.y-=25*dt;return e.ttl>0;});
    const length=Math.max(1,Math.hypot(input.x,input.y));
    p.x+=input.x/length*p.speed*dt; p.y+=input.y/length*p.speed*dt;
    this.spawnClock-=dt; this.regenClock+=dt;
    if(this.spawnClock<=0&&this.enemies.length<60){this.spawn();this.spawnClock=Math.max(0.4,0.85-this.time/180);}
    if(this.regenClock>=0.8){p.blades=Math.min(p.maxBlades,p.blades+1);this.regenClock=0;}
    let blades=this.blades();
    for(const e of this.enemies){
      e.hit=Math.max(0,e.hit-dt);e.clash=Math.max(0,e.clash-dt);
      const distance=Math.hypot(p.x-e.x,p.y-e.y)||1,direction=e.elite&&e.blades===0?-1:1;
      e.x+=(p.x-e.x)/distance*e.speed*dt*direction;e.y+=(p.y-e.y)/distance*e.speed*dt*direction;
      // 实际刀刃接触才伤害，保留刀阵空隙和走位价值。
      if(!e.hit&&blades.some(b=>Math.hypot(b.x-e.x,b.y-e.y)<e.radius+18)){
        e.hp-=p.damage;e.hit=0.22;
        // 受击击退提供触觉替代反馈，也给新玩家留下撤退空间。
        const away=Math.hypot(e.x-p.x,e.y-p.y)||1;
        e.x+=(e.x-p.x)/away*16;e.y+=(e.y-p.y)/away*16;
        this.effects.push({x:e.x,y:e.y-12,text:'-'+p.damage,ttl:0.5,color:'#fff0b7'});
      }
      if(e.elite&&e.blades&&!e.clash&&p.blades){
        const guards=Array.from({length:e.blades},(_,i)=>{const a=-this.angle+i*Math.PI*2/e.blades;return{x:e.x+Math.cos(a)*47,y:e.y+Math.sin(a)*47};});
        if(blades.some(b=>guards.some(g=>Math.hypot(b.x-g.x,b.y-g.y)<25))){p.blades--;e.blades--;e.clash=0.3;blades=this.blades();}
      }
      if(e.hp>0&&!p.invincible&&Math.hypot(p.x-e.x,p.y-e.y)<e.radius+17){p.hp--;p.invincible=1.6;}
      if(e.hp<=0){this.kills++;this.combo++;this.comboClock=3;this.effects.push({x:e.x,y:e.y,text:'斩!',ttl:0.6,color:'#c5f277'});this.drops.push({x:e.x,y:e.y,value:e.elite?4:1,blade:e.elite});}
    }
    this.enemies=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<850);
    // 近距离吸附降低触控捡取负担，数量上限避免长局持续占用内存。
    this.drops=this.drops.filter(d=>{
      const distance=Math.hypot(d.x-p.x,d.y-p.y);
      if(distance<25){this.xp+=d.value;if(d.blade)p.blades=Math.min(p.maxBlades,p.blades+3);return false;}
      if(distance<150){d.x+=(p.x-d.x)/distance*360*dt;d.y+=(p.y-d.y)/distance*360*dt;}
      return distance<1000;
    }).slice(-180);
    this.effects=this.effects.slice(-40);
    if(p.hp<=0)this.status='lost';else if(this.time>=this.duration)this.status='won';else this.levelUp();
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports={World};else root.BladeWorld={World};
})(typeof globalThis!=='undefined'?globalThis:this);
