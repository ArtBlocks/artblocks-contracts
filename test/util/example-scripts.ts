export const SKULPTUUR_SCRIPT_APPROX =
  "S=Uint32Array.from([0,1,s=t=2,3].map(i=>parseInt(tokenData.hash.substr(i*8+5,8),16)));R=(a=1)=>a*(t=S[3],S[3]=S[2],S[2]=S[1],S[1]=s=S[0],t^=t<<11,S[0]^=(t^t>>>8)^(s>>>19),S[0]/2**32);({min,max,PI:P}=Math);T=P*2;L=(N,f)=>[...Array(N)].map((_,i)=>f(i));O=[[1,1],[2,1],[1,2],[2,2],[3,2],[2,3],[3,3],[2,4],[4,2],[4,3],[3,4],[4,4]];cf=[O.splice(R(12)|0,1)[0],O[R(11)|0]].map(x=>[...x,R(8)|0,R(3)|0]).sort();sh=R(2)|0;a=10/max(...cf.reduce(([a,b],[r,c])=>(e=max(r,c,1.5),[min(a,c/e),min(b,r/e)]),[9,9]));J=99;dg=`V q,o;`;ig='';cf.map(([r,c,s,h],i)=>{e=a/max(r,c,1.5);k=(i*sh-.08)*e/2;J=min(J,r*e-k);d=e*[1,.95,.85][h]/6;f=');min(max(q.x,';g='),0)+L(max(q,0))-';n=(a,b)=>s<5?`q=V(L(o.${a})-${d*2},abs(abs(o.${b})-${e/4})-${d*.7},0${f}q.y${g+d*.7}`:`;L(W(L(o.${a})-${t=d*2.3},o.${b}-M(o.${b},-${[t,t]})))-${d*.7}`;for([D,C]=[n('xz','y'),n('yz','x'),n('xy','z'),`;L(o)-${d*3}`,`q=abs(o)-V(${d*1.7+f}max(q.y,q.z)${g+d}`][s%5].split(';');h;h--)C=`abs(${C})-${h*e/40}`;dg+=`o=p+V(${f=[c*e/2,k]},0);o.xy/=${e};o.xy-=M(floor(o.xy${t=`)+1e-9,W(0),W(${[c,r]})-1)`}+.5;o.xy*=${e};${D};F b${i}=${C};`;ig+=`W i${i}=M(floor((o.xy+W(${f}))/${e+t};`});N=2**26;SC=0;H=v=>(SC=SC*41475523+v&N-1)/N;cf.flat().map(H);a1=P/2+R(P);a0=a1+P+R(2)-1;y=.05+R(.5);bh=.5+R();d1=`V(${[.15+R(.85)**4,.3+R(.7)**2]},1)*1.3`;d0=`V(1.3,${[.15+R(.3)**2,.05+R(.5)**4]})*1.3`;ww=`V(1)`;sb=0;k=R(36)|0;bi=k<15?2:1;k=k<27?k%15*6:15*k-315;cc=j=>`V(${L(3,i=>(parseInt('zbgrmgigxg4a727tlk114puydiugnt538mrwgysb7jsnz769uwzccfjhgzyxypg853zf4n75nszuleglvzgceglzg8zg4kbpyukpegzzzzg4kbpyukpeg00065abbixtj0gp369nnkkpuypbbeguuu265hbea5219c023ztk3szyn9zpn37beirnszzob000pppeilkd7xpbyoakd7'[i+j+k],36)/36)**2)})`;c0=cc(0);c1=cc(3);if(k>89){d0=cc(6);d1=cc(9);ww=cc(12);sb=1;bi-=k>209}bg=[`V b=mix(V(${[4-R(2),4,4+R(2)]})*${2**(-6-R(3))},V(${[7-R(2),7,7+R(2)]})*${2**(-3-R(3))},S(-.4,.5,g.y))`,`F y=g.y+.13*w(g*V(3,12,3))+.08*w(g*V(5,19,5));V b=mix(mix(.1*${c1},.7*${c0}+${d0}*16*pow(M(dot(g,N(V(J(${a0}),${bh},cos(${a0}))))*2-1,0,1),24)+${d1}*pow(M(dot(g,N(V(J(${a1}),${R(bh)},cos(${a1}))))*2-1,0,1),12),${sb?'P(0,y))':'M(.8*y+.2,0,1))*(1+y)'},${ww},S(.1,.09,abs(y)))`,`V b=mix(V(17,7.6,2)*S(1.67,1.69,dot(V(0,${[y,(1-y*y)**.5]})*${1.75-y*.1},g))+mix(${[c0,c1]},S(.7,0,g.y)),V(0),${R()<.5?`P(g.y+.1,.6*fract(5555*J(777*floor(g.x*16+${R(T)}+J(g.x*8+${R(T)})*2))))`:`S(.35,.25,g.y+.18*w(g*25)+.12*w(g*40)+${R(.4)-.2})`})`][bi];G=R(150)<1;V=_=>`V(${L(3,_=>R(T))})`;K=`#version 300 es`+`,S smoothstep,N normalize,L length,M clamp,P step,J sin,V vec3,W vec2,X vec4,F float`.replace(/,/g,`#define `);v=K+`precision highp F;in W u;out X c;uniform W r;uniform highp uint I,R;uniform sampler2D j,k;const V H3=V(.55,.67,.82);const F E=.001;`;D=document;C=D.querySelector('canvas');g=C.getContext('webgl2');as=1.2;h=min(innerWidth/as,innerHeight);w=as*h|0;h|=0;C.style.width=w+'px';C.style.height=h+'px';[E,F]=location.hash.substr(1).split(';');F||=(E=1,min(devicePixelRatio,2400/w));C.width=w=w*F|0;C.height=h=h*F|0;K+=`in W a;out W u;uniform uint I;void main(){`;O=K+`const F E=${E}.;F c=fract(F(I)/E/E)*E;F r=floor(c);c-=r;u=(a+W(c*E,r))*2./E`+(t=`-1.;gl_Position=X(u,0,1);}`);K+=`u=a*2.`+t;g.getExtension('EXT_color_buffer_float');cs=(y,c)=>(s=g.createShader(y),g.shaderSource(s,c),g.compileShader(s),s);g.bindVertexArray(g.createVertexArray());Q=[`F ds(V p){W d=W(L(p.xz),abs(p.y+16.25))-W(5.5+3*J(M(.3*p.y,${-T/4},0)),16);return min(max(d.x,d.y),0)+L(max(d,0))-.25;}F w(V p){return dot(J(p+2*J(p.yzx*H3+${V()})+${V()}),J(p.zyx+2*J(p.zxy*H3.yzx+${V()})+${V()}));}F D(V p){${dg}return min(ds(p),.7*(min(-.04,max(b0,b1))+L(max(W(b0,b1)+.04,W(0)))));}const V[] C=V[](V(.2),V(.8),V(.08,.1,.14),V(${G?[.8,.6,.3]:.75}),V(.7,.1,.1));uvec4 H=${t=`uvec4(2313257647u,2700274807u,3152041561u,3679390633u);`}void Q(uint v){H=(H^v)*${t}}void main(){uvec2 z=uvec2(gl_FragCoord.xy);Q(z.x);Q(z.y);Q(I);Q(R);const V cp=V(${[R(18)-9,.5+R()*R(2)*R(6),-8-J/2]}),la=V(0,${J/2},0),fw=N(la-cp),rg=N(cross(V(0,1,0),fw)),up=N(cross(fw,rg)),e=V(1,-1,0)*2e-4;const F fd=L(cp-la);V co=V(0);X d=X(H)/${2**32};d.z*=${T};V fc=V(1),go=V(cos(d.z),J(d.z),0)*sqrt(d.w)*.2,o=cp+go.x*rg+go.y*up,g=N(V((d.xy*3+u*r-1.5)/min(r.x,r.y),4));g.xy+=N(g*fd-go).xy;g=N(mat3(rg,up,fw)*g);F t=0;for(uint l=5u;l<9u;l+=1u){for(;t<99;){F h=D(g*t+o);if(h<E)break;t+=h;}if(t>=99){${bg};co+=fc*b;break;}else{Q(l);d=X(H)/${2**32};d.xyz=d.xyz*V(1,${T},2)+V(0,0,-1);o=g*t+o;${ig}F a=P(ds(o),E),b=1-a,f=fract(dot(X(i0,i1),X(${L(4,H)}))+${H(5)})*4;f=mix(f,f*6-21,P(3.5,f));uint m=${G?`3u`:`uint(f*b+b)`};V n=N(V(D(o+e.xzz)-D(o+e.yzz),D(o+e.zxz)-D(o+e.zyz),D(o+e.zzx)-D(o+e.zzy)));co+=fc*mix(V(0),V(.5,.7,.9)*4.,S(.22,.2,abs(L(o.xz)-4.5))*P(abs(o.y),E)*a)*a;F i=P(mix((m==2u)?.1:.02,1,pow(1+dot(g,n),5)),d.x);fc*=mix(V(1),C[m],i);W dr=mix(mix(W((m==2u)?.02:.1,1),W(1,0),i),W(0,1),(m==3u)?b:0);V n1=N(V(W(cos(d.y),J(d.y))*sqrt(-d.z*d.z+1),d.z)*dr.x+n),h=reflect(g,n1);g=mix(n1,h,dr.y*P(0,dot(n,h)));t=E/max(E,dot(g,n));}}c=texture(k,.5*u+.5)+X(co,1);}`,`void main(){c=texture(j,.5*u+.5);}`,`void main(){c=texture(k,.5*u+.5);V x=max(V(0),c.rgb/c.a);c=X(pow(M((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0,1),V(1/2.2))+fract(J(u*mat3x2(${L(6,R)})*999)*9999)/256,1);}`].map((s,i)=>{g.attachShader(p=g.createProgram(),cs(t=35632,v+s.replace(/([^a-zA-Z_0-9.])([0-9]+)(?![.0-9u])/g,'$1$2.').replace(/([0-9.]e-[0-9]+)./gi,'$1')));g.attachShader(p,cs(t+1,i<2?O:K));g.linkProgram(p);c=[...'rRIjk'].map(n=>g.getUniformLocation(p,n));a=g.getAttribLocation(p,'a');b=g.createBuffer();g.enableVertexAttribArray(a);g.bindBuffer(s=34962,b);g.bufferData(s,Float32Array.of(0,1,0,0,1,1,1,0),35044);g.vertexAttribPointer(a,2,t=5126,false,0,0);f=x=null;if(i<2){g.activeTexture(33984+i);x=g.createTexture();g.bindTexture(s=3553,x);g.texImage2D(s,0,34836,w,h,0,6408,t,null);L(4,i=>g.texParameteri(s,10240+i,i<2?9728:33071));f=g.createFramebuffer();g.bindFramebuffer(q=36160,f);g.framebufferTexture2D(q,q-96,s,x,0);g.clearColor(0,0,0,0);g.clear(4**7)};return{p,c,f}});g.viewport(0,0,w,h);I=0;A=25;B=A;E*=E;onkeyup=e=>{A=[Infinity,999,250,99,50,25,10,5][e.key]||A};f=_=>{(I%E==E-1||I<3*E?Q:Q.slice(0,2)).map(({p,c,f})=>{g.bindFramebuffer(q,f);g.useProgram(p);g.uniform2f(c[0],w,h);g.uniform1ui(c[1],(R(),s));g.uniform1ui(c[2],I);g.uniform1i(c[3],0);g.uniform1i(c[4],1);g.drawArrays(5,0,4)});g.flush();D.title=I++};(k=_=>setTimeout(k,1,++B>=A&&f(B=0)))('tx aaron dmitri amy ben thomas makio135 josh shvembldr genartclub ix iq')";

