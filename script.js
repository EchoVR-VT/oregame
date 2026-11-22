/* ===== Game core: catalog, sounds, save data, cards, packs, duel engine, rendering ===== */
/* ---------- Ore catalog ---------- */
const catalog=[
 ['Celestial Crystal',128,'Legendary','CC','#f7d98b','#9c72d1','#45305e',34,75],
 ['Amethyst Ore',246,'Epic','AM','#e1a5ff','#9b58c8','#48245f',28,64],
 ['Sapphire Ore',391,'Rare','SA','#a4e2ff','#397acb','#1d3b75',23,55],
 ['Voidstone',512,'Epic','VS','#c5a4e8','#59417c','#211b36',30,68],
 ['Emerald Ore',704,'Rare','EM','#a9ffc1','#35a96d','#145638',24,57],
 ['Coal Ore',888,'Common','C','#b9c0c9','#606875','#282d35',14,42],
 ['Dragonstone',1024,'Legendary','DR','#ffb1a0','#c64e40','#69251f',36,80],
 ['Iron Ore',1337,'Common','FE','#d9dce0','#9299a3','#4c535d',16,46],
 ['Ruby Ore',1666,'Epic','RB','#ffb0bd','#c83d63','#641b36',29,66],
 ['Lunar Crystal',2048,'Rare','LU','#e7e7ff','#898fc9','#3d477e',25,59],
 ['Copper Ore',2500,'Common','CU','#f2c39a','#b87545','#663d27',15,44],
 ['Divine Diamond',3000,'Legendary','DD','#efffff','#8dc9d1','#477d91',38,85],
 ['Tin Ore',3500,'Common','SN','#e3e6ea','#a7adb5','#5b6169',13,40],
 ['Lead Ore',3800,'Common','PB','#c9cfdc','#6f7a90','#323a4c',15,45],
 ['Quartz',4100,'Common','QZ','#fbfbff','#cfd3e0','#7a8196',14,43],
 ['Limestone',4400,'Common','LS','#ece6d6','#bfb59a','#6d6551',13,47],
 ['Sulfur',4700,'Common','S','#fff6a0','#e0c93a','#8b7a12',16,40],
 ['Topaz Ore',5000,'Rare','TZ','#ffe3a0','#f0a830','#8a5410',24,56],
 ['Aquamarine',5300,'Rare','AQ','#c8fff4','#43c9b4','#1a6e63',23,58],
 ['Jade Ore',5600,'Rare','JD','#c4ffd8','#4aa86c','#1d5a38',25,55],
 ['Obsidian',5900,'Rare','OB','#9a8fb5','#3a3150','#120e1c',26,54],
 ['Opal Ore',6200,'Epic','OP','#fff0ff','#d98fe0','#6b3f8a',29,65],
 ['Moonstone',6500,'Epic','MS','#e8f2ff','#8fb0e8','#3b4f86',28,67],
 ['Bloodstone',6800,'Epic','BS','#ffb3b3','#a8232f','#4d0d14',31,63],
 ['Starfall Ore',7100,'Legendary','SF','#fffbd1','#ffd34d','#a8651a',37,78],
 ['Eclipse Shard',7400,'Legendary','EC','#d2c4ff','#4c2a9b','#0f0830',39,82],
 ['Phoenix Ember',7700,'Legendary','PX','#ffd9a0','#ff6a2a','#7a1b08',40,76]
].map((x,i)=>({id:i,name:x[0],rank:x[1],rarity:x[2],symbol:x[3],light:x[4],ore:x[5],dark:x[6],power:x[7],hp:x[8]}));

const DECK_MAX=10, HAND_MAX=8, BOARD_SLOTS=4, START_HP=20, MAX_ROUNDS=20, TURN_SECONDS=60;
const COST={Common:1,Rare:2,Epic:3,Legendary:4};
/* Difficulty settings */
const DIFFS=[
 {name:'Easy',reward:1,start:3,skip:.35,rand:true,variant:0,w:{Common:5,Rare:3,Epic:1,Legendary:.3},info:'Win = 1 pack · loose bot, weaker ores'},
 {name:'Medium',reward:5,start:4,skip:0,rand:false,variant:.6,w:{Common:3,Rare:3,Epic:2,Legendary:1},info:'Win = 5 packs · balanced bot'},
 {name:'Hard',reward:10,start:5,skip:0,rand:false,variant:1.5,w:{Common:1,Rare:2,Epic:3,Legendary:3},info:'Win = 10 packs · stronger ores, extra card'}
];
function pickBotOre(w){const tot=catalog.reduce((a,c)=>a+w[c.rarity],0);let r=Math.random()*tot;for(const c of catalog){r-=w[c.rarity];if(r<=0)return c}return catalog[0]}
/* Variants: golden (rare), rainbow (rarer), hacker (rarest) */
const VNAME={golden:'Golden',rainbow:'Rainbow',hacker:'Hacker'};
const VICON={golden:'★',rainbow:'🌈',hacker:'👾'};
const VBONUS={golden:[1,1],rainbow:[2,2],hacker:[3,3]};
function rollVariant(m=1){const r=Math.random();if(r<.01*m)return 'hacker';if(r<.04*m)return 'rainbow';if(r<.14*m)return 'golden';return ''}

/* Battle stats derived from the card's base stats */
function bstats(c){
 const vb=VBONUS[c.variant]||[0,0];
 return {
  cost:COST[c.rarity]||1,
  atk:Math.max(1,Math.round((c.power||12)/8))+vb[0],
  hp:Math.max(2,Math.round((c.hp||40)/16))+vb[1]
 };
}

/* ---------- Sound effects (Web Audio, no files needed) ---------- */
const SFX=(()=>{
 let ctx=null,muted=false;const vol=.5;
 try{muted=localStorage.getItem('ore-gacha-mute')==='1'}catch(e){}
 function ac(){
  if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A()}
  if(ctx.state==='suspended')ctx.resume();
  return ctx;
 }
 function tone({f=440,f2=null,t=.15,type='sine',v=.3,d=0,a=.005}){
  const c=ac();if(!c||muted||c.state!=='running')return;
  const o=c.createOscillator(),g=c.createGain(),t0=c.currentTime+d;
  o.type=type;o.frequency.setValueAtTime(f,t0);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+t);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v*vol,t0+a);g.gain.exponentialRampToValueAtTime(.0001,t0+t);
  o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+t+.03);
 }
 function noise({t=.2,v=.3,d=0,f=1000,f2=null,q=1,type='lowpass'}){
  const c=ac();if(!c||muted||c.state!=='running')return;
  const len=Math.floor(c.sampleRate*t),buf=c.createBuffer(1,len,c.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=Math.random()*2-1;
  const s=c.createBufferSource();s.buffer=buf;
  const fl=c.createBiquadFilter(),t0=c.currentTime+d;
  fl.type=type;fl.frequency.setValueAtTime(f,t0);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t0+t);fl.Q.value=q;
  const g=c.createGain();g.gain.setValueAtTime(v*vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+t);
  s.connect(fl);fl.connect(g);g.connect(c.destination);s.start(t0);
 }
 return {
  unlock(){ac()},
  muted:()=>muted,
  toggle(){muted=!muted;try{localStorage.setItem('ore-gacha-mute',muted?'1':'0')}catch(e){}},
  click(){tone({f:700,f2:480,t:.05,type:'square',v:.1})},
  error(){tone({f:180,t:.15,type:'sawtooth',v:.2});tone({f:130,t:.18,type:'sawtooth',v:.2,d:.09})},
  deal(){noise({t:.12,v:.15,f:2500,f2:900,type:'bandpass',q:2})},
  shuffle(){for(let i=0;i<6;i++)noise({t:.06,v:.12,f:3000,f2:1500,type:'bandpass',q:2,d:i*.05})},
  place(){tone({f:130,f2:50,t:.22,v:.5});noise({t:.1,v:.25,f:700});tone({f:900,t:.08,type:'triangle',v:.12,d:.05})},
  whoosh(){noise({t:.28,v:.22,f:400,f2:2600,type:'bandpass',q:1.5})},
  hit(){noise({t:.16,v:.4,f:1800,f2:200});tone({f:170,f2:60,t:.18,type:'square',v:.3})},
  heroHit(){tone({f:95,f2:38,t:.35,v:.55});noise({t:.3,v:.4,f:1400,f2:120});tone({f:300,f2:80,t:.25,type:'sawtooth',v:.15})},
  die(){tone({f:420,f2:60,t:.45,type:'sawtooth',v:.22});noise({t:.4,v:.25,f:2200,f2:200})},
  turn(){tone({f:523,t:.25,type:'triangle',v:.3});tone({f:784,t:.35,type:'triangle',v:.3,d:.12})},
  botTurn(){tone({f:330,f2:247,t:.35,type:'sawtooth',v:.15});tone({f:247,f2:196,t:.35,type:'sawtooth',v:.15,d:.15})},
  endTurn(){tone({f:500,f2:300,t:.1,type:'triangle',v:.2})},
  tick(){tone({f:900,t:.04,type:'square',v:.08})},
  win(){[523,659,784,1047].forEach((f,i)=>tone({f,t:.4,type:'triangle',v:.3,d:i*.12}));tone({f:1047,t:.8,type:'sine',v:.25,d:.5});tone({f:1319,t:.8,type:'sine',v:.2,d:.5})},
  lose(){[392,330,262,196].forEach((f,i)=>tone({f,t:.45,type:'sawtooth',v:.18,d:i*.2}))},
  tie(){tone({f:440,t:.3,type:'triangle',v:.25});tone({f:440,t:.3,type:'triangle',v:.25,d:.25})},
  packGain(){tone({f:880,t:.25,v:.2});tone({f:1320,t:.35,v:.2,d:.1})},
  packShake(){
   noise({t:1.3,v:.25,f:200,f2:2600,type:'bandpass',q:2});
   for(let i=0;i<10;i++)tone({f:80+i*14,t:.1,type:'sine',v:.2+i*.03,d:i*.13});
  },
  packPop(){noise({t:.5,v:.5,f:1500,type:'highpass'});tone({f:200,f2:1200,t:.3,type:'sawtooth',v:.2})},
  reveal(r,v){
   const notes={Common:[523],Rare:[523,659],Epic:[523,659,784],Legendary:[523,659,784,1047,1319]}[r]||[523];
   notes.forEach((f,i)=>tone({f,t:.4,type:'triangle',v:.3,d:i*.1}));
   if(r==='Legendary'||r==='Epic')tone({f:130,t:.8,v:.35});
   if(v==='golden'){for(let i=0;i<10;i++)tone({f:1500+Math.random()*1800,t:.14,v:.15,d:.3+i*.06})}
   else if(v==='rainbow'){tone({f:300,f2:2400,t:.9,type:'sawtooth',v:.15,d:.2});for(let i=0;i<12;i++)tone({f:700+i*180,t:.12,type:'triangle',v:.14,d:.3+i*.06})}
   else if(v==='hacker'){for(let i=0;i<14;i++)tone({f:200+Math.random()*1500,t:.05,type:'square',v:.12,d:i*.045});tone({f:90,t:.7,type:'sawtooth',v:.2,d:.6});tone({f:880,t:.5,type:'square',v:.12,d:.65})}
  }
 };
})();

