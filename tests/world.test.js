const {test}=require('node:test');
const assert=require('node:assert/strict');
const {World}=require('../src/world.js');
const enemy=(x,y,extra={})=>({x,y,radius:15,hp:10,speed:0,elite:false,blades:0,hit:0,clash:0,...extra});
test('斜向速度归一化，卡顿限制步长',()=>{const w=new World(()=>0.5);w.update(10,{x:1,y:1});assert.ok(Math.abs(Math.hypot(w.player.x,w.player.y)-9)<1e-8);});
test('升级冻结时间，非法选择无效，正确选择生效',()=>{const w=new World(()=>0);w.xp=5;w.update(0.01);assert.equal(w.status,'upgrade');const time=w.time;w.update(1);assert.equal(w.time,time);w.choose(99);assert.equal(w.status,'upgrade');w.choose(0);assert.equal(w.player.maxBlades,9);assert.equal(w.status,'playing');});
test('实际刀刃命中才伤害，死亡掉落经验',()=>{const w=new World();w.spawnClock=100;w.enemies.push(enemy(65,0,{hp:1}));w.update(0);assert.equal(w.kills,1);assert.equal(w.drops.length,1);w.enemies.push(enemy(0,0));w.update(0);assert.equal(w.enemies[0].hp,10);});
test('精英碰刀双方扣刀，冷却阻止连续扣除',()=>{const w=new World();w.spawnClock=100;const e=enemy(112,0,{elite:true,blades:4,hp:100,radius:23});w.enemies.push(e);w.update(0);assert.equal(w.player.blades,5);assert.equal(e.blades,3);w.update(0);assert.equal(w.player.blades,5);});
test('接触伤害有无敌时间，死亡冻结',()=>{const w=new World();w.spawnClock=100;w.player.hp=2;w.enemies.push(enemy(0,0));w.update(0.01);w.update(0.01);assert.equal(w.player.hp,1);w.player.invincible=0;w.update(0.01);assert.equal(w.status,'lost');w.update(1);assert.equal(w.player.hp,0);});
test('补刀不超过上限，90秒首关胜利',()=>{const w=new World();w.spawnClock=100;w.regenClock=2;w.update(0);assert.equal(w.player.blades,6);w.time=89.99;w.update(0.02);assert.equal(w.status,'won');});

// 首关调优锁定可感知的体验目标，避免以后调数值又回到慢热开局。
test('开局六刀一击击败弱怪，获得击杀反馈',()=>{
 const w=new World(()=>0.5);w.spawnClock=100;
 w.enemies.push(enemy(w.player.radius,0,{hp:2}));w.update(0);
 assert.equal(w.player.blades,6);assert.equal(w.kills,1);
 assert.equal(w.combo,1);assert.ok(w.effects.length>0);
});
test('首分钟前无精英，升级必定补刀、增加上限并回血',()=>{
 const w=new World(()=>0);w.time=59;w.spawn();assert.equal(w.enemies[0].elite,false);
 w.player.hp=3;w.player.blades=1;w.xp=w.nextXp;w.levelUp();
 assert.equal(w.player.maxBlades,7);assert.equal(w.player.blades,7);assert.equal(w.player.hp,4);
});
test('满血时不提供回血选项，补刀不足一秒可恢复',()=>{
 const w=new World(()=>0.99);w.xp=w.nextXp;w.levelUp();
 assert.ok(w.choices.every(u=>u.key!=='heal'));w.choose(0);
 w.player.blades=0;w.regenClock=0.8;w.update(0);assert.equal(w.player.blades,1);
});

test('所有有限属性满级时，只展示剩余有效强化',()=>{
 const w=new World(()=>0);w.player.maxBlades=24;w.player.blades=24;w.player.radius=145;
 w.xp=w.nextXp;w.levelUp();assert.equal(w.choices.length,2);
 assert.ok(w.choices.every(Boolean));w.choose(0);assert.equal(w.status,'playing');
});