export const SQUIGGLE_SCRIPT = `let numHashes = tokenData.hashes.length;
let hashPairs = [];
for (let i = 0; i < numHashes; i++) {
for (let j = 0; j < 32; j++) {
hashPairs.push(tokenData.hashes[i].slice(2 + (j * 2), 4 + (j * 2)));
}
}
let decPairs = hashPairs.map(x => {
return parseInt(x, 16);
});
let seed = parseInt(tokenData.hashes[0].slice(0, 16), 16);
let color;
let backgroundIndex = 0;
let backgroundArray = [255, 225, 200, 175, 150, 125, 100, 75, 50, 25, 0, 25, 50, 75, 100, 125, 150, 175, 200, 225];
let index = 0;
let ht;
let wt = 2;
let speed = 1;
let segments;
let amp = 1;
let direction = 1;
let loops = false;
let startColor = decPairs[29];
let reverse = decPairs[30] < 128;
let slinky = decPairs[31] < 35;
let pipe = decPairs[22] < 32;
let bold = decPairs[23] < 15;
let segmented = decPairs[24] < 30;
let fuzzy = pipe && !slinky;
function setup() {
let portrait = windowWidth < windowHeight;
createCanvas(windowWidth > windowHeight * 3 / 2 ? windowHeight * 3 / 2 : windowWidth, windowWidth > windowHeight * 3 / 2 ? windowHeight : windowWidth * 2 / 3);
var el = document.getElementsByTagName("canvas")[0];
el.addEventListener("touchstart", mouseClicked, false);
colorMode(HSB, 255);
segments = map(decPairs[26], 0, 255, 12, 20);
ht = map(decPairs[27], 0, 255, 3, 4);
spread = decPairs[28] < 3 ? 0.5 : map(decPairs[28], 0, 255, 5, 50);
strokeWeight(height/1200);
}
function draw() {
color = 0;
background(backgroundArray[backgroundIndex]);
let div = Math.floor(map(Math.round(decPairs[24]), 0, 230, 3, 20));
let steps = slinky ? 50 : fuzzy ? 1000 : 200;
translate((width / 2) - (width / wt / 2), height / 2);
for (let j = 0; j < segments - 2; j++) {
for (let i = 0; i <= steps; i++) {
let t = i / steps;
let x = curvePoint(width / segments / wt * j, width / segments / wt * (j + 1), width / segments / wt * (j + 2), width / segments / wt * (j + 3), t);
let y = curvePoint(map(decPairs[j], 0, 255, -height / ht, height / ht) * amp, map(decPairs[j + 1], 0, 255, -height / ht, height / ht) * amp, map(decPairs[j + 2], 0, 255, -height / ht, height / ht) * amp, map(decPairs[j + 3], 0, 255, -height / ht, height / ht) * amp, t);
let hue = reverse ? 255 - (((color / spread) + startColor + index) % 255) : (((color / spread) + startColor) + index) % 255;
if (fuzzy) {
noStroke();
fill(hue, 255, 255, 20);
let fuzzX = x + map(rnd(), 0, 1, 0, height / 10);
let fuzzY = y + map(rnd(), 0, 1, 0, height / 10);
if (dist(x, y, fuzzX, fuzzY) < height / 11.5) {
circle(fuzzX, fuzzY, map(rnd(), 0, 1, height / 160, height / 16));
}
} else {
if (slinky && pipe) {
if (i == 0 || i == steps - 1) {
fill(0);
} else {
noFill();
}
stroke(0);
circle(x, y, (height / 7))
}
if (slinky) {
if (i == 0 || i == steps - 1) {
fill(hue, 255, 255);
} else {
noFill();
}
stroke(hue, 255, 255);
} else {
noStroke();
fill(hue, 255, 255);
}
circle(x, y, bold && !slinky ? height / 5 : height / 13);
if (segmented && !slinky && !bold) {
if (i % div === 0 || i == 0 || i == steps - 1) {
noStroke();
fill(decPairs[25]);
circle(x, y, height / 12);
}
}
}
color++;
}
seed = parseInt(tokenData.hashes[0].slice(0, 16), 16);
}
loops === true ? index = index + speed : index = index;
if (keyIsDown(UP_ARROW)) {
if (keyIsDown(SHIFT)) {
if (speed < 20) {
speed++;
} else {
speed = 20;
}
} else {
if (speed < 20) {
speed = speed + 0.1;
} else {
speed = 20;
}
}
} else if (keyIsDown(DOWN_ARROW)) {
if (keyIsDown(SHIFT)) {
if (speed > 1) {
speed--;
} else {
speed = 0.1;
}
} else {
if (speed > 0.1) {
speed = speed - 0.1;
} else {
speed = 0.1;
}
}
}
}
function keyPressed() {
if (keyCode === 32) {
if (backgroundIndex < backgroundArray.length - 1) {
backgroundIndex++;
} else {
backgroundIndex = 0;
}
}
}
function mouseClicked() {
if (loops === false) {
loops = true;
} else {
loops = false;
}
}
function rnd() {
seed ^= seed << 13;
seed ^= seed >> 17;
seed ^= seed << 5;
return (((seed < 0) ? ~seed + 1 : seed) % 1000) / 1000;
}`;