/* ---------- Save data ---------- */
let s={packs:3,owned:[],deck:[]};
try{const v=JSON.parse(localStorage.getItem('ore-gacha-save'));if(v&&Array.isArray(v.owned)){s={...s,...v};if(!Array.isArray(s.deck))s.deck=[];if(!Number.isFinite(s.packs))s.packs=3;}}catch(e){}
s.owned.forEach(c=>{if(c.holo&&!c.variant)c.variant='golden';delete c.holo});
if(!Number.isFinite(s.lastPack)||s.lastPack<=0)s.lastPack=Date.now();
const $=q=>document.querySelector(q);
function save(){localStorage.setItem('ore-gacha-save',JSON.stringify(s));stats();if(window.oreCloudSave)window.oreCloudSave()}
function stats(){$('#packs').textContent=s.packs;$('#packBadge').textContent=s.packs;$('#ownedCount').textContent=s.owned.length;$('#deckCount').textContent=s.deck.length+'/'+DECK_MAX;$('#deckLabel').textContent=s.deck.length+'/'+DECK_MAX;$('#open').disabled=s.packs<1}

/* ---------- Collection cards ---------- */
function groupOres(list){const m=new Map();list.forEach(c=>{const k=c.name+'|'+(c.variant||'');if(!m.has(k))m.set(k,{c,copies:[]});m.get(k).copies.push(c.copy)});return [...m.values()]}
function card(c,n){const b=bstats(c);return `<article class="card ${c.variant?'v-'+c.variant:''}" style="--ore:${c.ore||'#68717e'};--ore-light:${c.light||'#d7dce5'};--ore-dark:${c.dark||'#303640'}">${n>1?`<span class="dup">${n}x</span>`:''}
 <div class="rank">ORE #${c.rank}</div><div class="symbol"><span>${c.symbol}</span></div><div class="rarity ${c.rarity.toLowerCase()}">${c.rarity}${c.variant?' · '+VNAME[c.variant]:''}</div>
 <h3>${c.name}</h3><div class="muted">⚡${b.cost} · ⚔ ${b.atk} · ♥ ${b.hp}</div></article>`}
function renderCollection(){const q=$('#search').value.toLowerCase(),r=$('#filter').value;const a=groupOres(s.owned.filter(c=>c.name.toLowerCase().includes(q)&&(r==='all'||r===c.rarity)));$('#collection').innerHTML=a.length?a.map(g=>card(g.c,g.copies.length)).join(''):'<div class="empty">No ores found. Open a pack to discover some!</div>'}
function renderDeck(){const a=groupOres(s.owned.filter(c=>s.deck.includes(c.copy)));$('#deck').innerHTML=a.length?a.map(g=>`<div>${card(g.c,g.copies.length)}<button style="width:100%" onclick="removeC('${g.copies[0]}')">Remove 1</button></div>`).join(''):'<div class="empty">Your deck is empty.</div>';const b=groupOres(s.owned.filter(c=>!s.deck.includes(c.copy)));$('#choices').innerHTML=b.length?b.map(g=>`<div>${card(g.c,g.copies.length)}<button style="width:100%" onclick="addC('${g.copies[0]}')" ${s.deck.length>=DECK_MAX?'disabled':''}>Add to deck</button></div>`).join(''):'<div class="empty">No other ores available.</div>'}
window.addC=id=>{if(s.deck.length<DECK_MAX&&!s.deck.includes(id)){s.deck.push(id);save();renderDeck()}};
window.removeC=id=>{s.deck=s.deck.filter(x=>x!==id);save();renderDeck()};
function view(v){['home','collection','deck','duel','leaderboard','profile'].forEach(x=>$('#'+x+'View').hidden=x!==v);document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.v===v));if(v==='collection')renderCollection();if(v==='deck')renderDeck();if(v==='duel')render();if(v==='leaderboard'&&window.oreLoadLeaderboard)window.oreLoadLeaderboard();if(v==='profile'&&window.oreRenderProfile)window.oreRenderProfile();animateIn(v)}
function animateIn(v){document.querySelectorAll('#'+v+'View .grid').forEach(gr=>{gr.classList.add('stagger');[...gr.children].forEach((ch,i)=>ch.style.animationDelay=Math.min(i*30,400)+'ms');setTimeout(()=>gr.classList.remove('stagger'),900)})}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>view(b.dataset.v));
$('#search').oninput=renderCollection;$('#filter').onchange=renderCollection;
$('#clear').onclick=()=>{s.deck=[];save();renderDeck()};
let opening=false;
function burstParticles(host,color,n){
 for(let i=0;i<n;i++){
  const p=document.createElement('span');p.className='pt';
  const ang=Math.random()*Math.PI*2,d=70+Math.random()*140;
  p.style.cssText=`--dx:${Math.cos(ang)*d}px;--dy:${Math.sin(ang)*d}px;--pc:${color};animation-delay:${Math.random()*.12}s`;
  host.appendChild(p);setTimeout(()=>p.remove(),1200);
 }
}
function openPack(){
 if(opening||s.packs<1)return;
 opening=true;
 SFX.packShake();
 s.packs--;
 const rarity=rollRarity();
 const pool=catalog.filter(c=>c.rarity===rarity);
 const selected=pool[Math.floor(Math.random()*pool.length)];
 const c={...selected,copy:crypto.randomUUID(),variant:rollVariant(1)};
 s.owned.push(c);save();packTick();
 const count=s.owned.filter(o=>o.name===c.name&&(o.variant||'')===(c.variant||'')).length;
 const col={Common:'#b9bec7',Rare:'#79b9d0',Epic:'#c18bd7',Legendary:'#e3bd68',Mythic:'#ff4fd8',Exotic:'#4dfff0'}[rarity];
 const vcol={golden:'#f0c24a',rainbow:'#ff78c8',hacker:'#18ff6d',checkered:'#ffffff'}[c.variant];
 const rv=$('#reveal'),title=$('#revealTitle'),tag=$('#revealTag'),close=$('#close'),again=$('#openAgain'),box=$('#modalbox');
 close.disabled=true;again.hidden=true;tag.textContent='';box.dataset.v='';
 title.textContent='Opening pack…';
 rv.className='reveal-pack';
 rv.innerHTML='<div class="pk-glow"></div><div class="pack shake"></div>';
 $('#modal').classList.add('show');
 setTimeout(()=>{
  const pk=rv.querySelector('.pack');if(pk)pk.className='pack pop';SFX.packPop();
  const f=document.createElement('div');f.className='screenflash';document.body.appendChild(f);setTimeout(()=>f.remove(),800);
  burstParticles(rv,vcol||col,c.variant?48:28);
  setTimeout(()=>{
   rv.className='reveal-card';
   rv.innerHTML=`<div class="burst ${rarity.toLowerCase()}"></div><div class="flipin">${card(c,count)}</div>`;
   burstParticles(rv,vcol||col,c.variant?60:34);
   SFX.reveal(rarity,c.variant);
   title.textContent=c.variant?`${VNAME[c.variant]} ${c.name}!!`:`${c.name}!`;
   tag.style.color=vcol||col;
   tag.textContent=rarity+(c.variant?' · '+VNAME[c.variant]+' variant':'');
   box.dataset.v=c.variant||'';
   close.disabled=false;again.hidden=s.packs<1;
   opening=false;
   renderCollection();
  },450);
 },1350);
}
$('#open').onclick=openPack;
$('#openAgain').onclick=openPack;
$('#close').onclick=()=>$('#modal').classList.remove('show');
$('#featured').innerHTML=catalog.slice(0,4).map(card).join('');

/* =====================================================
   CARD BATTLE ENGINE
   ===================================================== */
let G=null;          // current game
let uidc=1;          // unit id counter
let timerId=null;
let MP={active:false,role:null,room:null,uid:null,opponent:null,applying:false,publishTimer:null,lastTurn:null};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const maxEnergy=()=>Math.min(10,(G?G.round:1)+1);
const say=m=>{$('#battleLog').textContent=m};

function mkUnit(c){
 const b=bstats(c);
 return {uid:uidc++,name:c.name,symbol:c.symbol,rarity:c.rarity,variant:c.variant||'',light:c.light||'#d7dce5',ore:c.ore||'#68717e',dark:c.dark||'#303640',cost:b.cost,atk:b.atk,hp:b.hp,maxHp:b.hp,ready:false};
}
function newSide(cards){
 return {hp:START_HP,energy:0,deck:shuffle(cards.map(mkUnit)),hand:[],discard:[],board:Array(BOARD_SLOTS).fill(null)};
}
function draw(side,n=1){
 for(let i=0;i<n;i++){
  if(!side.deck.length&&side.discard.length){side.deck=shuffle(side.discard);side.discard=[];if(G&&side===G.p)SFX.shuffle();if(G)say((side===G.p?'Your':"Bot's")+' discard pile was reshuffled into the deck.')}
  if(!side.deck.length)break;
  const c=side.deck.pop();c.drawn=true;if(G&&side===G.p)setTimeout(()=>SFX.deal(),i*130);
  if(side.hand.length>=HAND_MAX)side.discard.push(c); else side.hand.push(c);
 }
}

function startDuel(){
 if(MP.active){say('Leave the multiplayer room before starting a bot duel.');return}
 const mine=s.owned.filter(c=>s.deck.includes(c.copy));
 if(!mine.length){$('#introMsg').textContent='Your deck is empty. Add at least one ore in the Deck tab first.';return}
 const size=Math.min(DECK_MAX,Math.max(6,mine.length));
 const botCards=[];
 const diff=DIFFS[+$('#diff').value]||DIFFS[1];
 for(let i=0;i<size;i++){const base=pickBotOre(diff.w);botCards.push({...base,variant:diff.variant?rollVariant(diff.variant):''})}
 G={round:1,turn:'player',over:false,sel:null,t:TURN_SECONDS,busy:false,diff,p:newSide(mine),b:newSide(botCards)};
 draw(G.p,4);draw(G.b,diff.start);
 $('#result').hidden=true;
 startPlayerTurn();
}

function startPlayerTurn(){
 G.turn='player';G.sel=null;
 G.p.energy=maxEnergy();
 G.b.energy=maxEnergy();
 draw(G.p,1);
 G.p.board.forEach(u=>{if(u)u.ready=true});
 say(`Round ${G.round}: your turn. Drag an ore onto the board, then attack.`);
 setTimeout(()=>{banner('Your turn','#e3bd68');SFX.turn()},30);
 startTimer();
 render();
}

function startTimer(){
 clearInterval(timerId);G.t=TURN_SECONDS;
 timerId=setInterval(()=>{
  if(!G||G.over||G.turn!=='player'){clearInterval(timerId);return}
  G.t--;if(G.t<=10&&G.t>0)SFX.tick();
  $('#timerLabel').textContent='⏱ '+Math.max(0,G.t)+'s';
  if(G.t<=0){say('Time is up — turn ended.');endPlayerTurn()}
 },1000);
}

function myTurn(){return G&&!G.over&&G.turn==='player'&&!G.anim}
function banner(t,c){const el=$('#banner');el.textContent=t;el.style.color=c;el.className='banner';void el.offsetWidth;el.className='banner show'}

function playCard(side,hi,slot){
 if(!G)return false;
 const c=side.hand[hi];
 if(!c||side.board[slot])return false;
 if(c.cost>side.energy){if(side===G.p){say(`Not enough energy for ${c.name} (needs ${c.cost}).`);SFX.error()}return false}
 side.energy-=c.cost;
 side.hand.splice(hi,1);
 c.ready=true; // can attack the same turn it is played
 c.fresh=true;
 side.board[slot]=c;
 if(side===G.p)G.sel=null;
 SFX.place();
 say(`${side===G.p?'You':'Bot'} played ${c.name} (⚔ ${c.atk} · ♥ ${c.hp}).`);
 render();
 return true;
}

function cleanup(side){
 const dead=[];
 side.board.forEach((u,i)=>{if(u&&u.hp<=0){side.board[i]=null;side.discard.push(u);dead.push(u.name)}});
 return dead;
}

