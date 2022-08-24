export const ONE_MINUTE = 60;
export const ONE_HOUR = ONE_MINUTE * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const FOUR_WEEKS = ONE_DAY * 7 * 4;

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