export const CONTRACT_SIZE_LIMIT_SCRIPT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Odio aenean sed adipiscing diam. Arcu cursus euismod quis viverra. Feugiat scelerisque varius morbi enim nunc faucibus a. Egestas maecenas pharetra convallis posuere morbi. Sit amet justo donec enim diam vulputate ut pharetra sit. Duis at consectetur lorem donec massa sapien faucibus. Iaculis eu non diam phasellus vestibulum lorem sed risus ultricies. Sed augue lacus viverra vitae congue. Nisl pretium fusce id velit. Purus faucibus ornare suspendisse sed nisi lacus sed viverra tellus. Nam aliquam sem et tortor consequat id porta. Semper viverra nam libero justo laoreet sit. Mi in nulla posuere sollicitudin aliquam ultrices sagittis orci a. Malesuada fames ac turpis egestas sed tempus. Mauris commodo quis imperdiet massa tincidunt nunc pulvinar. Nulla at volutpat diam ut venenatis tellus in.

Felis bibendum ut tristique et egestas quis. Dolor sit amet consectetur adipiscing elit duis tristique sollicitudin. Pellentesque pulvinar pellentesque habitant morbi tristique senectus et netus et. In dictum non consectetur a erat nam at. Aliquam nulla facilisi cras fermentum. Amet facilisis magna etiam tempor orci eu lobortis. Integer vitae justo eget magna fermentum iaculis eu non diam. Tempor orci dapibus ultrices in. Tincidunt eget nullam non nisi est sit amet facilisis magna. Sem viverra aliquet eget sit amet tellus cras. Neque volutpat ac tincidunt vitae semper quis lectus nulla. Quis ipsum suspendisse ultrices gravida dictum.