async function attack(side,opp,slot,target){
 if(!G||G.over||G.anim)return;
 const g=G;
 const a=side.board[slot];
 if(!a||!a.ready)return;
 const mine=side===g.p;
 g.anim=true;g.sel=null;
 // lunge animation toward the target
 const aEl=document.querySelector(`[data-uid="${a.uid}"]`);
 const dUnit=target.hero?null:opp.board[target.slot];
 const tEl=target.hero?$(mine?'#botBar':'#youBar'):(dUnit&&document.querySelector(`[data-uid="${dUnit.uid}"]`));
 if(aEl&&tEl&&aEl.animate){
  const ar=aEl.getBoundingClientRect(),tr=tEl.getBoundingClientRect();
  const dx=(tr.left+tr.width/2-ar.left-ar.width/2)*.7,dy=(tr.top+tr.height/2-ar.top-ar.height/2)*.7;
  aEl.style.zIndex=30;SFX.whoosh();
  try{await aEl.animate([
   {transform:'translate(0,0) scale(1)'},
   {transform:`translate(${-dx*.08}px,${-dy*.08}px) scale(1.04)`,offset:.2},
   {transform:`translate(${dx}px,${dy}px) scale(1.15)`,offset:.55},
   {transform:'translate(0,0) scale(1)'}
  ],{duration:420,easing:'cubic-bezier(.5,0,.3,1)'}).finished}catch(e){}
 }
 if(G!==g||g.over)return;
 let flashes=[],msg;
 if(target.hero){
  opp.hp-=a.atk;SFX.heroHit();
  msg=`${a.name} hits ${mine?'the bot':'you'} directly for ${a.atk}!`;
  flashes.push([mine?'#bHeart':'#pHeart','-'+a.atk]);
 }else{
  const d=opp.board[target.slot];
  if(!d){g.anim=false;return}
  d.hp-=a.atk;SFX.hit();
  msg=`${a.name} hits ${d.name} for ${a.atk}.`;
  flashes.push([`[data-uid="${d.uid}"]`,'-'+a.atk]);
 }
 a.ready=false;
 const dying=[...opp.board,...side.board].filter(u=>u&&u.hp<=0);
 dying.forEach(u=>{u.dying=true});
 render();
 flashes.forEach(f=>flash(f[0],f[1]));
 if(dying.length){setTimeout(()=>SFX.die(),120);await sleep(480);if(G!==g)return}
 const dead=[...cleanup(opp),...cleanup(side)];
 if(dead.length)msg+=' Destroyed: '+dead.join(', ')+'.';
 say(msg);
 g.anim=false;
 render();
 checkWin();
}

function flash(sel,text){
 const el=document.querySelector(sel);if(!el)return;
 el.classList.add('hit');
 const f=document.createElement('span');f.className='float';f.textContent=text;el.appendChild(f);
 setTimeout(()=>{f.remove();el.classList.remove('hit')},900);
}

function checkWin(){
 if(G.b.hp<=0)endGame('win');
 else if(G.p.hp<=0)endGame('lose');
}

function endGame(res){
 G.over=true;clearInterval(timerId);
 SFX[res==='win'?'win':res==='lose'?'lose':'tie']();
 let html;
 if(MP.active){
  html=res==='win'?'<h2>🏆 You won the multiplayer duel!</h2><p>Your opponent ran out of health.</p>':res==='lose'?'<h2>You lost the multiplayer duel</h2><p>Your health hit 0.</p>':'<h2>Draw!</h2><p>The match ended in a draw.</p>';
  if(window.oreMP)window.oreMP.finish(res);
 }
 else if(res==='win'){const r=G.diff.reward;s.packs+=r;save();html=`<h2>🏆 You won the duel!</h2><p>The bot ran out of health (${G.diff.name}). You earned ${r} pack${r>1?'s':''}.</p>`}
 else if(res==='lose')html='<h2>You lost the duel</h2><p>Your health hit 0. Build a stronger deck and try again.</p>';
 else html='<h2>Draw!</h2><p>Round limit reached with equal health.</p>';
 $('#result').innerHTML=html+'<button class="primary" id="again">Play again</button>';
 $('#result').hidden=false;
 render();
 $('#again').onclick=()=>{if(MP.active){if(window.oreMP)window.oreMP.leaveRoom()}else startDuel()};
}

function endPlayerTurn(){
 if(!myTurn())return;
 clearInterval(timerId);G.sel=null;SFX.endTurn();
 if(MP.active){
  G.turn='opponent';
  if(MP.role==='guest'){G.round=Math.min(MAX_ROUNDS,G.round+1);if(G.round>=MAX_ROUNDS){G.over=true;endGame('draw');return}}
  say('Turn passed. Waiting for the other player…');render();return;
 }
 G.turn='bot';render();botTurn();
}

/* ---------- Bot AI ---------- */
function botPick(u,targets){
 if(G&&G.diff&&G.diff.rand)return targets[Math.floor(Math.random()*targets.length)];
 const kills=targets.filter(t=>t.unit.hp<=u.atk);                                   // kill the strongest unit it can
 if(kills.length)return kills.sort((a,b)=>b.unit.atk-a.unit.atk)[0];
 return targets.sort((a,b)=>a.unit.hp-b.unit.hp)[0];                                // otherwise weaken the lowest-health unit
}

async function botTurn(){
 const g=G;const alive=()=>G===g&&!g.over;
 const B=g.b,P=g.p;
 B.energy=maxEnergy();
 draw(B,1);
 B.board.forEach(u=>{if(u)u.ready=true});
 say('Bot is thinking...');
 banner("Bot's turn",'#df4b56');SFX.botTurn();
 render();
 await sleep(800);if(!alive())return;

 // play cards (most expensive affordable first)
 while(alive()){
  const empty=B.board.map((u,i)=>u?-1:i).filter(i=>i>=0);
  const options=B.hand.map((c,i)=>({c,i})).filter(o=>o.c.cost<=B.energy).sort((a,b)=>g.diff.rand?Math.random()-.5:b.c.cost-a.c.cost);
  if(!empty.length||!options.length)break;
  playCard(B,options[0].i,empty[Math.floor(Math.random()*empty.length)]);
  await sleep(750);
 }
 if(!alive())return;

 // attack
 for(let i=0;i<BOARD_SLOTS&&alive();i++){
  const u=B.board[i];
  if(!u||!u.ready)continue;
  if(g.diff.skip&&Math.random()<g.diff.skip)continue;
  const targets=P.board.map((unit,slot)=>unit?{unit,slot}:null).filter(Boolean);
  if(!targets.length){await attack(B,P,i,{hero:true})}
  else{
   const t=botPick(u,targets);
   if(!t)continue;
   await attack(B,P,i,{slot:t.slot});
  }
  await sleep(350);
 }
 if(!alive())return;

 g.round++;
 if(g.round>MAX_ROUNDS){
  g.round=MAX_ROUNDS;
  endGame(P.hp>B.hp?'win':P.hp<B.hp?'lose':'draw');
  return;
 }
 startPlayerTurn();
}

/* ---------- Rendering ---------- */
function unitHTML(u,cls){
 return `<div class="ucard r-${u.rarity.toLowerCase()} ${u.variant?'v-'+u.variant:''} ${u.dying?'dying ':''}${u.fresh?'enter ':''}${cls||''}" data-uid="${u.uid}" style="--ore:${u.ore};--ore-light:${u.light};--ore-dark:${u.dark}">
<div class="ctop"><span class="cost">⚡${u.cost}</span><span class="rarity ${u.rarity.toLowerCase()}">${u.rarity}${u.variant?' '+VICON[u.variant]:''}</span></div>
<div class="symbol"><span>${u.symbol}</span></div>
<div class="uname" title="${u.name}">${u.name}</div>
<div class="ustats"><span class="atk">⚔ ${u.atk}</span><span class="hpv ${u.hp<u.maxHp?'hurt':''}">♥ ${Math.max(0,u.hp)}</span></div></div>`;
}

function render(){
 const active=!!G;
 $('#duelIntro').hidden=active;
 $('#arena').hidden=!active;
 if(!active)return;
 const P=G.p,B=G.b,my=!G.over&&G.turn==='player',sel=G.sel;
 const mx=maxEnergy();

 $('#bHP').textContent=Math.max(0,B.hp);$('#pHP').textContent=Math.max(0,P.hp);
 $('#bBar').style.width=Math.max(0,B.hp/START_HP*100)+'%';$('#pBar').style.width=Math.max(0,P.hp/START_HP*100)+'%';
 $('#bHeart').classList.toggle('low',B.hp<=6&&B.hp>0);$('#pHeart').classList.toggle('low',P.hp<=6&&P.hp>0);
 $('#bHand').textContent=`Hand ${B.hand.length}/${HAND_MAX}`;
 $('#pHand').textContent=`Hand ${P.hand.length}/${HAND_MAX}`;
 $('#botBacks').innerHTML=B.hand.map(()=>'<div class="back"></div>').join('');
 $('#bDeck').textContent=B.deck.length;$('#bDisc').textContent=B.discard.length;
 $('#pDeck').textContent=P.deck.length;$('#pDisc').textContent=P.discard.length;
 $('#energy').innerHTML=Array.from({length:mx},(_,k)=>`<span class="dia ${k<P.energy?'on':''}">◆</span>`).join('')+` <b>${P.energy} / ${mx}</b>&nbsp;energy`;
 $('#bEnergy').innerHTML=Array.from({length:mx},(_,k)=>`<span class="dia ${k<B.energy?'on':''}">◆</span>`).join('')+` <b>${B.energy} / ${mx}</b>&nbsp;energy`;
 $('#turnLabel').textContent=G.over?'Duel over':my?'Your turn':(MP.active?'Opponent’s turn':"Bot's turn");
 $('#timerLabel').textContent=my?'⏱ '+Math.max(0,G.t)+'s':'';
 $('#roundLabel').textContent=`Round ${Math.min(G.round,MAX_ROUNDS)} / ${MAX_ROUNDS} · ${G.diff.name}`;
 $('#botBar').classList.toggle('target',!!(my&&sel&&sel.type==='unit'&&!B.board.some(Boolean)));
 if(MP.active){$('#botBar').querySelector('.name').textContent=MP.opponent||'Opponent';$('#youBar').querySelector('.name').textContent='You'}else{$('#botBar').querySelector('.name').textContent='Glungus Bot';$('#youBar').querySelector('.name').textContent='You'}
 $('#endTurn').disabled=!my;
 $('#forfeit').disabled=G.over;

 // Bot board
 $('#botBoard').innerHTML=B.board.map((u,i)=>`<div class="slot ${u&&my&&sel&&sel.type==='unit'?'target':''} ${u&&u.fresh?'land':''}" data-slot="${i}">${u?unitHTML(u):''}</div>`).join('');
 document.querySelectorAll('#botBoard .slot').forEach(el=>{
  const i=+el.dataset.slot;
  el.onclick=()=>{
   if(!myTurn()||!G.sel||G.sel.type!=='unit'||!G.b.board[i])return;
   attack(G.p,G.b,G.sel.slot,{slot:i});
  };
 });

 // Player board
 $('#playerBoard').innerHTML=P.board.map((u,i)=>`<div class="slot ${!u&&my&&sel&&sel.type==='hand'?'drop':''} ${u&&u.fresh?'land':''}" data-slot="${i}">${u?unitHTML(u,(u.ready&&my?'ready ':'')+(!u.ready?'exh ':'')+(sel&&sel.type==='unit'&&sel.slot===i?'sel':'')):''}</div>`).join('');
 document.querySelectorAll('#playerBoard .slot').forEach(el=>{
  const i=+el.dataset.slot;
  el.onclick=()=>onMySlot(i);
  el.ondragover=e=>{if(!G.p.board[i]&&myTurn())e.preventDefault()};
  el.ondrop=e=>{e.preventDefault();const hi=+e.dataTransfer.getData('text/plain');$('#playerBoard').classList.remove('dragging');if(myTurn())playCard(G.p,hi,i)};
 });

 // Hand
 $('#hand').innerHTML=P.hand.length?P.hand.map((c,i)=>`<div class="hcard ${my&&c.cost<=P.energy?'':'dim'} ${sel&&sel.type==='hand'&&sel.i===i?'sel':''} ${c.drawn?'deal':''}" draggable="${my&&c.cost<=P.energy}" data-hi="${i}">${unitHTML(c)}</div>`).join(''):'<div class="muted" style="padding:20px">Your hand is empty.</div>';
 document.querySelectorAll('#hand .hcard').forEach(el=>{
  const i=+el.dataset.hi;
  el.onclick=()=>onHand(i);
  el.ondragstart=e=>{
   const c=G.p.hand[i];
   if(!myTurn()||!c||c.cost>G.p.energy){e.preventDefault();return}
   e.dataTransfer.setData('text/plain',String(i));
   e.dataTransfer.effectAllowed='move';
   G.sel={type:'hand',i};
   $('#playerBoard').classList.add('dragging');
  };
  el.ondragend=()=>$('#playerBoard').classList.remove('dragging');
 });
 // one-shot animation flags have been used by this render
 [...P.hand,...B.hand,...P.board,...B.board].forEach(u=>{if(u){u.drawn=false;u.fresh=false}});
 if(MP.active&&!MP.applying&&window.oreMP)window.oreMP.queuePublish();
}

