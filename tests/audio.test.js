const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {SoundBank}=require('../src/audio.js');
function fixture(){const played=[],saved=[];let errors;const bank=new SoundBank({getStorageSync:()=>false,setStorageSync:(...v)=>saved.push(v),createInnerAudioContext:()=>({stop(){},onPlay(){},play(){played.push(this.src);},onError(fn){errors=fn;}})});return{bank,played,saved,error:()=>errors};}
test('首次触摸前不播放，解锁后复用声道并让升级优先于命中',()=>{const {bank,played}=fixture();bank.play('hit');assert.equal(played.length,0);bank.unlock();bank.play('hit');bank.play('hit');assert.equal(played.length,1);bank.play('upgrade');bank.play('hit');assert.equal(played.length,2);assert.ok(played[1].endsWith('upgrade.wav'));});
test('静音停止播放并保存设置，停止后不阻断下一次操作',()=>{const {bank,played,saved}=fixture();bank.unlock();bank.play('start');bank.toggle();bank.play('win');assert.equal(played.length,1);assert.equal(saved[0][1],true);bank.toggle();bank.play('win');assert.equal(played.length,2);bank.stop();assert.equal(bank.until,0);});
test('平台播放失败不能让战斗崩溃',()=>{const bank=new SoundBank({getStorageSync:()=>false,createInnerAudioContext:()=>{throw Error('unavailable');}});bank.unlock();assert.doesNotThrow(()=>bank.play('hit'));});
// 检查实际交付的波形，避免音量削波、空文件或过长的突兀音效。
test('九个音效均为短时单声道PCM，峰值受控且无直流偏移',()=>{for(const name of ['start','hit','defeat','pickup','upgrade','choose','hurt','win','lose']){const data=fs.readFileSync('assets/audio/'+name+'.wav');assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.readUInt16LE(22),1);assert.equal(data.readUInt16LE(34),16);const samples=[];for(let i=44;i<data.length;i+=2)samples.push(data.readInt16LE(i));assert.ok(samples.length>1000);assert.ok(samples.length/22050<=1);assert.ok(Math.max(...samples.map(Math.abs))<12000);assert.ok(Math.abs(samples.reduce((a,b)=>a+b,0)/samples.length)<150);}});