Risus commodo viverra maecenas accumsan lacus vel facilisis. Est placerat in egestas erat imperdiet sed euismod. Tincidunt vitae semper quis lectus nulla at. Eu consequat ac felis donec et odio pellentesque diam volutpat. Nam at lectus urna duis convallis convallis. Tempor orci eu lobortis elementum nibh tellus molestie. Nibh sit amet commodo nulla facilisi nullam. Lacus sed turpis tincidunt id aliquet risus feugiat in ante. Sed turpis tincidunt id aliquet risus. Ac auctor augue mauris augue neque gravida in. Et malesuada fames ac turpis egestas. Ut diam quam nulla porttitor massa id neque. Vel orci porta non pulvinar neque laoreet suspendisse interdum. Massa vitae tortor condimentum lacinia quis vel eros donec ac. Montes nascetur ridiculus mus mauris vitae. Morbi tincidunt ornare massa eget.

Vitae elementum curabitur vitae nunc. Est ullamcorper eget nulla facilisi etiam dignissim diam. Adipiscing enim eu turpis egestas pretium. Nulla porttitor massa id neque aliquam vestibulum morbi. Posuere sollicitudin aliquam ultrices sagittis orci a scelerisque. Elementum pulvinar etiam non quam. Lobortis scelerisque fermentum dui faucibus. Molestie at elementum eu facilisis sed. Ullamcorper eget nulla facilisi etiam dignissim diam quis enim. Faucibus pulvinar elementum integer enim neque. Nisl suscipit adipiscing bibendum est ultricies integer quis auctor elit.

Gravida cum sociis natoque penatibus. Nulla at volutpat diam ut. Id semper risus in hendrerit gravida rutrum quisque non. Bibendum at varius vel pharetra vel turpis. Est velit egestas dui id. Senectus et netus et malesuada fames ac turpis. Accumsan tortor posuere ac ut consequat semper. Cursus mattis molestie a iaculis at erat pellentesque adipiscing commodo. Varius morbi enim nunc faucibus a. Eget magna fermentum iaculis eu non diam. Placerat vestibulum lectus mauris ultrices eros. Orci a scelerisque purus semper eget duis at tellus at. Dictum varius duis at consectetur lorem. Sapien nec sagittis aliquam malesuada bibendum arcu vitae elementum curabitur. Et pharetra pharetra massa massa ultricies mi quis. Scelerisque viverra mauris in aliquam sem fringilla. Dictum varius duis at consectetur lorem. Purus gravida quis blandit turpis cursus in hac. Et malesuada fames ac turpis egestas. Eget mauris pharetra et ultrices.

Phasellus faucibus scelerisque eleifend donec pretium vulputate sapien nec sagittis. Fames ac turpis egestas sed tempus urna et. Adipiscing commodo elit at imperdiet dui accumsan. Volutpat ac tincidunt vitae semper quis lectus nulla at volutpat. Blandit libero volutpat sed cras ornare arcu dui. Egestas tellus rutrum tellus pellentesque eu tincidunt. Aliquam vestibulum morbi blandit cursus risus at ultrices mi tempus. Aliquam ut porttitor leo a. At imperdiet dui accumsan sit amet. Sed blandit libero volutpat sed cras ornare. Hendrerit gravida rutrum quisque non tellus orci ac auctor. Arcu risus quis varius quam. Nunc pulvinar sapien et ligula ullamcorper malesuada proin libero nunc. Risus feugiat in ante metus dictum at. Potenti nullam ac tortor vitae purus faucibus.

Arcu bibendum at varius vel pharetra. Eu tincidunt tortor aliquam nulla facilisi cras fermentum odio. Morbi tristique senectus et netus et. Vulputate mi sit amet mauris commodo quis imperdiet massa. Ac auctor augue mauris augue neque gravida in. Arcu bibendum at varius vel pharetra. Lobortis feugiat vivamus at augue eget arcu dictum varius duis. Tristique senectus et netus et malesuada fames. Vitae proin sagittis nisl rhoncus. Amet massa vitae tortor condimentum lacinia quis vel eros donec. Odio euismod lacinia at quis risus sed vulputate. Posuere urna nec tincidunt praesent semper feugiat nibh sed pulvinar. Non odio euismod lacinia at. Fusce id velit ut tortor. Metus vulputate eu scelerisque felis.