function onHand(i){
 if(!myTurn())return;
 const c=G.p.hand[i];if(!c)return;
 if(c.cost>G.p.energy){say(`Not enough energy for ${c.name} (needs ${c.cost}).`);SFX.error();return}
 G.sel=(G.sel&&G.sel.type==='hand'&&G.sel.i===i)?null:{type:'hand',i};
 render();
}

function onMySlot(i){
 if(!myTurn())return;
 const u=G.p.board[i];
 if(G.sel&&G.sel.type==='hand'&&!u){playCard(G.p,G.sel.i,i);return}
 if(u){
  if(!u.ready){say(`${u.name} can't attack yet (just played or already attacked).`);SFX.error();return}
  G.sel=(G.sel&&G.sel.type==='unit'&&G.sel.slot===i)?null:{type:'unit',slot:i};
  render();
 }
}

/* static buttons / hero targeting */
$('#botBar').onclick=()=>{
 if(!myTurn()||!G.sel||G.sel.type!=='unit')return;
 if(G.b.board.some(Boolean)){say('Defeat the enemy ores before attacking directly.');SFX.error();return}
 attack(G.p,G.b,G.sel.slot,{hero:true});
};
$('#endTurn').onclick=endPlayerTurn;
$('#forfeit').onclick=()=>{
 if(!G||G.over)return;
 if(MP.active){G.p.hp=0;checkWin();return}
 clearInterval(timerId);G=null;SFX.lose();
 $('#introMsg').textContent='You forfeited the last duel. Ready for another?';
 render();
};
$('#startDuel').onclick=startDuel;

/* ---------- Multiplayer room controls ---------- */
/* Multiplayer room controls removed: index.html has no multiplayer panel. */

/* ---------- Difficulty slider ---------- */
const diffEl=$('#diff');
function updDiff(){const d=DIFFS[+diffEl.value];$('#diffName').textContent=d.name;$('#diffInfo').textContent=d.info;s.diff=+diffEl.value;save()}
diffEl.value=Number.isFinite(s.diff)?s.diff:1;
diffEl.oninput=()=>{updDiff();SFX.click()};
updDiff();

/* ---------- Sound wiring ---------- */
document.addEventListener('pointerdown',()=>SFX.unlock(),{once:true});
document.addEventListener('keydown',()=>SFX.unlock(),{once:true});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(b&&b.id!=='mute'&&!b.disabled)SFX.click()});
function updMute(){$('#mute').textContent=SFX.muted()?'🔇':'🔊'}
$('#mute').onclick=()=>{SFX.toggle();updMute();if(!SFX.muted())SFX.click()};
updMute();

/* ---------- Free pack every minute (max 10 stored) ---------- */
window.PACK_MAX=10;window.PACK_MS=60000;
function packTick(){
 const now=Date.now();let changed=false;
 if(!Number.isFinite(s.lastPack)||s.lastPack<=0)s.lastPack=now;
 if(!Number.isFinite(s.packs))s.packs=3;
 const packMax=Number.isFinite(window.PACK_MAX)?window.PACK_MAX:10;
 const packMs=Number.isFinite(window.PACK_MS)&&window.PACK_MS>0?window.PACK_MS:60000;
 if(s.lastPack>now)s.lastPack=now;
 if(s.packs>=packMax){s.lastPack=now}
 else{
  const n=Math.floor((now-s.lastPack)/packMs);
  if(n>0){
   s.packs=Math.min(packMax,s.packs+n);
   s.lastPack=s.packs>=packMax?now:s.lastPack+n*packMs;
   changed=true;
  }
 }
 if(changed){save();SFX.packGain()}
 const el=$('#packTimer');
 if(s.packs>=packMax)el.textContent=`Pack limit reached (${s.packs}/${packMax}). Open some to start the timer again.`;
 else{
  const sec=Math.ceil(Math.max(0,packMs-(now-s.lastPack))/1000);
  el.textContent=`Next free pack in ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} · ${s.packs}/${packMax} packs`;
 }
}
setInterval(packTick,1000);

/* ---------- 3D tilt + shine on hover ---------- */
let tiltEl=null;
function resetTilt(){if(tiltEl){tiltEl.style.removeProperty('--rx');tiltEl.style.removeProperty('--ry');tiltEl=null}}
document.addEventListener('mousemove',e=>{
 const el=e.target.closest?e.target.closest('.card,.hcard .ucard,.slot .ucard'):null;
 if(el!==tiltEl)resetTilt();
 if(!el)return;
 const r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
 el.style.setProperty('--ry',((px-.5)*14)+'deg');el.style.setProperty('--rx',((.5-py)*14)+'deg');
 el.style.setProperty('--mx',(px*100)+'%');el.style.setProperty('--my',(py*100)+'%');
 tiltEl=el;
});

/* ---------- Floating ember background ---------- */
(function(){
 const cv=$('#fx'),cx=cv.getContext('2d');let w,h;const ps=[];
 function size(){w=cv.width=innerWidth;h=cv.height=innerHeight}
 size();addEventListener('resize',size);
 for(let i=0;i<45;i++)ps.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.8+.4,v:Math.random()*.35+.1,a:Math.random()*.5+.15,p:Math.random()*6});
 (function tick(){
  cx.clearRect(0,0,w,h);
  ps.forEach(p=>{p.y-=p.v;p.x+=Math.sin(p.p+=.01)*.3;if(p.y<-5){p.y=h+5;p.x=Math.random()*w}
   cx.beginPath();cx.fillStyle=`rgba(227,150,104,${p.a})`;cx.arc(p.x,p.y,p.r,0,7);cx.fill()});
  requestAnimationFrame(tick);
 })();
})();

stats();renderCollection();renderDeck();render();packTick();

/* ===== Visual effects (particles, shake, hooks) ===== */
/* ===== 10x COOLER FX ===== */
(function(){
const cv=document.createElement('canvas');cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';document.body.appendChild(cv);
const cx=cv.getContext('2d');let W,H;const ps=[],st=[];
const rs=()=>{W=cv.width=innerWidth;H=cv.height=innerHeight};rs();addEventListener('resize',rs);
window.FX={
 burst(x,y,col,n=24,sp=7){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=Math.random()*sp+1;ps.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.16,l:1,d:.02+Math.random()*.03,r:Math.random()*3+1.5,c:col})}},
 confetti(){const cs=['#e3bd68','#df4b56','#79b9d0','#c18bd7','#65b978','#fff'];for(let i=0;i<180;i++)ps.push({x:Math.random()*W,y:-20-Math.random()*H*.5,vx:(Math.random()-.5)*3,vy:Math.random()*3+2,g:.03,l:1,d:.003,r:Math.random()*4+3,c:cs[i%6],sq:1,rot:Math.random()*6,nl:1})},
 shake(){const m=document.querySelector('main');m.classList.remove('shake');void m.offsetWidth;m.classList.add('shake')}
};
let lt=0;
addEventListener('mousemove',e=>{const n=performance.now();if(n-lt<28)return;lt=n;ps.push({x:e.clientX,y:e.clientY,vx:(Math.random()-.5)*1.2,vy:(Math.random()-.5)*1.2,g:0,l:.8,d:.045,r:Math.random()*2+1,c:'#e3bd68'})});
(function tick(){
 cx.clearRect(0,0,W,H);
 if(Math.random()<.01)st.push({x:Math.random()*W,y:Math.random()*H*.4,vx:-10-Math.random()*6,vy:4+Math.random()*3,l:1});
 cx.globalCompositeOperation='lighter';
 for(let i=st.length-1;i>=0;i--){const s=st[i];s.x+=s.vx;s.y+=s.vy;s.l-=.02;if(s.l<=0){st.splice(i,1);continue}
  const g=cx.createLinearGradient(s.x,s.y,s.x-s.vx*5,s.y-s.vy*5);g.addColorStop(0,`rgba(255,255,255,${s.l})`);g.addColorStop(1,'rgba(255,255,255,0)');
  cx.strokeStyle=g;cx.lineWidth=2;cx.beginPath();cx.moveTo(s.x,s.y);cx.lineTo(s.x-s.vx*5,s.y-s.vy*5);cx.stroke()}
 for(let i=ps.length-1;i>=0;i--){const p=ps[i];p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.l-=p.d;
  if(p.l<=0||p.y>H+30){ps.splice(i,1);continue}
  cx.globalAlpha=Math.max(0,p.l);cx.fillStyle=p.c;
  if(p.sq){p.rot+=.1;cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillRect(-p.r,-p.r/2,p.r*2,p.r);cx.restore()}
  else{cx.beginPath();cx.arc(p.x,p.y,p.r,0,7);cx.fill()}}
 cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
 requestAnimationFrame(tick);
})();
})();
const ctr=el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
/* impact sparks + hero-hit screen shake */
const _flash=flash;
window.flash=function(sel,t){_flash(sel,t);const el=document.querySelector(sel);if(!el)return;const [x,y]=ctr(el);
 FX.burst(x,y,'#ffb347',26);FX.burst(x,y,'#fff',10,10);if(sel==='#bHeart'||sel==='#pHeart'){FX.burst(x,y,'#ff4455',40,10);FX.shake()}};
/* unit landing sparks */
const _pc=playCard;
window.playCard=function(...a){const ok=_pc.apply(this,a);if(ok)setTimeout(()=>document.querySelectorAll('.ucard.enter').forEach(e=>{const r=e.getBoundingClientRect();FX.burst(r.left+r.width/2,r.bottom,'#e3bd68',18,5)}),60);return ok};
/* pack pop + reveal fireworks */
const _pp=SFX.packPop;SFX.packPop=()=>{_pp();FX.burst(innerWidth/2,innerHeight/2,'#e3bd68',70,12);FX.shake()};
const _rv=SFX.reveal;SFX.reveal=(r,v)=>{_rv(r==='Mythic'||r==='Exotic'?'Legendary':r,v==='checkered'?'hacker':v);const c={Common:'#b9bec7',Rare:'#79b9d0',Epic:'#c18bd7',Legendary:'#ffd96a',Mythic:'#ff5ad2',Exotic:'#4dfff0'}[r]||'#fff';
 const n={Common:20,Rare:40,Epic:70,Legendary:120,Mythic:170,Exotic:240}[r]||20;FX.burst(innerWidth/2,innerHeight/2,c,n,13);
 if(v){FX.burst(innerWidth/2,innerHeight/2,{golden:'#f0c24a',rainbow:'#ff78c8',hacker:'#18ff6d',checkered:'#ffffff'}[v],90,15);FX.confetti()}
 if(r==='Legendary'||r==='Mythic'||r==='Exotic'||v)FX.shake()};
