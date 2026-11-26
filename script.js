/* ===== home.js: loads AFTER script.js; drives the new home screen + card look ===== */
(function(){
 // Edit these to make your own redeem codes (each works once per account).
 const CODES={WELCOME:3,ORE10:10};

 /* New card layout: "#rank" on the left, rarity pill on the right, ×N badge */
 window.card=function(c,n){
  const b=bstats(c),r=c.rarity.toLowerCase();
  return `<article class="card ${c.variant?'v-'+c.variant:''}" data-r="${r}" style="--ore:${c.ore||'#68717e'};--ore-light:${c.light||'#d7dce5'};--ore-dark:${c.dark||'#303640'}">
  <div class="chead"><span class="cnum">#${c.rank}</span><span class="tag">${c.rarity}${c.variant?' · '+VNAME[c.variant]:''}</span></div>
  <div class="symbol"><span>${c.symbol}</span></div>
  <h3>${c.name}</h3><div class="muted">⚡${b.cost} · ⚔ ${b.atk} · ♥ ${b.hp}</div>${n>1?`<span class="dup">×${n}</span>`:''}</article>`;
 };

 /* count packs opened (single + open all) */
 let pre=0;
 ['#open','#openAll'].forEach(q=>{
  const el=$(q);if(!el)return;
  el.addEventListener('click',()=>{pre=s.packs},true);
  el.addEventListener('click',()=>{const d=pre-s.packs;if(d>0){s.opened=(s.opened||0)+d;save()}});
 });

 const pad=n=>String(n).padStart(2,'0');
 let lastKey='';
 function recent(){
  const key=s.owned.length+'|'+(s.owned[s.owned.length-1]||{}).copy;
  if(key===lastKey)return;lastKey=key;
  const cnt={};s.owned.forEach(c=>{const k=c.name+'|'+(c.variant||'');cnt[k]=(cnt[k]||0)+1});
  const last=s.owned.slice(-7).reverse();
  $('#recent').innerHTML=last.length?last.map(c=>card(c,cnt[c.name+'|'+(c.variant||'')])).join(''):'<div class="empty">Open a pack to start collecting!</div>';
 }
 function update(){
  const max=window.PACK_MAX||10,ms=window.PACK_MS||60000,full=s.packs>=max;
  const left=full?0:Math.max(0,ms-(Date.now()-s.lastPack)),sec=Math.ceil(left/1000);
  $('#packMax').textContent='/'+max;
  const mins=ms/60000;
  $('#packNote').textContent=`One pack every ${mins===1?'minute':mins+' minutes'}, up to ${max} stored. Earned while you're away.`;
  $('#ring').style.setProperty('--p',full?1:1-left/ms);
  $('#ringTime').textContent=full?'FULL':pad(Math.floor(sec/60))+':'+pad(sec%60);
  const total=catalog.length,uniq=new Set(s.owned.map(c=>c.name)).size;
  const mut=new Set(s.owned.filter(c=>c.variant).map(c=>c.name+'|'+c.variant)).size;
  const pct=uniq/total*100;
  $('#progFill').style.width=pct.toFixed(1)+'%';
  $('#stPct').textContent=pct.toFixed(2)+'%';$('#stPctL').textContent=`Completion (${uniq} / ${total})`;
  $('#stCards').textContent=s.owned.length.toLocaleString();
  $('#stMut').textContent=(mut/total*100).toFixed(2)+'%';$('#stMutL').textContent=`Mutated (${mut} / ${total})`;
  $('#stOpen').textContent=(s.opened||0).toLocaleString();
  recent();
 }

 $('#openColl').onclick=e=>{e.preventDefault();view('collection')};
 $('#inviteBtn').onclick=async()=>{
  const b=$('#inviteBtn');
  try{await navigator.clipboard.writeText(location.href);b.textContent='Link copied!'}catch(e){b.textContent='Copy: '+location.href}
  setTimeout(()=>b.textContent='Invite a friend',2500);
 };
 $('#redeemBtn').onclick=()=>{
  const code=$('#codeIn').value.trim().toUpperCase(),m=$('#redeemMsg');
  s.codes=s.codes||[];
  if(!CODES[code])m.textContent='Invalid code.';
  else if(s.codes.includes(code))m.textContent='You already used that code.';
  else{s.codes.push(code);s.packs+=CODES[code];save();packTick();m.textContent=`+${CODES[code]} packs!`;$('#codeIn').value='';SFX.packGain()}
 };

 /* redraw everything with the new card layout, then keep the home screen live */
 renderCollection();renderDeck();update();
 setInterval(update,1000);
})();