Posuere sollicitudin aliquam ultrices sagittis. Risus viverra adipiscing at in tellus integer. Pellentesque elit ullamcorper dignissim cras tincidunt. In hendrerit gravida rutrum quisque non tellus orci ac. Cras fermentum odio eu feugiat pretium nibh ipsum. Tincidunt augue interdum velit euismod in pellentesque massa placerat duis. Viverra aliquet eget sit amet tellus. Ut tortor pretium viverra suspendisse potenti nullam ac. In est ante in nibh. Sed viverra tellus in hac habitasse platea dictumst vestibulum rhoncus. Mattis ullamcorper velit sed ullamcorper. At consectetur lorem donec massa sapien faucibus et. Urna cursus eget nunc scelerisque viverra. Sagittis orci a scelerisque purus semper eget duis at. Quis commodo odio aenean sed adipiscing diam. Turpis egestas sed tempus urna et pharetra pharetra. Arcu felis bibendum ut tristique et egestas quis ipsum. Sapien pellentesque habitant morbi tristique senectus et.

Dolor sit amet consectetur adipiscing elit duis tristique sollicitudin. Dictum at tempor commodo ullamcorper a lacus vestibulum sed arcu. Velit scelerisque in dictum non consectetur. Eleifend donec pretium vulputate sapien nec. Tellus mauris a diam maecenas. Ornare quam viverra orci sagittis eu volutpat odio. Et pharetra pharetra massa massa ultricies mi quis hendrerit dolor. Facilisi morbi tempus iaculis urna id volutpat lacus laoreet. Bibendum est ultricies integer quis auctor. Tristique nulla aliquet enim tortor at auctor. Odio pellentesque diam volutpat commodo sed. Turpis nunc eget lorem dolor sed viverra ipsum. Adipiscing bibendum est ultricies integer quis auctor elit. Quis viverra nibh cras pulvinar mattis. Purus sit amet volutpat consequat. Molestie a iaculis at erat pellentesque adipiscing. In egestas erat imperdiet sed euismod nisi porta lorem mollis.

Ut pharetra sit amet aliquam. Arcu bibendum at varius vel pharetra vel turpis nunc eget. Est ullamcorper eget nulla facilisi. Mattis enim ut tellus elementum sagittis vitae et. Nam at lectus urna duis. Rhoncus urna neque viverra justo nec. Magnis dis parturient montes nascetur ridiculus mus. Massa ultricies mi quis hendrerit dolor magna eget est. Nascetur ridiculus mus mauris vitae ultricies leo. Etiam sit amet nisl purus in mollis. Magna ac placerat vestibulum lectus mauris ultrices eros in. Integer feugiat scelerisque varius morbi enim nunc faucibus. Quisque id diam vel quam elementum.

Sit amet tellus cras adipiscing enim eu. Tortor at auctor urna nunc id. Facilisis gravida neque convallis a cras semper auctor neque vitae. Elementum sagittis vitae et leo duis ut diam quam nulla. Vitae sapien pellentesque habitant morbi tristique. Sapien et ligula ullamcorper malesuada proin libero nunc. Vulputate eu scelerisque felis imperdiet proin fermentum leo vel orci. In pellentesque massa placerat duis ultricies lacus sed turpis tincidunt. Massa sapien faucibus et molestie ac feugiat sed. In pellentesque massa placerat duis ultricies lacus. Porttitor leo a diam sollicitudin tempor id eu nisl nunc. Dictum fusce ut placerat orci nulla pellentesque. Sed viverra tellus in hac habitasse platea. Varius morbi enim nunc faucibus a pellentesque. At risus viverra adipiscing at.

Id venenatis a condimentum vitae sapien pellentesque. Aliquet sagittis id consectetur purus ut. Sed elementum tempus egestas sed sed risus pretium quam. Dui vivamus arcu felis bibendum ut. Cursus turpis massa tincidunt dui ut ornare. Nunc eget lorem dolor sed viverra ipsum nunc aliquet. Integer eget aliquet nibh praesent tristique magna sit amet purus. Leo urna molestie at elementum eu facilisis sed odio morbi. Vulputate eu scelerisque felis imperdiet proin fermentum leo vel orci. Enim sit amet venenatis urna cursus eget. Eu turpis egestas pretium aenean pharetra. Proin libero nunc consequat interdum varius sit. Tortor consequat id porta nibh venenatis cras sed. Facilisis magna etiam tempor orci eu lobortis elementum. Leo vel orci porta non pulvinar neque laoreet suspendisse. Vestibulum lorem sed risus ultricies tristique nulla aliquet enim tortor. Vel risus commodo viverra maecenas accumsan lacus vel facilisis. Enim nulla aliquet porttitor lacus luctus accumsan tortor posuere. Pretium nibh ipsum consequat nisl vel pretium lectus quam id.

Orci porta non pulvinar neque laoreet. Bibendum enim facilisis gravida neque convallis a cras semper auctor. Proin nibh nisl condimentum id venenatis a condimentum vitae sapien. Euismod lacinia at quis risus sed vulputate odio ut enim. Auctor augue mauris augue neque. Orci dapibus ultrices in iaculis nunc sed augue lacus viverra. Et tortor at risus viverra adipiscing at in tellus. Eget nunc scelerisque viverra mauris in aliquam sem. Felis imperdiet proin fermentum leo vel. Mauris nunc congue nisi vitae suscipit tellus. Ultrices tincidunt arcu non sodales neque sodales ut. Eleifend mi in nulla posuere sollicitudin aliquam ultrices sagittis. Et leo duis ut diam. Id nibh tortor id aliquet lectus. Elementum facilisis leo vel fringilla est ullamcorper eget nulla facilisi.

Sed augue lacus viverra vitae. Euismod elementum nisi quis eleifend quam adipiscing vitae. Neque egestas congue quisque egestas diam in arcu. Eget nunc scelerisque viverra mauris in. Sem nulla pharetra diam sit amet. Iaculis nunc sed augue lacus viverra vitae congue eu consequat. Mattis molestie a iaculis at erat. Aliquet sagittis id consectetur purus ut faucibus pulvinar elementum. Aliquam malesuada bibendum arcu vitae elementum curabitur vitae nunc. Mi sit amet mauris commodo quis imperdiet massa tincidunt. Adipiscing elit pellentesque habitant morbi. Curabitur gravida arcu ac tortor. Nisi lacus sed viverra tellus in hac habitasse platea dictumst. Donec adipiscing tristique risus nec feugiat in fermentum. Lobortis feugiat vivamus at augue. Est sit amet facilisis magna etiam. Rhoncus est pellentesque elit ullamcorper dignissim. Tristique senectus et netus et malesuada fames ac turpis egestas. Id diam vel quam elementum pulvinar.