/* victory confetti */
const _eg=endGame;window.endGame=function(r){_eg(r);if(r==='win'){FX.confetti();setTimeout(FX.confetti,600)}};

/* ===== Open all + achievements ===== */
/* ===== OPEN ALL + ACHIEVEMENTS ===== */
s.ach=s.ach||{};s.st=Object.assign({wins:0,hard:0,streak:0,best:0,flawless:0,clutch:0,blitz:0},s.st||{});
const box0=document.createElement('div');box0.className='toasts';document.body.appendChild(box0);
const dupMax=()=>{const m={};s.owned.forEach(c=>{const k=c.name+'|'+(c.variant||'');m[k]=(m[k]||0)+1});return Math.max(0,...Object.values(m))};
const nV=v=>s.owned.filter(c=>c.variant===v).length,nL=()=>s.owned.filter(c=>c.rarity==='Legendary').length;
const ACH=[
 {id:'first',icon:'⛏️',name:'First Dig',desc:'Open your first pack',max:1,get:()=>s.owned.length,reward:1},
 {id:'o25',icon:'🎒',name:'Pack Rat',desc:'Own 25 ores',max:25,get:()=>s.owned.length,reward:1},
 {id:'o100',icon:'🏭',name:'Mine Boss',desc:'Own 100 ores',max:100,get:()=>s.owned.length,reward:3},
 {id:'u10',icon:'🔎',name:'Rockhound',desc:'Discover 10 different ores',max:10,get:()=>new Set(s.owned.map(c=>c.name)).size,reward:2},
 {id:'uall',icon:'📖',name:'Complete Set',desc:'Discover every ore',max:catalog.length,get:()=>new Set(s.owned.map(c=>c.name)).size,reward:5},
 {id:'l1',icon:'🍀',name:'Lucky Strike',desc:'Pull a Legendary ore',max:1,get:nL,reward:1},
 {id:'l5',icon:'👑',name:'Legend Hoard',desc:'Own 5 Legendary ores',max:5,get:nL,reward:3},
 {id:'gold',icon:'⭐',name:'Shiny!',desc:'Pull a Golden variant',max:1,get:()=>nV('golden'),reward:1},
 {id:'rain',icon:'🌈',name:'Over the Rainbow',desc:'Pull a Rainbow variant',max:1,get:()=>nV('rainbow'),reward:2},
 {id:'hack',icon:'👾',name:'Glitch in the Matrix',desc:'Pull a Hacker variant',max:1,get:()=>nV('hacker'),reward:5},
 {id:'dupe',icon:'👯',name:'Triplets',desc:'Own 3 copies of the same ore',max:3,get:dupMax,reward:1},
 {id:'deck',icon:'🃏',name:'Deck Master',desc:'Fill your deck with 10 ores',max:10,get:()=>s.deck.length,reward:1},
 {id:'hold',icon:'📦',name:'Packed House',desc:'Hold 10 unopened packs',max:10,get:()=>s.packs,reward:1},
 {id:'w1',icon:'⚔️',name:'First Blood',desc:'Win a duel',max:1,get:()=>s.st.wins,reward:1},
 {id:'w10',icon:'🎖️',name:'Veteran',desc:'Win 10 duels',max:10,get:()=>s.st.wins,reward:3},
 {id:'hard',icon:'🔥',name:'Hard Mode Hero',desc:'Win a duel on Hard',max:1,get:()=>s.st.hard,reward:3},
 {id:'str',icon:'⚡',name:'On Fire',desc:'Win 3 duels in a row',max:3,get:()=>s.st.best,reward:2},
 {id:'flaw',icon:'💎',name:'Flawless Victory',desc:'Win without losing any health',max:1,get:()=>s.st.flawless,reward:2},
 {id:'clutch',icon:'❤️‍🔥',name:'Clutch',desc:'Win with 3 health or less',max:1,get:()=>s.st.clutch,reward:2},
 {id:'blitz',icon:'🚀',name:'Pack Blitz',desc:'Use Open all on 5+ packs',max:1,get:()=>s.st.blitz,reward:1}
];
let inCk=false,tq=0;
function toast(a){setTimeout(()=>{const t=document.createElement('div');t.className='toast';
 t.innerHTML=`<span class="ti">${a.icon}</span><div><div class="tk">Achievement unlocked</div><b>${a.name}</b><div class="muted">${a.desc}</div>${a.reward?`<div class="tr">+${a.reward} pack${a.reward>1?'s':''}</div>`:''}</div>`;
 box0.appendChild(t);SFX.packGain();const r=t.getBoundingClientRect();FX.burst(r.left+30,r.top+30,'#e3bd68',30,8);setTimeout(()=>t.remove(),4800)},tq++*700);setTimeout(()=>tq=Math.max(0,tq-1),tq*700+800)}
function updAch(){const n=ACH.filter(a=>s.ach[a.id]).length;$('#achCnt').textContent=n+'/'+ACH.length}
function checkAch(){
 if(inCk)return;inCk=true;let ch=false;
 ACH.forEach(a=>{if(!s.ach[a.id]&&a.get()>=a.max){s.ach[a.id]=Date.now();s.packs+=a.reward;ch=true;toast(a)}});
 if(ch)save0();
 inCk=false;updAch();if(!$('#achView').hidden)renderAch();
}
function renderAch(){
 const done=ACH.filter(a=>s.ach[a.id]).length;
 $('#achSum').innerHTML=`<b>${done} / ${ACH.length}</b> unlocked<div class="abar"><i style="width:${done/ACH.length*100}%"></i></div>`;
 $('#achGrid').innerHTML=ACH.map(a=>{const v=Math.min(a.get(),a.max),ok=!!s.ach[a.id];
  return `<div class="ach ${ok?'done':''}"><div class="ai">${a.icon}</div><b>${a.name}</b><div class="muted">${a.desc}</div><div class="abar"><i style="width:${v/a.max*100}%"></i></div><div class="amt">${ok?'✔ Unlocked':v+' / '+a.max}${a.reward?` · 🎁 ${a.reward} pack${a.reward>1?'s':''}`:''}</div></div>`}).join('')}
/* UI injection */
document.querySelector('main').insertAdjacentHTML('beforeend','<div id="achView" hidden><div class="kicker">Milestones</div><h1>Achievements</h1><div class="panel" id="achSum" style="margin-bottom:14px"></div><div class="grid" id="achGrid"></div></div>');
$('#mute').insertAdjacentHTML('beforebegin','<button class="tab" data-v="ach" id="achTab">🏆 <span id="achCnt">0/0</span></button>');
$('#achTab').onclick=()=>view('ach');
$('#open').insertAdjacentHTML('afterend','<button id="openAll">Open all</button>');
const updOA=()=>{const b=$('#openAll');b.textContent='Open all ('+s.packs+')';b.disabled=s.packs<1};
/* hooks */
const save0=save,_view=view,_stats=stats,_eg2=endGame;
window.save=function(){save0();checkAch()};
window.stats=function(){_stats();updOA()};
window.view=function(v){_view(v);$('#achView').hidden=v!=='ach';if(v==='ach')renderAch()};
window.endGame=function(r){
 if(G&&!G.over){const t=s.st;
  if(r==='win'){t.wins++;t.streak++;t.best=Math.max(t.best,t.streak);if(G.diff.name==='Hard')t.hard++;if(G.p.hp>=START_HP)t.flawless++;if(G.p.hp<=3)t.clutch++}
  else if(r==='lose')t.streak=0}
 _eg2(r)};
/* open all */
function openAll(){
 if(opening||s.packs<1)return;opening=true;
 const n=s.packs,got=[];
 for(let i=0;i<n;i++){const rar=rollRarity(),pool=catalog.filter(c=>c.rarity===rar);
  got.push({...pool[Math.floor(Math.random()*pool.length)],copy:crypto.randomUUID(),variant:rollVariant(1)})}
 s.packs=0;s.owned.push(...got);if(n>=5)s.st.blitz=1;if(n>=25)s.st.blitz25=1;save();packTick();
 const RK={Exotic:5,Mythic:4,Legendary:3,Epic:2,Rare:1,Common:0},VK={'':0,golden:1,rainbow:2,hacker:3,checkered:4};
 const sorted=[...got].sort((a,b)=>RK[b.rarity]-RK[a.rarity]||VK[b.variant||'']-VK[a.variant||'']),best=sorted[0];
 const tl={};got.forEach(c=>tl[c.rarity]=(tl[c.rarity]||0)+1);
 const vs=got.filter(c=>c.variant).length,d=Math.min(110,2400/n);
 const rv=$('#reveal'),box=$('#modalbox');
 rv.className='allgrid';
 rv.innerHTML='<div class="grid">'+sorted.map((c,i)=>`<div class="flipin" style="animation-delay:${i*d}ms">${card(c,1)}</div>`).join('')+'</div>';
 $('#revealTitle').textContent=`Opened ${n} pack${n>1?'s':''}!`;
 const tg=$('#revealTag');tg.style.color='#e3bd68';
 tg.textContent=['Exotic','Mythic','Legendary','Epic','Rare','Common'].filter(k=>tl[k]).map(k=>tl[k]+' '+k).join(' · ')+(vs?' · '+vs+' variant'+(vs>1?'s':''):'');
 box.dataset.v='';box.classList.add('wide');$('#close').disabled=false;$('#openAgain').hidden=true;$('#modal').classList.add('show');
 sorted.forEach((c,i)=>setTimeout(()=>{SFX.deal();const el=rv.querySelectorAll('.flipin')[i];
  if(el&&(c.variant||RK[c.rarity]>=2)){const [x,y]=ctr(el);FX.burst(x,y,c.variant?{golden:'#f0c24a',rainbow:'#ff78c8',hacker:'#18ff6d',checkered:'#ffffff'}[c.variant]:c.rarity==='Legendary'?'#ffd96a':'#c18bd7',c.variant||c.rarity==='Legendary'?40:20,9)}},i*d));
 setTimeout(()=>{box.dataset.v=best.variant||'';SFX.reveal(best.rarity,best.variant);opening=false;renderCollection()},n*d+450);
}
$('#openAll').onclick=openAll;
['#close','#open','#openAgain'].forEach(q=>$(q).addEventListener('click',()=>$('#modalbox').classList.remove('wide')));
updOA();updAch();setTimeout(checkAch,900);

/* ===== Admin panel gate / pack-limit message ===== */
/* Admin panel is now account-gated; no keyboard shortcut. */
setInterval(()=>{if(s.packs>window.PACK_MAX)$('#packTimer').textContent=`Over the limit: ${s.packs} packs stored (normal cap ${window.PACK_MAX}, free packs paused until you drop below it)`},1000);

