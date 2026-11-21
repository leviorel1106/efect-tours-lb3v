// Route only in response to a visitor picking a floor location. Keyboard input cancels it.
export function roomNavigation(isWalkable,pose,move,stopOther,options={}){
 const bounds=options.textiles?{left:-14.5,right:14.5,near:-13,far:8}:{left:-5.9,right:10.9,near:.27,far:7.45};
 const step=.18,cols=Math.ceil((bounds.right-bounds.left)/step),rows=Math.ceil((bounds.far-bounds.near)/step);
 const world=i=>[bounds.left+(i%cols+.5)*step,bounds.near+(Math.floor(i/cols)+.5)*step];
 const id=(x,y)=>Math.max(0,Math.min(cols-1,Math.floor((x-bounds.left)/step)))+cols*Math.max(0,Math.min(rows-1,Math.floor((y-bounds.near)/step)));
 const grid=Array.from({length:cols*rows},(_,i)=>isWalkable(...world(i)));
 function clear(a,b){
   const d=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const steps=Math.ceil(d/.07);
   for(let k=0;k<=steps;k++){const t=steps?k/steps:0;if(!isWalkable(a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))return false;}
   return true;
 }
 function nearest(p){
   let best=-1,dist=Infinity;
   for(let i=0;i<grid.length;i++)if(grid[i]){
     const w=world(i),d=Math.hypot(w[0]-p[0],w[1]-p[1]);
     if(d<dist&&d<.42&&clear(p,w)){best=i;dist=d;}
   }
   return best;
 }
 function route(a,b){
   if(!isWalkable(...b))return [];
   if(clear(a,b))return [b];
   const start=nearest(a),end=nearest(b);if(start<0||end<0)return [];
   const prev=new Int32Array(grid.length).fill(-1),queue=[start];prev[start]=start;
   for(let k=0;k<queue.length&&prev[end]<0;k++){
     const i=queue[k],cx=i%cols,cy=Math.floor(i/cols);
     for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
       if(Math.abs(dx)+Math.abs(dy)===0||cx+dx<0||cx+dx>=cols||cy+dy<0||cy+dy>=rows)continue;
       const j=i+dx+dy*cols;
       if(grid[j]&&prev[j]<0&&clear(world(i),world(j))){prev[j]=i;queue.push(j);}
     }
   }
   if(prev[end]<0)return [];
   const path=[b];
   for(let i=end;i!==start;i=prev[i])path.unshift(world(i));
   path.unshift(world(start));const smooth=[];let p=a,k=0;
   while(k<path.length){
     let m=k;while(m+1<path.length&&clear(p,path[m+1]))m++;
     p=path[m];smooth.push(p);k=m+1;
   }
   return smooth;
 }
 const bar=document.querySelector('.ui');bar.querySelectorAll('button').forEach(b=>b.hidden=true);
 document.getElementById('fin').hidden=true;
 const btn=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;bar.append(b);return b;};
 const panel=document.createElement('section');panel.id='floor-plan';panel.hidden=true;
 panel.style.cssText='position:fixed;right:13px;top:62px;z-index:6;background:#eeeae3;color:#272822;padding:10px;border-radius:10px;box-shadow:0 4px 24px #0004;width:min(310px,80vw);font:13px Arial,sans-serif';
 panel.innerHTML='<div style="margin:0 0 6px">בחר מקום פנוי ברצפה</div><canvas aria-label="תכנית הסלון לבחירת יעד הליכה" width="600" height="300" style="height:auto;width:100%;cursor:crosshair;touch-action:none"></canvas>';
 document.body.append(panel);
 const map=btn(options.textiles?'מפת הווילה':'מפת הסלון',()=>{panel.hidden=!panel.hidden;map.setAttribute('aria-expanded',String(!panel.hidden));paint();});map.setAttribute('aria-expanded','false');
 map.setAttribute('aria-controls',panel.id);
 let explicitBack=null,follow=true,targetFurniture='sofa',orient=false;
 const gaze=btn('מבט אל הספה',()=>{follow=!follow;gaze.setAttribute('aria-pressed',String(follow));gaze.classList.toggle('on',follow);orient=!!options.textiles&&follow;});
 gaze.classList.add('on');gaze.setAttribute('aria-pressed','true');
 if(options.textiles){
   const target=btn('מבט אל הכורסאות',()=>{targetFurniture=targetFurniture==='sofa'?'chairs':'sofa';orient=true;follow=true;gaze.classList.add('on');gaze.setAttribute('aria-pressed','true');gaze.textContent=targetFurniture==='chairs'?'מיקוד בכורסאות':'מיקוד בספה';target.textContent=targetFurniture==='chairs'?'מבט אל הספה':'מבט אל הכורסאות';});
   const height=btn('התכופפות',()=>{const low=options.crouch();orient=follow;height.textContent=low?'עמידה':'התכופפות';height.setAttribute('aria-pressed',String(low));});
 }
 if(options.showReview!==false)btn('הקלטת הבדיקה',()=>{location.href='../../reviews/pages/'+(options.reviewPage || (options.textiles?'salon-textile-walk':'salon-woven-walk'))+'/index.html';});
 let waypoints=[],velocity=0;
 const cv=panel.querySelector('canvas'),g=cv.getContext('2d');
 if(options.textiles){cv.height=434;cv.setAttribute('aria-label','תכנית הווילה לבחירת יעד הליכה');}
 const {left,right,near,far}=bounds,X=x=>Math.round((x-left)*cv.width/(right-left)),Y=y=>Math.round((far-y)*cv.height/(far-near));
 function paint(){
   if(panel.hidden)return;
   g.fillStyle='#b1aaa0';g.fillRect(0,0,cv.width,cv.height);
   const w=Math.ceil(step*cv.width/(right-left))+1,h=Math.ceil(step*cv.height/(far-near))+1;
   g.fillStyle='#e1d9c9';
   grid.forEach((open,i)=>{if(open){const p=world(i);g.fillRect(X(p[0])-w/2,Y(p[1])-h/2,w,h);}});
   function rect(x,y,w,h,col){g.fillStyle=col;g.fillRect(X(x),Y(y+h),X(x+w)-X(x),Y(y)-Y(y+h));}
   const furniture=options.furnishingBounds?.() || [[-.34,4.16,4.02,5.32],[3.07,4.12,3.13,4.13],[.85,2.55,2.35,3.35]];
   furniture.forEach(([x0,x1,y0,y1],i)=>rect(x0,y0,x1-x0,y1-y0,i===furniture.length-1?'#a29077':'#837461'));
   rect(-3,7.51,9,.49,'#82786d');
   g.direction='rtl';g.fillStyle='#4e493e';g.font='18px Arial';g.textAlign='center';
   if(options.textiles){
     rect(-9.32,2.91,1.21,2.49,'#a29077');rect(-10.86,7.20,4.3,.7,'#82786d');
     rect(-11.90,-3.83,3.40,1.06,'#a29077');rect(-6,-12.3,18,4.4,'#99bcbf');
     g.fillText('מטבח',X(-8.7),Y(1.4));g.fillText('פרגולה',X(-10.4),Y(-5.35));g.fillText('בריכה',X(3),Y(-10.1));
     for(const [cx,cy,rot] of [[0,1.6,2.6],[1.8,1.2,3.3]]){
       g.save();g.translate(X(cx),Y(cy));g.rotate(-rot);g.fillStyle='#a08c73';g.beginPath();g.roundRect(-.45*cv.width/(right-left),-.45*cv.height/(far-near),.9*cv.width/(right-left),.9*cv.height/(far-near),3);g.fill();g.restore();
     }
     g.fillStyle='#4e493e';
   }
   g.fillText('ספה',X(1.7),Y(4.5));g.fillText('ויטרינה',X(1.5),Y(.15));
   const [x,y,yaw]=pose();g.strokeStyle='#527c71';g.lineWidth=3;g.beginPath();g.moveTo(X(x),Y(y));
   for(const [a,b] of waypoints)g.lineTo(X(a),Y(b));g.stroke();
   g.save();g.translate(X(x),Y(y));g.rotate(-yaw);g.fillStyle='#15584c';g.beginPath();g.moveTo(0,-10);g.lineTo(7,7);g.lineTo(0,4);g.lineTo(-7,7);g.closePath();g.fill();g.restore();
 }
 cv.onpointerdown=e=>{e.preventDefault();const r=cv.getBoundingClientRect();
   const b=[left+(e.clientX-r.left)/r.width*(right-left),far-(e.clientY-r.top)/r.height*(far-near)];
   walkTo(b);};
 function walkTo(b){const [x,y]=pose();const chosen=route([x,y],b);
   if(!chosen.length)return false;stopOther();waypoints=chosen;velocity=0;paint();return true;}
 function look(x,y,yaw,pitch,dt){
   if(explicitBack){
     const [a,b,h]=explicitBack,desired=Math.atan2(x-a,b-y);
     const tilt=Math.atan2(h-options.eye(),Math.hypot(a-x,b-y));
     return [yaw+Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw))*(1-Math.exp(-dt*4.3)),pitch+(tilt-pitch)*(1-Math.exp(-dt*4.6))];
   }
   const outside=options.textiles && (y<.2 || x< -6.05);
   if(outside){
     const [a,b]=x< -6.05 && y>.2?[-8.72,4.16]:x< -6?[-10.20,-3.3]:[-2.95,-5.6];
     const desired=Math.atan2(x-a,b-y);
     return [yaw+Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw))*(1-Math.exp(-dt*3.5)),pitch+(-.16-pitch)*(1-Math.exp(-dt*3.5))];
   }
   const chair=targetFurniture==='chairs';
   const d0=Math.hypot(x,y-1.6),d1=Math.hypot(x-1.8,y-1.2);
   let blend=Math.min(1,Math.max(0,.5+(d0-d1)/1.8));blend=blend*blend*(3-2*blend);
   const lx=(chair?1.8*blend:1.64)-x,ly=(chair?1.6-.4*blend:4.56)-y;
   const target=Math.atan2(-lx,ly);
   const next=yaw+Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw))*(1-Math.exp(-dt*4.3));
   const tilt=Math.atan2(options.textiles?(chair?.52:.72)-options.eye():-.69,Math.hypot(lx,ly));
   return [next,pitch+(tilt-pitch)*(1-Math.exp(-dt*4.6))];
 }
 function tick(dt){
   if(!waypoints.length){
     if(orient&&follow){const [x,y,a,b]=pose();const [heading,tilt]=look(x,y,a,b,dt);move(x,y,heading,tilt);}
     paint();return;
   }
   const [x,y,yaw,pitch]=pose(),[a,b]=waypoints[0],dx=a-x,dy=b-y,d=Math.hypot(dx,dy);
   velocity=Math.min(1.28,velocity+dt*1.8);
   const len=Math.min(d,dt*Math.min(velocity,waypoints.length===1?Math.max(.12,Math.sqrt(2*d*1.8)):1.28));
   const gx=x+dx*len/Math.max(d,.001),gy=y+dy*len/Math.max(d,.001);
   let heading=yaw,tilt=pitch;
   if(follow){
     [heading,tilt]=look(gx,gy,yaw,pitch,dt);
   }
   move(gx,gy,heading,tilt);if(len>=d-.0001)waypoints.shift();paint();
 }
 function cancel(){explicitBack=null;waypoints=[];velocity=0;orient=false;paint();}
 function rebuild(){for(let i=0;i<grid.length;i++)grid[i]=isWalkable(...world(i));cancel();}
 function behind(item){
   const views={sofa:[[2.88,6.48],[1.80,4.66,.69]],westChair:[[-.86,.45],[0,1.6,.53]],eastChair:[[1.85,-.71],[1.8,1.20,.56]]};
   const [goal,center]=views[item==='chairs'?'eastChair':item];
   if(walkTo(goal)){explicitBack=center;follow=true;orient=true;gaze.classList.add('on');gaze.setAttribute('aria-pressed','true');}
 }
 return {tick,cancel,walkTo,rebuild,behind};
}