Tellus orci ac auctor augue. Ipsum consequat nisl vel pretium lectus. Quisque non tellus orci ac auctor augue mauris. Nibh tellus molestie nunc non blandit massa. Morbi tristique senectus et netus. Turpis massa tincidunt dui ut ornare lectus sit amet. Purus in massa tempor nec feugiat nisl. Euismod nisi porta lorem mollis. Tristique risus nec feugiat in. Nec nam aliquam sem et tortor consequat id porta nibh. Lectus quam id leo in vitae turpis massa sed. Nulla porttitor massa id neque aliquam vestibulum. Lobortis scelerisque fermentum dui faucibus in ornare quam viverra. Amet nisl suscipit adipiscing bibendum est ultricies integer. Posuere ac ut consequat semper viverra nam libero justo laoreet. Mattis vulputate enim nulla aliquet porttitor lacus luctus. Vestibulum rhoncus est pellentesque elit ullamcorper dignissim cras tincidunt. Nulla aliquet enim tortor at auctor urna nunc. Est velit egestas dui id ornare arcu odio ut. Eget felis eget nunc lobortis mattis aliquam.

Bibendum ut tristique et egestas quis. Habitant morbi tristique senectus et netus et malesuada fames ac. Urna nunc id cursus metus aliquam eleifend mi in. Urna nunc id cursus metus aliquam. Nisl pretium fusce id velit ut tortor. Sed viverra ipsum nunc aliquet bibendum enim facilisis. Vivamus arcu felis bibendum ut tristique et egestas. Tincidunt id aliquet risus feugiat in ante metus. Rhoncus mattis rhoncus urna neque viverra justo nec ultrices dui. Tempus urna et pharetra pharetra massa massa. Aliquam ut porttitor leo a diam. Id consectetur purus ut faucibus.

Vitae ultricies leo integer malesuada nunc vel risus commodo viverra. Donec ultrices tincidunt arcu non sodales neque sodales. Ac orci phasellus egestas tellus rutrum tellus pellentesque eu. Cras pulvinar mattis nunc sed blandit libero volutpat sed. Etiam non quam lacus suspendisse faucibus interdum. Habitasse platea dictumst vestibulum rhoncus est pellentesque. Libero nunc consequat interdum varius sit amet mattis. Odio euismod lacinia at quis risus sed vulputate. Mattis vulputate enim nulla aliquet porttitor lacus luctus accumsan tortor. Posuere morbi leo urna molestie at elementum eu. Rhoncus dolor purus non enim praesent elementum facilisis. Congue quisque egestas diam in arcu cursus euismod quis viverra. Leo urna molestie at elementum eu. Curabitur gravida arcu ac tortor dignissim convallis aenean et tortor. Sit amet facilisis magna etiam. Orci ac auctor augue mauris augue neque gravida. Leo integer malesuada nunc vel risus commodo. Vulputate eu scelerisque felis imperdiet proin. Augue lacus viverra vitae congue eu consequat.

Cursus sit amet dictum sit amet justo donec enim. Cursus euismod quis viverra nibh. Scelerisque felis imperdiet proin fermentum. Platea dictumst vestibulum rhoncus est pellentesque. Commodo ullamcorper a lacus vestibulum sed arcu non odio euismod. Ac tortor dignissim convallis aenean et. Aliquet nec ullamcorper sit amet risus nullam eget felis eget. Integer eget aliquet nibh praesent tristique magna sit. Sagittis nisl rhoncus mattis rhoncus urna neque viverra justo nec. Viverra aliquet eget sit amet tellus cras. Feugiat pretium nibh ipsum consequat nisl vel. Aliquet lectus proin nibh nisl condimentum.

Nec sagittis aliquam malesuada bibendum. Viverra suspendisse potenti nullam ac tortor vitae. Hendrerit gravida rutrum quisque non tellus orci. Et magnis dis parturient montes nascetur ridiculus mus. Quam elementum pulvinar etiam non quam lacus suspendisse faucibus. Viverra aliquet eget sit amet tellus cras adipiscing enim eu. Ac ut consequat semper viverra nam. Sed vulputate odio ut enim blandit volutpat. Egestas sed sed risus pretium. Et malesuada fames ac turpis. Nisl rhoncus mattis rhoncus urna neque viverra justo nec. Eu scelerisque felis imperdiet proin fermentum leo vel orci porta. Aenean sed adipiscing diam donec adipiscing tristique risus nec.

Vulputate sapien nec sagittis aliquam malesuada bibendum arcu vitae elementum. Libero nunc consequat interdum varius sit. Fames ac turpis egestas integer eget aliquet nibh. Ullamcorper morbi tincidunt ornare massa eget egestas purus viverra. Arcu ac tortor dignissim convallis. Eget nunc scelerisque viverra mauris in aliquam. Interdum posuere lorem ipsum dolor sit. Vitae tempus quam pellentesque nec nam aliquam sem et. Sagittis orci a scelerisque purus semper eget duis at tellus. Bibendum arcu vitae elementum curabitur vitae. Sed adipiscing diam donec adipiscing. Diam ut venenatis tellus in metus vulputate eu scelerisque. Nec ullamcorper sit amet risus nullam eget felis. Orci sagittis eu volutpat odio facilisis mauris sit amet massa.