/* ===== Reset data dialog (R key) ===== */
/* ===== R key: reset data confirmation ===== */
function closeReset(){const e=document.getElementById('rsBack');if(e)e.remove()}
function openReset(){
 if(document.getElementById('rsBack'))return;
 const d=document.createElement('div');d.className='rs-back';d.id='rsBack';
 d.innerHTML='<div class="rs-box"><div style="font-size:40px">⚠️</div><h2>Do You Want To Reset Your Data?</h2><div class="muted">This deletes your ores, deck, packs and achievements.</div><div class="actions"><button id="rsYes">Yes</button><button id="rsNo">No</button></div></div>';
 document.body.appendChild(d);SFX.error();
 $('#rsNo').focus();
 $('#rsNo').onclick=closeReset;
 d.onclick=e=>{if(e.target===d)closeReset()};
 $('#rsYes').onclick=()=>{
  window.save=()=>{};
  try{localStorage.removeItem('ore-gacha-save')}catch(e){}
  location.reload();
 };
}
addEventListener('keydown',e=>{
 if(e.key==='Escape'){closeReset();return}
 if(e.key.toLowerCase()!=='r'||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
 const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return;
 openReset();
});

/* ===== Deck builder filters ===== */
/* ===== Deck builder filters ===== */
function renderDeck(){
 const dk=groupOres(s.owned.filter(c=>s.deck.includes(c.copy)));
 $('#deck').innerHTML=dk.length?dk.map(g=>`<div>${card(g.c,g.copies.length)}<button style="width:100%" onclick="removeC('${g.copies[0]}')">Remove 1</button></div>`).join(''):'<div class="empty">Your deck is empty.</div>';
 const q=$('#dSearch').value.toLowerCase().trim(),r=$('#dRar').value,m=$('#dMut').value,du=$('#dDup').value;
 const all=groupOres(s.owned.filter(c=>!s.deck.includes(c.copy)));
 const b=all.filter(g=>{const c=g.c,n=g.copies.length;
  return (c.name+' '+(VNAME[c.variant]||'')).toLowerCase().includes(q)&&(r==='all'||c.rarity===r)&&(m==='all'||(m==='none'?!c.variant:c.variant===m))&&(du==='all'||(du==='dup'?n>1:n===1))});
 $('#choices').innerHTML=b.length?b.map(g=>`<div>${card(g.c,g.copies.length)}<button style="width:100%" onclick="addC('${g.copies[0]}')" ${s.deck.length>=DECK_MAX?'disabled':''}>Add to deck</button></div>`).join(''):`<div class="empty">${all.length?'No ores match your filters.':'No other ores available.'}</div>`;
 $('#dCount').textContent=all.length?`Showing ${b.length} of ${all.length}`:'';
}
['dSearch','dRar','dMut','dDup'].forEach(id=>{const e=$('#'+id);e.oninput=e.onchange=renderDeck});
$('#dReset').onclick=()=>{$('#dSearch').value='';['dRar','dMut','dDup'].forEach(id=>$('#'+id).value='all');renderDeck()};
renderDeck();

/* ===== 100 new ores, Mythic/Exotic, Checkered, extra achievements ===== */
/* ===== 100 NEW ORES, MYTHIC + EXOTIC, CHECKERED ===== */
(function(){
const N={"Common": ["Granite", "Basalt", "Pumice", "Shale", "Slate", "Gypsum", "Mica", "Talc", "Feldspar", "Dolomite", "Flint", "Chalk", "Bauxite", "Zinc Ore", "Nickel Ore", "Magnetite", "Hematite", "Pyrite", "Graphite", "Marble", "Sandstone", "Cobaltite", "Borax", "Salt Crystal", "Clay Nodule"], "Rare": ["Garnet", "Peridot", "Tourmaline", "Citrine", "Tanzanite", "Zircon", "Spinel", "Alexandrite", "Turquoise", "Lapis Lazuli", "Malachite", "Rhodonite", "Carnelian", "Onyx", "Jasper", "Agate", "Amber", "Kunzite", "Sunstone", "Iolite", "Fluorite", "Azurite", "Labradorite", "Sodalite", "Tiger's Eye"], "Epic": ["Black Opal", "Fire Opal", "Padparadscha", "Star Sapphire", "Pigeon Blood Ruby", "Imperial Topaz", "Paraiba Tourmaline", "Demantoid", "Cat's Eye", "Larimar", "Charoite", "Sugilite", "Benitoite", "Painite", "Jeremejevite", "Musgravite", "Taaffeite", "Red Beryl", "Grandidierite", "Serendibite"], "Legendary": ["Aurora Gem", "Thunder Core", "Frostheart", "Magma Heart", "Tidal Pearl", "Storm Prism", "Sunforge Ingot", "Nightfall Opal", "Titan's Tear", "Siren Sapphire", "Wyrmfang Crystal", "Angel's Halo", "Warlock Geode", "Hydra Emerald", "Griffon Amber"], "Mythic": ["Abyssal Core", "Worldheart", "Chrono Shard", "Ragnarok Ruby", "Yggdrasil Jade", "Leviathan Pearl", "Valkyrie Diamond", "Cerberus Onyx", "Behemoth Stone", "Seraph Prism"], "Exotic": ["Singularity", "Dark Matter Ore", "Quasar Crystal", "Neutron Star Fragment", "Antimatter Gem"]};
const P0={Common:13,Rare:23,Epic:28,Legendary:34,Mythic:44,Exotic:56},H0={Common:40,Rare:54,Epic:63,Legendary:75,Mythic:92,Exotic:110},SAT={Common:14,Rare:55,Epic:65,Legendary:75,Mythic:88,Exotic:96};
let k=0;
Object.keys(N).forEach(r=>N[r].forEach((nm,j)=>{
 const h=r==='Exotic'?170+(j*37)%120:(k*53+j*17)%360,sa=SAT[r],w=nm.replace("'s",'').split(' ');
 catalog.push({id:catalog.length,name:nm,rank:8000+k*29,rarity:r,symbol:(w.length>1?w[0][0]+w[1][0]:nm.slice(0,2)).toUpperCase(),
  light:`hsl(${h},${sa}%,84%)`,ore:`hsl(${h},${sa}%,52%)`,dark:`hsl(${h},${sa}%,22%)`,power:P0[r]+(k*7)%5,hp:H0[r]+(k*11)%9});k++}));
COST.Mythic=5;COST.Exotic=6;
VNAME.checkered='Checkered';VICON.checkered='🏁';VBONUS.checkered=[5,5];
DIFFS[0].w.Mythic=0;DIFFS[0].w.Exotic=0;DIFFS[1].w.Mythic=.15;DIFFS[1].w.Exotic=.05;DIFFS[2].w.Mythic=.6;DIFFS[2].w.Exotic=.25;
window.rollRarity=()=>{const r=Math.random();return r<.003?'Exotic':r<.015?'Mythic':r<.08?'Legendary':r<.30?'Epic':r<.70?'Rare':'Common'};
const _rv0=rollVariant;
window.rollVariant=m=>Math.random()<1e-6*(m===undefined?1:m)?'checkered':_rv0(m);
['Mythic','Exotic'].forEach(r=>['#filter','#dRar'].forEach(q=>{const e=$(q);e.insertBefore(new Option(r,r),e.options[1])}));
$('#dMut').appendChild(new Option('Checkered','checkered'));
/* achievements */
const rc=r=>new Set(s.owned.filter(c=>c.rarity===r).map(c=>c.name)).size,tot=r=>catalog.filter(c=>c.rarity===r).length,nr=r=>s.owned.filter(c=>c.rarity===r).length,uq=()=>new Set(s.owned.map(c=>c.name)).size;
ACH.find(a=>a.id==='uall').max=catalog.length;
ACH.push(
 {id:'myth1',icon:'🔮',name:'Myth Made Real',desc:'Pull a Mythic ore',max:1,get:()=>nr('Mythic'),reward:5},
 {id:'myth3',icon:'🌌',name:'Mythic Collector',desc:'Own 3 Mythic ores',max:3,get:()=>nr('Mythic'),reward:10},
 {id:'exo1',icon:'🛸',name:'Beyond Reality',desc:'Pull an Exotic ore',max:1,get:()=>nr('Exotic'),reward:10},
 {id:'exo3',icon:'☄️',name:'Exotic Taste',desc:'Own 3 Exotic ores',max:3,get:()=>nr('Exotic'),reward:20},
 {id:'chk',icon:'🏁',name:'Checkered Flag',desc:'Pull a Checkered mutation (1 in 1,000,000)',max:1,get:()=>nV('checkered'),reward:25},
 {id:'mut4',icon:'🧬',name:'Mutation Master',desc:'Own all 4 mutation types',max:4,get:()=>['golden','rainbow','hacker','checkered'].filter(v=>nV(v)>0).length,reward:15},
 {id:'gold10',icon:'🥇',name:'Gold Rush',desc:'Own 10 Golden ores',max:10,get:()=>nV('golden'),reward:3},
 {id:'u50',icon:'🧭',name:'Explorer',desc:'Discover 50 different ores',max:50,get:uq,reward:3},
 {id:'u100',icon:'🗺️',name:'Cartographer',desc:'Discover 100 different ores',max:100,get:uq,reward:8},
 {id:'setC',icon:'🪨',name:'Common Set',desc:'Discover every Common ore',max:tot('Common'),get:()=>rc('Common'),reward:2},
 {id:'setR',icon:'💙',name:'Rare Set',desc:'Discover every Rare ore',max:tot('Rare'),get:()=>rc('Rare'),reward:3},
 {id:'setE',icon:'💜',name:'Epic Set',desc:'Discover every Epic ore',max:tot('Epic'),get:()=>rc('Epic'),reward:5},
 {id:'setL',icon:'💛',name:'Legendary Set',desc:'Discover every Legendary ore',max:tot('Legendary'),get:()=>rc('Legendary'),reward:8},
 {id:'setM',icon:'💗',name:'Mythic Set',desc:'Discover every Mythic ore',max:tot('Mythic'),get:()=>rc('Mythic'),reward:15},
 {id:'setX',icon:'🩵',name:'Exotic Set',desc:'Discover every Exotic ore',max:tot('Exotic'),get:()=>rc('Exotic'),reward:20},
 {id:'o250',icon:'🏔️',name:'Mountain of Ore',desc:'Own 250 ores',max:250,get:()=>s.owned.length,reward:5},
 {id:'o500',icon:'🌋',name:'Ore Tycoon',desc:'Own 500 ores',max:500,get:()=>s.owned.length,reward:10},
 {id:'l15',icon:'🏆',name:'Legendary Vault',desc:'Own 15 Legendary ores',max:15,get:nL,reward:5},
 {id:'dupe10',icon:'🧱',name:'Copy Machine',desc:'Own 10 copies of the same ore',max:10,get:dupMax,reward:3},
 {id:'elite',icon:'💠',name:'Elite Deck',desc:'Deck of 10 Epic-or-better ores',max:10,get:()=>s.owned.filter(c=>s.deck.includes(c.copy)&&['Epic','Legendary','Mythic','Exotic'].includes(c.rarity)).length,reward:5},
 {id:'w25',icon:'🥊',name:'Duelist',desc:'Win 25 duels',max:25,get:()=>s.st.wins,reward:5},
 {id:'w50',icon:'🗡️',name:'Champion',desc:'Win 50 duels',max:50,get:()=>s.st.wins,reward:10},
 {id:'str5',icon:'🌪️',name:'Unstoppable',desc:'Win 5 duels in a row',max:5,get:()=>s.st.best,reward:5},
 {id:'blitz25',icon:'💥',name:'Mega Blitz',desc:'Use Open all on 25+ packs',max:1,get:()=>s.st.blitz25||0,reward:3},
 {id:'hold50',icon:'🧳',name:'Pack Hoarder',desc:'Hold 50 unopened packs',max:50,get:()=>s.packs,reward:5}
);
updAch();renderCollection();renderDeck();
if(!$('#achView').hidden)renderAch();
setTimeout(checkAch,1200);
})();

/* ===== Admin panel ===== */
/* ===== ADMIN PANEL ===== */
(function(){
const RARS=['Exotic','Mythic','Legendary','Epic','Rare','Common'];
const A=window.ADMIN={on:false,rar:'random',mut:'random'};
window.ORE_IS_ADMIN=false;
const _rr=rollRarity,_rv1=rollVariant;
window.rollRarity=()=>A.on&&A.rar!=='random'?A.rar:_rr();
/* m===1 is how pack openings call it; bot decks pass other values, so duels are unaffected */
window.rollVariant=m=>A.on&&m===1&&A.mut!=='random'?(A.mut==='none'?'':A.mut):_rv1(m);
const rar=$('#aRar'),ore=$('#aOre'),mut=$('#aMut');
rar.innerHTML='<option value="random">Random (natural odds)</option>'+RARS.map(r=>`<option>${r}</option>`).join('');
function fillOres(){ore.innerHTML='<option value="">'+(rar.value==='random'?'Random ore':'Random '+rar.value+' ore')+'</option>'+
 (rar.value==='random'?'':catalog.filter(c=>c.rarity===rar.value).map(c=>`<option value="${c.id}">${c.name}</option>`).join(''))}
function status(){
 const b=$('#aForce');b.classList.toggle('on',A.on);b.textContent='Guarantee in packs: '+(A.on?'ON':'OFF');
 const r=A.rar==='random'?'any rarity':A.rar,m=A.mut==='random'?'natural mutation':A.mut==='none'?'no mutation':VNAME[A.mut]+' mutation';
 $('#aStatus').textContent=A.on?`▶ Every pack you open is now guaranteed: ${r} · ${m}`:'Pick a rarity and mutation, then give ores directly or guarantee every pack you open.';
}
function sync(){A.rar=rar.value;A.mut=mut.value;status()}
rar.onchange=()=>{fillOres();sync()};mut.onchange=sync;
fillOres();
$('#aForce').onclick=()=>{A.on=!A.on;sync();SFX.click();if(A.on)FX.burst(innerWidth/2,innerHeight/2,'#4dfff0',30,8)};
$('#aPacks').onclick=()=>{s.packs+=100;save();packTick();SFX.packGain();FX.burst(innerWidth/2,innerHeight/2,'#e3bd68',40,9)};
function mk(){
 let o=ore.value!==''?catalog[+ore.value]:null;
 if(!o){const rr=rar.value==='random'?_rr():rar.value,pool=catalog.filter(c=>c.rarity===rr);o=pool[Math.floor(Math.random()*pool.length)]}
 const m=mut.value;
 return {...o,copy:crypto.randomUUID(),variant:m==='random'?_rv1(1):m==='none'?'':m};
}
$('#aGive').onclick=async()=>{
 const n=Math.max(1,Math.min(100,Math.floor(+$('#aQty').value)||1)),list=Array.from({length:n},mk);
 const target=$('#aTargetUid').value.trim();
 const statusEl=$('#aStatus');
 if(target){
  if(!/^[A-Za-z0-9]{20,40}$/.test(target)){statusEl.textContent='Enter a valid Firebase account UID, or leave it blank to give cards to yourself.';return;}
  if(!firebase.auth().currentUser||!window.ORE_IS_ADMIN){statusEl.textContent='Admin sign-in required.';return;}
  try{
   const db=firebase.firestore(),ref=db.collection('players').doc(target);
   await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists)throw new Error('That player has not signed in and created a save yet.');
    const data=snap.data(),game= data.gameData&&typeof data.gameData==='object'?data.gameData:{};
    const owned=Array.isArray(game.owned)?game.owned:[];
    tx.set(ref,{gameData:{...game,owned:[...owned,...list],deck:Array.isArray(game.deck)?game.deck:[],packs:Number.isFinite(game.packs)?game.packs:3,lastPack:Number.isFinite(game.lastPack)?game.lastPack:Date.now()},updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
   });
   statusEl.textContent=`Successfully sent ${n} card${n===1?'':'s'} to account ${target}. They may need to refresh or sign in again to see them.`;
   return;
  }catch(e){statusEl.textContent='Could not send cards: '+e.message+' Check the admin Firestore rules below.';return;}
 }
 s.owned.push(...list);save();renderCollection();renderDeck();
 const RK={Exotic:5,Mythic:4,Legendary:3,Epic:2,Rare:1,Common:0},VK={'':0,golden:1,rainbow:2,hacker:3,checkered:4};
 const sorted=[...list].sort((a,b)=>RK[b.rarity]-RK[a.rarity]||VK[b.variant||'']-VK[a.variant||'']),best=sorted[0];
 const rv=$('#reveal'),box=$('#modalbox'),d=Math.min(80,1800/n);
 rv.className='allgrid';
 rv.innerHTML='<div class="grid">'+sorted.map((c,i)=>`<div class="flipin" style="animation-delay:${i*d}ms">${card(c,1)}</div>`).join('')+'</div>';
 $('#revealTitle').textContent=`Admin: added ${n} ore${n>1?'s':''}`;
 const tg=$('#revealTag');tg.style.color='#4dfff0';tg.textContent=best.rarity+(best.variant?' · '+VNAME[best.variant]:'');
 box.dataset.v=best.variant||'';box.classList.add('wide');$('#close').disabled=false;$('#openAgain').hidden=true;$('#modal').classList.add('show');
 setTimeout(()=>SFX.reveal(best.rarity,best.variant),Math.min(n*d,1500));
};
})();

