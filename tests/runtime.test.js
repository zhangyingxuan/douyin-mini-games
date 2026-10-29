const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {World}=require('../src/world.js');
const {SoundBank}=require('../src/audio.js');
// 用平台边界替身检查完整入口；不能代替抖音真机测试。
test('抖音入口可以开始、暂停、升级、结算和重开',()=>{
 const labels=[],events={},images=[];let next,current;
 class TestWorld extends World { constructor(){super();current=this;} }
 const drawing=new Proxy({fillText:s=>labels.push(String(s)),drawImage:(...args)=>images.push(args)},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 const runtime={GameGlobal:{},console,require:path=>path.includes('audio')?{SoundBank}:{World:TestWorld},requestAnimationFrame:fn=>{next=fn;},tt:{
  createImage:()=>{let load;return {width:1280,height:1280,addEventListener:(name,fn)=>{if(name==='load')load=fn;},set src(value){assert.ok(['assets/journey-characters.png','assets/huaguo-ground.png'].includes(value));load();}};},
  createInnerAudioContext:()=>({stop(){},play(){},onPlay(){},onError(){}}),
  createCanvas:()=>({getContext:()=>drawing}),getSystemInfoSync:()=>({windowWidth:390,windowHeight:844,pixelRatio:2}),
  getStorageSync:()=>0,setStorageSync:()=>{},
  onTouchStart:fn=>events.start=fn,onTouchMove:fn=>events.move=fn,onTouchEnd:fn=>events.end=fn,
  onTouchCancel:fn=>events.cancel=fn,onHide:fn=>events.hide=fn,onShow:fn=>events.show=fn
 }};
 vm.runInNewContext(fs.readFileSync('game.js','utf8'),runtime);
 let clock=100; const frame=()=>{labels.length=0;next(clock);clock+=16;};
 const tap=(x,y)=>events.start({changedTouches:[{clientX:x,clientY:y,identifier:1}]});
 frame();assert.ok(labels.includes('别惹'));assert.ok(images.length>0);assert.equal(images[0][3],640);assert.equal(runtime.GameGlobal.__bladeState().atlasReady,true);tap(195,530);frame();assert.ok(labels.includes('别惹我的刀'));
 tap(70,790);frame();assert.equal(runtime.GameGlobal.__bladeState().muted,true);
 tap(70,790);frame();assert.equal(runtime.GameGlobal.__bladeState().muted,false);
 events.hide();frame();assert.ok(labels.includes('歇一口气'));tap(195,445);frame();assert.ok(!labels.includes('歇一口气'));
 // 通过真实输入推动战斗，检查渲染循环和触摸生命周期没有运行时错误。
 events.start({changedTouches:[{clientX:100,clientY:600,identifier:2}]});
 events.move({changedTouches:[{clientX:140,clientY:620,identifier:2}]});
 for(let i=0;i<60;i++)frame();
 events.end({changedTouches:[{identifier:2}]});assert.ok(labels.includes('别惹我的刀'));
 current.xp=current.nextXp;frame();assert.ok(labels.includes('神通精进'));assert.ok(labels.includes('点击任意神通卡，继续降妖'));assert.ok(images.some(args=>args.length===5));
 tap(195,365);frame();assert.equal(current.status,'playing');
 current.player.maxBlades=24;current.player.blades=24;current.player.radius=145;current.player.hp=current.player.maxHp;
 current.xp=current.nextXp;frame();assert.equal(current.choices.length,2);
 tap(195,380);frame();assert.equal(current.status,'playing');
 current.player.hp=0;frame();assert.ok(labels.includes('刀可再转，江湖再见'));
 tap(195,500);frame();assert.equal(current.status,'playing');assert.equal(current.player.hp,7);
 current.time=90;frame();assert.ok(labels.includes('这一圈，你赢了'));
});

// IDE 会扫描项目内脚本，必须让元数据混入时在本地检查阶段就失败。
test('项目所有 JavaScript 文件都可解析',()=>{
 const path=require('node:path');
 function check(dir){
  for(const file of fs.readdirSync(dir,{withFileTypes:true})){
   const full=path.join(dir,file.name);
   if(file.isDirectory()){if(file.name!=='node_modules')check(full);}
   else if(file.name.endsWith('.js'))new vm.Script(fs.readFileSync(full,'utf8'),{filename:full});
  }
 }
 check('.');
});