Volutpat consequat mauris nunc congue nisi vitae. Ultrices in iaculis nunc sed augue lacus viverra. Diam quam nulla porttitor massa id neque aliquam vestibulum morbi. A cras semper auctor neque vitae tempus quam pellentesque. Nunc lobortis mattis aliquam faucibus purus in. Ullamcorper dignissim cras tincidunt lobortis feugiat. Laoreet suspendisse interdum consectetur libero. Sit amet justo donec enim diam vulputate ut. A erat nam at lectus urna duis convallis. Donec pretium vulputate sapien nec sagittis. Neque sodales ut etiam sit amet nisl purus in. A diam maecenas sed enim ut. Felis eget velit aliquet sagittis id consectetur purus ut. Id diam vel quam elementum pulvinar. Leo integer malesuada nunc vel risus commodo.

Urna duis convallis convallis tellus id interdum. Consectetur a erat nam at lectus urna duis. Volutpat commodo sed egestas egestas fringilla phasellus. Maecenas pharetra convallis posuere morbi leo. Risus commodo viverra maecenas accumsan lacus vel facilisis volutpat est. Adipiscing enim eu turpis egestas pretium aenean pharetra. Faucibus interdum posuere lorem ipsum dolor sit. Diam quis enim lobortis scelerisque fermentum. Eget egestas purus viverra accumsan in nisl nisi. Rhoncus dolor purus non enim praesent elementum facilisis. Sed egestas egestas fringilla phasellus. Sit amet luctus venenatis lectus.

Vitae aliquet nec ullamcorper sit amet. Nibh praesent tristique magna sit amet purus gravida. Mi sit amet mauris commodo quis. Fusce id velit ut tortor pretium viverra suspendisse potenti nullam. Lectus proin nibh nisl condimentum id venenatis a condimentum vitae. Duis at tellus at urna condimentum mattis pellentesque id. A arcu cursus vitae congue. Commodo nulla facilisi nullam vehicula. Justo laoreet sit amet cursus sit. Duis convallis convallis tellus id interdum.

Maecenas pharetra convallis posuere morbi leo urna molestie at elementum. Egestas congue quisque egestas diam in arcu cursus. Purus viverra accumsan in nisl nisi scelerisque. Sapien et ligula ullamcorper malesuada proin. Facilisis magna etiam tempor orci eu lobortis. Congue eu consequat ac felis donec. Faucibus et molestie ac feugiat sed lectus vestibulum mattis. Augue ut lectus arcu bibendum at varius vel pharetra. Condimentum mattis pellentesque id nibh. Luctus accumsan tortor posuere ac ut consequat. Pharetra pharetra massa massa ultricies mi. Euismod in pellentesque massa placerat duis ultricies lacus. Platea dictumst quisque sagittis purus sit amet volutpat. Nec tincidunt praesent semper feugiat nibh. Feugiat in fermentum posuere urna nec.

Nisl tincidunt eget nullam non nisi est sit amet. Feugiat nibh sed pulvinar proin gravida hendrerit. Iaculis nunc sed augue lacus viverra vitae. Sed adipiscing diam donec adipiscing tristique risus nec feugiat in. Elit scelerisque mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus. Sit amet aliquam id diam maecenas. Mattis aliquam faucibus purus in. Scelerisque eu ultrices vitae auctor eu. Sapien pellentesque habitant morbi tristique senectus et netus. Faucibus ornare suspendisse sed nisi. Quis auctor elit sed vulputate mi.

Habitant morbi tristique senectus et netus et. Faucibus nisl tincidunt eget nullam. Sed pulvinar proin gravida hendrerit. Montes nascetur ridiculus mus mauris. Consectetur adipiscing elit duis tristique. Et pharetra pharetra massa massa. Laoreet id donec ultrices tincidunt arcu non sodales neque. Mauris augue neque gravida in fermentum et sollicitudin ac. Neque viverra justo nec ultrices dui. Ultrices vitae auctor eu augue ut. Egestas dui id ornare arcu odio ut.

Id interdum velit laoreet id donec ultrices tincidunt arcu non. Pharetra convallis posuere morbi leo urna molestie at elementum. Quis eleifend quam adipiscing vitae proin sagittis nisl. Mi quis hendrerit dolor magna eget. Venenatis cras sed felis eget velit aliquet. Amet consectetur adipiscing elit ut. Ut enim blandit volutpat maecenas. Mi in nulla posuere sollicitudin aliquam ultrices sagittis orci a. Volutpat blandit aliquam etiam erat velit scelerisque in. Orci phasellus egestas tellus rutrum tellus pellentesque. Et leo duis ut diam. Mi tempus imperdiet nulla malesuada. Aliquam sem fringilla ut morbi. Semper feugiat nibh sed pulvinar proin. Ipsum nunc aliquet bibendum enim facilisis. Leo in vitae turpis massa sed elementum.

Tincidunt dui ut ornare lectus sit amet est placerat. Cras sed felis eget velit. Volutpat ac tincidunt vitae semper quis lectus. Consectetur lorem donec massa sapien faucibus et molestie ac. Risus in hendrerit gravida rutrum quisque non. Neque laoreet suspendisse interdum consectetur. Sed risus pretium quam vulputate dignissim suspendisse in est. Neque sodales ut etiam sit amet nisl purus in. Mauris nunc congue nisi vitae suscipit tellus mauris a. At urna condimentum mattis pellentesque. Quis auctor elit sed vulputate mi sit amet. Nisl nisi scelerisque eu ultrices vitae. Suspendisse faucibus interdum posuere lorem ipsum dolor. In metus vulputate eu scelerisque felis imperdiet proin.

