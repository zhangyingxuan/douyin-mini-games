(function(root){
'use strict';
const cues={start:[0.24,4],hit:[0.08,1],defeat:[0.12,2],pickup:[0.10,1],upgrade:[0.55,5],choose:[0.18,5],hurt:[0.18,4],win:[0.9,6],lose:[0.65,6]};
// 共用一个声道，限制高频音效，重要提示不会被连续命中打断。
class SoundBank{
 constructor(platform=null){
  this.platform=platform;this.audio=null;this.unlocked=false;this.muted=false;this.until=0;this.priority=0;this.last={};this.lastCue=null;
  try{const value=platform?platform.getStorageSync('blade-muted'):localStorage.getItem('blade-muted');this.muted=value===true||value==='true';}catch(e){console.warn('音效设置读取失败',e);}
 }
 unlock(){this.unlocked=true;}
 stop(){
  this.until=0;this.priority=0;
  if(!this.audio)return;
  try{if(this.platform)this.audio.stop();else{this.audio.pause();this.audio.currentTime=0;}}catch(e){console.warn('音效停止失败',e);}
 }
 toggle(){
  this.muted=!this.muted;if(this.muted)this.stop();
  try{if(this.platform)this.platform.setStorageSync('blade-muted',this.muted);else localStorage.setItem('blade-muted',String(this.muted));}catch(e){console.warn('音效设置保存失败',e);}
 }
 play(name){
  const cue=cues[name],now=Date.now();
  if(!cue||!this.unlocked||this.muted)return;
  if((now<this.until&&cue[1]<this.priority)||now-(this.last[name]??-Infinity)<(cue[1]<=2?140:80))return;
  try{
   if(!this.audio){
    this.audio=this.platform?this.platform.createInnerAudioContext():new Audio();
    this.audio.volume=0.4;
    if(this.platform){this.audio.obeyMuteSwitch=true;this.audio.onPlay(()=>{if(this.lastCue&&cues[this.lastCue][1]>=4)console.info('blade:audio playing',this.lastCue);});this.audio.onError(e=>{this.until=0;console.warn('blade:audio error',e);});}
    else this.audio.addEventListener('error',()=>{this.until=0;console.warn('blade:audio load failed');});
   }
   this.stop();
   // 原生 stop 后重新设置 src，兼容平台要求；不在后台预排声音。
   this.audio.src='assets/audio/'+name+'.wav';
   const result=this.audio.play();
   if(result&&typeof result.catch==='function')result.catch(e=>{this.until=0;console.warn('音效播放未获准',e);});
   this.until=now+cue[0]*1000;this.priority=cue[1];this.last[name]=now;this.lastCue=name;
   if(cue[1]>=4)console.info('blade:audio',name);
  }catch(e){this.until=0;console.warn('音效不可用，继续游戏',e);}
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={SoundBank};else root.BladeAudio={SoundBank};
})(typeof globalThis!=='undefined'?globalThis:this);
