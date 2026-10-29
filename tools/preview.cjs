const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files={'/':'index.html','/index.html':'index.html','/game.js':'game.js','/src/world.js':'src/world.js','/src/audio.js':'src/audio.js','/assets/journey-characters.png':'assets/journey-characters.png','/assets/huaguo-ground.png':'assets/huaguo-ground.png'};
// 固定公开文件清单，避免预览服务暴露工作区和配置文件。
const server=http.createServer((req,res)=>{
 const key=req.url.split('?')[0];
 const sound=/^\/assets\/audio\/(start|hit|defeat|pickup|upgrade|choose|hurt|win|lose)\.wav$/.test(key);
 const file=Object.hasOwn(files,key)?files[key]:sound?key.slice(1):null;
 if(!file){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(path.join(root,file),(e,data)=>{if(e){res.writeHead(500);res.end('Read failed');return;}res.setHeader('Content-Type',file.endsWith('.wav')?'audio/wav':file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(data);});
});
server.on('error',e=>{console.error('预览启动失败：',e.message);process.exitCode=1;});
server.listen(4173,'127.0.0.1',()=>console.log('试玩地址：http://127.0.0.1:4173'));