Aliquam id diam maecenas ultricies mi. Diam phasellus vestibulum lorem sed risus. A erat nam at lectus. Id aliquet lectus proin nibh nisl condimentum. Euismod lacinia at quis risus sed vulputate odio. Vitae nunc sed velit dignissim sodales. Cursus vitae congue mauris rhoncus. Felis eget nunc lobortis mattis aliquam faucibus. Elit ullamcorper dignissim cras tincidunt lobortis feugiat vivamus at augue. Dictum varius duis at consectetur lorem donec. Amet nisl suscipit adipiscing bibendum est ultricies integer quis auctor. Leo vel orci porta non pulvinar neque laoreet suspendisse.

Donec et odio pellentesque diam volutpat commodo sed egestas egestas. Faucibus turpis in eu mi bibendum neque egestas congue. Aliquam purus sit amet luctus venenatis lectus magna. Mi quis hendrerit dolor magna eget est lorem. Sed egestas egestas fringilla phasellus faucibus scelerisque eleifend. Non blandit massa enim nec dui nunc mattis. Magna etiam tempor orci eu lobortis elementum. Maecenas volutpat blandit aliquam etiam. Nulla facilisi etiam dignissim diam quis enim. Vel facilisis volutpat est velit egestas.

Sit amet tellus cras adipiscing enim eu turpis. Malesuada proin libero nunc consequat interdum. Sem integer vitae justo eget magna. Tortor dignissim convallis aenean et tortor at risus. Iaculis eu non diam phasellus vestibulum lorem. Sagittis vitae et leo duis ut. Eleifend quam adipiscing vitae proin sagittis nisl rhoncus mattis rhoncus. In ante metus dictum at tempor. Id faucibus nisl tincidunt eget nullam non nisi est sit. Purus gravida quis blandit turpis cursus in hac habitasse. Suspendisse faucibus interdum posuere lorem ipsum. Mauris ultrices eros in cursus turpis massa.

Egestas purus viverra accumsan in nisl nisi scelerisque eu. In nulla posuere sollicitudin aliquam. Id cursus metus aliquam eleifend mi in. Rhoncus est pellentesque elit ullamcorper dignissim cras tincidunt lobortis feugiat. Massa ultricies mi quis hendrerit dolor magna eget est lorem. Arcu dui vivamus arcu felis bibendum ut tristique et egestas. At urna condimentum mattis pellentesque. Sed augue lacus viverra vitae congue eu consequat. Iaculis at erat pellentesque adipiscing commodo elit at. Leo in vitae turpis massa sed elementum. Sed lectus vestibulum mattis ullamcorper velit sed ullamcorper morbi. Orci porta non pulvinar neque laoreet suspendisse. Arcu vitae elementum curabitur vitae nunc sed. Purus sit amet volutpat consequat mauris nunc congue nisi vitae. Scelerisque varius morbi enim nunc. Pharetra sit amet aliquam id diam maecenas ultricies. Vitae justo eget magna fermentum iaculis. Dolor sed viverra ipsum nunc aliquet bibendum enim. Metus dictum at tempor commodo ullamcorper a lacus vestibulum. Integer malesuada nunc vel risus commodo viverra.

Commodo quis imperdiet massa tincidunt nunc pulvinar sapien. Ac auctor augue mauris augue. Fringilla est ullamcorper eget nulla. Nunc congue nisi vitae suscipit tellus mauris a diam maecenas. Amet facilisis magna etiam tempor orci eu lobortis elementum nibh. Congue quisque egestas diam in arcu cursus. Varius sit amet mattis vulputate. Elit eget gravida cum sociis natoque. In hac habitasse platea dictumst. In eu mi bibendum neque egestas congue quisque egestas. Vitae auctor eu augue ut lectus arcu bibendum at varius. Commodo odio aenean sed adipiscing diam donec adipiscing tristique risus.

Commodo quis imperdiet massa tincidunt nunc pulvinar sapien. Ac auctor augue mauris augue. Fringilla est ullamcorper eget nulla.`;

export const MULTI_BYTE_UTF_EIGHT_SCRIPT = `
ɶɱ,ɮʓ<.>/?~ʶ𝘈0!@#$%^&*()-_=+[{]};:'Ɍ𝓢ȚЦ𝒱Ѡ𝓧Ƴ𝕵ꓗʟ𝙼ℕ০𝚸𝗤Հꓫ𝚈ʶ𝚭𝜶Ꮟçძ𝑒𝖿𝗀ḧ𝗂𝐣ҝɭḿ𝕟𝐨𝝔-_=+[{𝙱ƇᗞΣℱԍҤ١𝔍К𝓛𝓜ƝȎ𝚸𝑄Ṛ𝓢ṮṺƲᏔ.𝕢ṛ𝓼тú𝔳ẃ⤬𝝲𝗓1]};:'",<ꓢṰǓⅤ𝔚Ȥѧᖯć𝗱ễ𝑓𝙜Ⴙ𝞲𝑗𝒌ļṃŉо𝞎𝒒ᵲꜱ𝙩ừḆ𝖢𝕯٤ḞԍНǏ𝙅ƘԸⲘ𝙉০Ρ𝗤ăѣ𝔠ծềſģȟᎥ𝒋ǩľḿꞑȯ𝘱𝑞𝗋𝘴ȶ𝞄𝜈ψ𝒙𝘆𝚣123456789𝗏ŵ𝒙𝒚ź1234567890!@#$%^&*()-_=+[{]};:'",<.>/?~АḂⲤ𝗗𝖤𝗙ꞠꓧȊ𝐉𝜥ꓡ𝑀𝑵Ǭ𝙿𝑄Ŗ𝑆𝒯𝖴𝘝𝘞ꓫŸ𝜡ả𝘢ƀ𝖼ḋếᵮℊ𝙝Ꭵ𝕛кιṃդⱺ𝓅𝘲𝕣𝖘ŧ𝑢ṽẉ𝘅ყž1234567890!@#$%^&*()-_=+[{]};:'",<.>/?~Ѧ234567890!@#$%^&*()>/?~𝖠Β𝒞𝘋𝙴𝓕ĢȞỈⲬ𝑌𝙕𝘢𝕤
`;