/* ===== Firebase accounts, cloud saves, leaderboard, multiplayer ===== */
/* ---------- Firebase accounts + cloud saves ---------- */
(function(){
 const firebaseConfig={
  apiKey:"AIzaSyBvNG0qMTl8oD0qpEwCc64N6K3qyVfD69c",
  authDomain:"ore-gacha.firebaseapp.com",
  projectId:"ore-gacha",
  storageBucket:"ore-gacha.firebasestorage.app",
  messagingSenderId:"757975232977",
  appId:"1:757975232977:web:db72d59577f6eb428bf0f0"
 };
 const msg=document.getElementById('authMessage'),form=document.getElementById('authForm');
 const heading=document.getElementById('authHeading'),sub=document.getElementById('authSub'),submit=document.getElementById('authSubmit');
 const usernameField=document.getElementById('usernameField'),toggle=document.getElementById('authToggle'),reset=document.getElementById('authReset');
 let creating=false,currentUser=null,saveTimer=null,ready=false;
 const say=t=>msg.textContent=t;
 try{firebase.initializeApp(firebaseConfig)}catch(e){say('Firebase could not start: '+e.message);return}
 const auth=firebase.auth(),db=firebase.firestore();
 let roomRef=null,roomUnsub=null,roomData=null,publishing=false;
 const roomCode=()=>Math.random().toString(36).slice(2,8).toUpperCase();
 function mpStatus(t){const el=document.getElementById('mpStatus');if(el)el.textContent=t}
 function setRoomUI(inRoom,host){document.getElementById('mpStart').hidden=!(inRoom&&host);document.getElementById('mpLeave').hidden=!inRoom;document.getElementById('mpCreate').disabled=inRoom;document.getElementById('mpJoin').disabled=inRoom}
 function canonicalState(){if(!G)return null;const st=JSON.parse(JSON.stringify(G));if(MP.role==='guest'){const p=st.p;st.p=st.b;st.b=p;st.turn=st.turn==='player'?'opponent':st.turn==='opponent'?'player':st.turn;}return st}
 function localState(st){const x=JSON.parse(JSON.stringify(st));if(MP.role==='guest'){const p=x.p;x.p=x.b;x.b=p;x.turn=x.turn==='player'?'opponent':x.turn==='opponent'?'player':x.turn;}return x}
 function queuePublish(){if(!roomRef||!G||MP.applying||G.over)return;clearTimeout(MP.publishTimer);MP.publishTimer=setTimeout(async()=>{if(publishing||!roomRef||!G)return;publishing=true;try{await roomRef.update({state:canonicalState(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(e){mpStatus('Sync error: '+e.message)}finally{publishing=false}},180)}
 function subscribe(ref,role,code){if(roomUnsub)roomUnsub();roomRef=ref;MP.active=true;MP.role=role;MP.room=code;MP.uid=currentUser.uid;setRoomUI(true,role==='host');roomUnsub=ref.onSnapshot(snap=>{if(!snap.exists){mpStatus('Room no longer exists.');return}const d=snap.data();roomData=d;if(d.guestUid&&d.guestUid!==currentUser.uid)MP.opponent=d.guestName||'Opponent';if(role==='host')MP.opponent=d.guestName||'Opponent';else MP.opponent=d.hostName||'Host';if(!d.guestUid){mpStatus('Room '+code+' created. On the second account, join with this code.');return}if(!d.state){mpStatus('Both players connected. Host can start the match.');return}const oldTurn=G&&G.turn;MP.applying=true;G=localState(d.state);uidc=Math.max(uidc,1+Math.max(0,...[...G.p.hand,...G.b.hand,...G.p.deck,...G.b.deck,...G.p.discard,...G.b.discard,...G.p.board,...G.b.board].filter(Boolean).map(u=>u.uid||0)));$('#result').hidden=!G.over;mpStatus('Room '+code+' · Connected to '+MP.opponent+'.');render();MP.applying=false;if(!G.over&&G.turn==='player'&&oldTurn!==null&&oldTurn!=='player'){G.p.energy=Math.min(10,G.round+1);draw(G.p,1);G.p.board.forEach(u=>{if(u)u.ready=true});G.t=TURN_SECONDS;startTimer();render()}else if(G.turn!=='player')clearInterval(timerId);if(G.over)showMPResult();});}
 function showMPResult(){const winner=roomData&&roomData.winner;$('#result').innerHTML='<h2>'+(winner===currentUser.uid?'🏆 You won!':'Duel over')+'</h2><p>Multiplayer match finished.</p><button class="primary" id="again" onclick="location.reload()">Back to game</button>';$('#result').hidden=false}
 window.oreMP={
  async createRoom(){if(!ready||!currentUser)throw new Error('Sign in first.');if(!s.deck.length)throw new Error('Add at least one ore to your deck first.');if(MP.active)throw new Error('Leave your current room first.');let code=roomCode(),ref=db.collection('rooms').doc(code);for(let i=0;i<4;i++){const snap=await ref.get();if(!snap.exists)break;code=roomCode();ref=db.collection('rooms').doc(code)}await ref.set({hostUid:currentUser.uid,hostName:currentUser.displayName||'Host',guestUid:null,guestName:null,state:null,createdAt:firebase.firestore.FieldValue.serverTimestamp()});subscribe(ref,'host',code);$('#mpCode').value=code;mpStatus('Room code: '+code+' — use your second account to join.');},
  async joinRoom(code){if(!ready||!currentUser)throw new Error('Sign in first.');if(MP.active)throw new Error('Leave your current room first.');const ref=db.collection('rooms').doc(code);await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new Error('Room not found.');const d=snap.data();if(d.hostUid===currentUser.uid)throw new Error('Use the other account to join your room.');if(d.guestUid&&d.guestUid!==currentUser.uid)throw new Error('That room is full.');tx.update(ref,{guestUid:currentUser.uid,guestName:currentUser.displayName||'Player 2'});});subscribe(ref,'guest',code);},
  async startMatch(){if(MP.role!=='host'||!roomRef||!roomData||!roomData.guestUid)throw new Error('Wait for the second player to join.');const mine=s.owned.filter(c=>s.deck.includes(c.copy));if(!mine.length)throw new Error('Add ores to your deck first.');const size=Math.min(DECK_MAX,Math.max(6,mine.length)),otherSnap=await db.collection('players').doc(roomData.guestUid).get(),otherSave=otherSnap.exists?normalizeSave(otherSnap.data().gameData):null,other=(otherSave?otherSave.owned.filter(c=>otherSave.deck.includes(c.copy)):[]);if(!other.length)throw new Error('The other account needs at least one ore in its deck.');G={round:1,turn:'player',over:false,sel:null,t:TURN_SECONDS,busy:false,diff:{...DIFFS[1],name:'Multiplayer',reward:0},p:newSide(mine),b:newSide(other)};draw(G.p,4);draw(G.b,4);G.p.energy=2;G.t=TURN_SECONDS;await roomRef.update({state:canonicalState(),started:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});render();startTimer();mpStatus('Match started! You take the first turn.');},
  queuePublish,
  async finish(result){if(!roomRef||!G)return;try{await roomRef.update({state:canonicalState(),winner:result==='draw'?null:(result==='win'?currentUser.uid:(MP.role==='host'?roomData.guestUid:roomData.hostUid)),finished:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(e){mpStatus('Could not save match result: '+e.message)}},
  async leaveRoom(){if(roomUnsub)roomUnsub();roomUnsub=null;roomRef=null;roomData=null;clearInterval(timerId);clearTimeout(MP.publishTimer);MP={active:false,role:null,room:null,uid:null,opponent:null,applying:false,publishTimer:null,lastTurn:null};G=null;setRoomUI(false,false);mpStatus('You left the multiplayer room.');render();}
 };

 function mode(create){creating=create;heading.textContent=create?'Create your Ore Gacha account':'Welcome back';sub.textContent=create?'Choose a username, email, and password.':'Log in to load your cloud save.';usernameField.hidden=!create;document.getElementById('authPassword').autocomplete=create?'new-password':'current-password';submit.textContent=create?'Create account':'Log in';toggle.textContent=create?'I already have an account':'Create an account';say('')}
 toggle.addEventListener('click',()=>mode(!creating));
 reset.addEventListener('click',async()=>{const email=document.getElementById('authEmail').value.trim();if(!email){say('Enter your email first, then choose Forgot password.');return}try{await auth.sendPasswordResetEmail(email);say('Password reset email sent. Check your inbox.')}catch(e){say(e.message)}});
 function normalizeSave(data){const out=data&&typeof data==='object'?{...data}:{};out.owned=Array.isArray(out.owned)?out.owned:[];out.deck=Array.isArray(out.deck)?out.deck:[];out.packs=Number.isFinite(out.packs)?out.packs:3;out.lastPack=Number.isFinite(out.lastPack)&&out.lastPack>0?out.lastPack:Date.now();return out}
 const rarityScore={Common:1,Rare:4,Epic:12,Legendary:35,Mythic:100,Exotic:300};
 const mutationScore={'':0,golden:2,rainbow:5,hacker:10,checkered:20};
 function collectionStats(){
  const owned=s.owned||[],best=[...owned].sort((a,b)=>(rarityScore[b.rarity]||0)+(mutationScore[b.variant||'']||0)-(rarityScore[a.rarity]||0)-(mutationScore[a.variant||'']||0))[0];
  const score=owned.reduce((n,c)=>n+(rarityScore[c.rarity]||0)+(mutationScore[c.variant||'']||0),0);
  return {score,totalCards:owned.length,bestCard:best?(best.name+(best.variant?' · '+(VNAME[best.variant]||best.variant):'')+' ('+best.rarity+')'):'None yet',bestRarity:best?best.rarity:'—',exoticCount:owned.filter(c=>c.rarity==='Exotic').length,mythicCount:owned.filter(c=>c.rarity==='Mythic').length,legendaryCount:owned.filter(c=>c.rarity==='Legendary').length};
 }
 window.oreRenderProfile=function(){if(!currentUser)return;const st=collectionStats(),name=currentUser.displayName||'Player';document.getElementById('profileCard').innerHTML='<h2>'+name.replace(/[&<>"']/g,'')+'</h2><p class="muted">Account ID: '+currentUser.uid+'</p><div class="stats"><div class="stat"><b>'+st.totalCards+'</b><span class="muted">Cards owned</span></div><div class="stat"><b>'+st.score+'</b><span class="muted">Collection score</span></div><div class="stat"><b>'+st.exoticCount+'</b><span class="muted">Exotic cards</span></div></div><p><b>Best / rarest card:</b> '+st.bestCard+'</p><p class="muted">Legendary: '+st.legendaryCount+' · Mythic: '+st.mythicCount+' · Exotic: '+st.exoticCount+'</p>'};
 async function publishLeaderboard(){if(!currentUser||!ready)return;const st=collectionStats();try{await db.collection('leaderboard').doc(currentUser.uid).set({uid:currentUser.uid,username:currentUser.displayName||'Player',...st,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(e){console.warn('Leaderboard update failed:',e.message)}}
 window.oreLoadLeaderboard=async function(){const el=document.getElementById('leaderboardRows');if(!currentUser){el.textContent='Sign in to view the leaderboard.';return}el.textContent='Loading leaderboard…';try{const snap=await db.collection('leaderboard').orderBy('score','desc').limit(50).get();if(snap.empty){el.textContent='No leaderboard entries yet. Open packs to publish your collection!';return}el.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:10px">Rank / Player</th><th style="text-align:left;padding:10px">Score</th><th style="text-align:left;padding:10px">Cards</th><th style="text-align:left;padding:10px">Rarest card</th></tr></thead><tbody>'+snap.docs.map((d,i)=>{const x=d.data();return '<tr><td style="padding:10px;border-top:1px solid #383b43">#'+(i+1)+' · '+String(x.username||'Player').replace(/[&<>"']/g,'')+(x.uid===currentUser.uid?' <b>(You)</b>':'')+'</td><td style="padding:10px;border-top:1px solid #383b43">'+(x.score||0)+'</td><td style="padding:10px;border-top:1px solid #383b43">'+(x.totalCards||0)+'</td><td style="padding:10px;border-top:1px solid #383b43">'+String(x.bestCard||'—').replace(/[&<>"']/g,'')+'</td></tr>'}).join('')+'</tbody></table></div>'}catch(e){el.textContent='Could not load leaderboard. Publish the leaderboard Firestore rules, then refresh. '+e.message}};
 document.getElementById('refreshLeaderboard').onclick=()=>window.oreLoadLeaderboard();
 async function enter(user){currentUser=user;ready=false;say('Loading your cloud save…');
  try{
   const ref=db.collection('players').doc(user.uid),snap=await ref.get();
   if(snap.exists&&snap.data().gameData){s=normalizeSave(snap.data().gameData)}
   else {s=normalizeSave(s);await ref.set({username:user.displayName||user.email.split('@')[0],gameData:s,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}
   localStorage.setItem('ore-gacha-save',JSON.stringify(s));
   stats();renderCollection();renderDeck();render();packTick();
   ready=true;
   // Admin access is managed by Firestore documents: admins/{uid} with active:true.
   window.ORE_IS_ADMIN=false;
   try{const adminDoc=await db.collection('admins').doc(user.uid).get();window.ORE_IS_ADMIN=adminDoc.exists&&adminDoc.data().active===true;}catch(adminErr){console.warn('Admin status lookup failed:',adminErr.message)}
   document.querySelector('.adminwrap').classList.toggle('show',window.ORE_IS_ADMIN);
   await publishLeaderboard();window.oreRenderProfile();document.getElementById('authGate').style.display='none';mpStatus('Signed in. Cloud save enabled.');
   document.querySelector('footer').textContent='Ore Gacha · Signed in as '+(user.displayName||user.email)+' · Cloud save enabled';
  }catch(e){say('Could not load your save: '+e.message+' Check that your Firestore rules are published.');}
 }
 window.oreCloudSave=function(){if(!currentUser||!ready)return;clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await db.collection('players').doc(currentUser.uid).set({gameData:s,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});await publishLeaderboard();if(!document.getElementById('profileView').hidden)window.oreRenderProfile()}catch(e){console.error('Cloud save failed',e);say('Cloud save failed. Check your connection and Firestore rules.')}},700)};
 form.addEventListener('submit',async e=>{e.preventDefault();const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;
  submit.disabled=true;say(creating?'Creating account…':'Logging in…');
  try{
   if(creating){
    const username=document.getElementById('authUsername').value.trim();
    if(!/^[A-Za-z0-9_]{3,16}$/.test(username))throw new Error('Username must be 3–16 letters, numbers, or underscores.');
    const cred=await auth.createUserWithEmailAndPassword(email,password),uid=cred.user.uid,key=username.toLowerCase();
    try{await db.runTransaction(async tx=>{const uref=db.collection('usernames').doc(key),usnap=await tx.get(uref);if(usnap.exists)throw new Error('That username is already taken.');tx.set(uref,{uid,username,createdAt:firebase.firestore.FieldValue.serverTimestamp()});});
     await cred.user.updateProfile({displayName:username});
     await db.collection('players').doc(uid).set({username,gameData:normalizeSave(s),createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    }catch(err){await cred.user.delete();throw err}
   }else{await auth.signInWithEmailAndPassword(email,password)}
  }catch(err){say(err.message)}finally{submit.disabled=false}
 });
 auth.onAuthStateChanged(user=>{if(user)enter(user);else{currentUser=null;ready=false;document.getElementById('authGate').style.display='grid';mode(false)}});
})();

/* ===== Admin badge ===== */
/* ===== ADMIN BADGE (profile, footer, leaderboard for every admin) =====
   Admins publish adminBadges/{uid}; only real admins can write it (see firestore.rules). */
(function(){
 let tries=0;
 function init(){
  if(typeof firebase==='undefined'||!firebase.apps.length){if(tries++<40)setTimeout(init,500);return}
  const B='<span class="abadge" title="Admin">ADMIN</span>';
  const db=firebase.firestore(),auth=firebase.auth();
  const clean=t=>String(t).replace(/[&<>"']/g,'');
  const me=()=>window.__oreAdmin===true||window.ORE_IS_ADMIN===true;

  /* your own name: profile + footer */
  function paintMine(){
   if(!me())return;
   const h=document.querySelector('#profileCard h2');
   if(h&&!h.querySelector('.abadge'))h.insertAdjacentHTML('beforeend',B);
   const f=document.querySelector('footer');
   if(f&&!f.querySelector('.abadge'))f.insertAdjacentHTML('beforeend',B);
  }
  const _p=window.oreRenderProfile;
  if(typeof _p==='function')window.oreRenderProfile=function(){_p.apply(this,arguments);paintMine()};
  const f0=document.querySelector('footer');
  if(f0)new MutationObserver(paintMine).observe(f0,{childList:true});

  /* leaderboard: badge every admin */
  async function paintBoard(){
   const rows=document.querySelectorAll('#leaderboardRows tbody tr');
   if(!rows.length)return;
   const names=new Set();
   try{(await db.collection('adminBadges').get()).forEach(d=>{const x=d.data();if(x.active===true&&x.username)names.add(String(x.username).toLowerCase())})}
   catch(e){console.warn('Admin badge lookup failed:',e.message)}
   rows.forEach(tr=>{
    const td=tr.cells[0];if(!td||td.querySelector('.abadge'))return;
    const you=td.querySelector('b');
    const name=td.textContent.replace(/^#\d+\s*·\s*/,'').replace(/\s*\(You\)\s*$/,'').trim().toLowerCase();
    if(names.has(name)||(you&&me()))you?you.insertAdjacentHTML('beforebegin',B):td.insertAdjacentHTML('beforeend',B);
   });
  }
  const _l=window.oreLoadLeaderboard;
  if(typeof _l==='function')window.oreLoadLeaderboard=async function(){await _l.apply(this,arguments);await paintBoard()};

  /* on sign-in: check admin status, publish (or remove) your badge record */
  auth.onAuthStateChanged(async u=>{
   window.__oreAdmin=false;if(!u)return;
   let ok=false;
   try{const d=await db.collection('admins').doc(u.uid).get();ok=d.exists&&d.data().active===true}catch(e){}
   window.__oreAdmin=ok;
   const ref=db.collection('adminBadges').doc(u.uid);
   try{
    if(ok)await ref.set({uid:u.uid,username:clean(u.displayName||'Player'),active:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    else await ref.delete();
   }catch(e){console.warn('Admin badge sync failed:',e.message)}
   paintMine();
  });
 }
 if(document.readyState==='complete')init();else addEventListener('load',init);
})();

