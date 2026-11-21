// Record exactly the live rendered viewport and its open navigation map at screen cadence.
export function walkRecorder(view) {
 if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return () => {};
 const button = document.createElement('button');
 button.textContent = 'הקלטת הליכה';
 document.querySelector('.ui').appendChild(button);
 let recorder,stream,buffer,ctx,previousURL,download,waitingForFrame=false;
 function paint() {
   if (!ctx) return;
   ctx.drawImage(view,0,0,buffer.width,buffer.height);
   const panel=document.getElementById('floor-plan');
   if(panel && !panel.hidden) {
     const map=panel.querySelector('canvas'),r=map.getBoundingClientRect();
     const sx=buffer.width/innerWidth, sy=buffer.height/innerHeight;
     ctx.fillStyle='#eeeae3';ctx.fillRect(r.x*sx-3,r.y*sy-3,r.width*sx+6,r.height*sy+6);
     ctx.drawImage(map,r.x*sx,r.y*sy,r.width*sx,r.height*sy);
   }
   if(waitingForFrame){waitingForFrame=false;recorder.start(500);button.disabled=false;}
 }
 button.onclick=()=>{
   if(recorder?.state==='recording') {recorder.stop();button.disabled=true;return;}
   if(download)download.remove();
   if(previousURL)URL.revokeObjectURL(previousURL);
   buffer=document.createElement('canvas');
   buffer.width=Math.round(view.clientWidth/2)*2;buffer.height=Math.round(view.clientHeight/2)*2;
   ctx=buffer.getContext('2d',{alpha:false});
   stream=buffer.captureStream(30);
   const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
   recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:10000000});
   const chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{
     stream.getTracks().forEach(track=>track.stop());
     const file=new Blob(chunks,{type:recorder.mimeType});
     previousURL=URL.createObjectURL(file);
     download=document.createElement('a');download.href=previousURL;
     download.download='salon-walk.'+(recorder.mimeType.includes('mp4')?'mp4':'webm');
     download.textContent='שמירת ההקלטה';download.style.cssText='pointer-events:auto;display:inline-flex;align-items:center;background:#fff;color:#21241f;padding:5px 14px;border-radius:100px;text-decoration:none;font:14px Arial';
     document.querySelector('.ui').appendChild(download);
     ctx=null;buffer=null;button.disabled=false;button.textContent='הקלטת הליכה';
   };
   waitingForFrame=true;button.disabled=true;button.textContent='סיום הקלטה';
 };
 return paint;
}
