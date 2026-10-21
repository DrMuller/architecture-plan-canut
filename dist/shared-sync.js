import {SharedDesignSession} from './shared-session.js?v=e27026fc65f2';
function startSharedDesign(){
const api=window.ivryDesign,$=id=>document.getElementById(id),config=window.IVRY_SHARED_CONFIG||{};
if(!api||!config.url||!config.publishableKey)return;
let origin;try{const url=new URL(config.url);if(url.protocol!=='https:'||url.username||url.password)throw Error();origin=url.origin;}catch{$('shared-status').textContent='Invalid shared storage URL';return;}
if(config.publishableKey.startsWith('sb_secret_')){$('shared-status').textContent='Use a publishable key, never a secret key';return;}
if(config.publishableKey.startsWith('eyJ')){try{const payload=JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')throw Error();}catch{$('shared-status').textContent='Use a publishable key or an anon key';return;}}
async function request(path,body){const response=await fetch(origin+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});let data;try{data=await response.json();}catch{throw new Error('Shared storage returned an unreadable response.');}if(!response.ok){const error=new Error(data.message||'Shared storage request failed ('+response.status+').');error.code=data.code;error.status=response.status;throw error;}return data;}
const conflictBox=document.createElement('div');conflictBox.className='save-status';conflictBox.hidden=true;const message=document.createElement('p');message.textContent='Someone saved a newer shared design. Your draft is still here. Export it as a backup, load the newer design, or explicitly replace it with yours.';const replace=document.createElement('button');replace.className='wide';replace.textContent='Replace latest shared design with my draft';conflictBox.append(message,replace);$('design-status').before(conflictBox);
const session=new SharedDesignSession({
read:async()=>{const rows=await request('ivry_design?id=eq.ivry&select=revision,payload,updated_at');return rows[0];},
write:async(revision,payload)=>{const rows=await request('rpc/ivry_save_design',{expected_revision:revision,design:payload});return rows[0];},
capture:api.capture,apply:payload=>api.apply(payload,{markChanged:false}),fingerprint:api.fingerprint,busy:()=>api.busy,
onPersist:()=>api.saveLocal(false),
onChange:s=>{const error=!!s.error;conflictBox.hidden=!s.conflict;$('save-shared').disabled=s.working||s.conflict;$('load-shared').disabled=s.working;replace.disabled=s.working;
$('shared-status').textContent=s.working?'Connecting to shared design…':s.conflict?'Newer shared design available':error?'Shared connection needs attention':s.dirty?'Changes not yet shared':'Shared design is up to date';
$('shared-detail').textContent=s.error||(s.conflict?'Your local draft has not been overwritten.':s.dirty?'Click Save shared design to make your changes visible to everyone.':`Revision ${s.revision??0} · everyone with the link can edit. Updates are checked every 10 seconds.`);
}
});
window.ivrySharing={changed:()=>session.changed(),base:()=>{const b=session.base();return b?{...b,url:origin}:null;}};
$('save-shared').onclick=()=>session.save();
$('load-shared').onclick=async()=>{if(session.dirty&&!window.confirm('Load the shared design and replace your local draft? Export your draft first if you want to keep it.'))return;await session.refresh({discard:true});};
replace.onclick=()=>session.save({replaceLatest:true});
api.ready.then(recovery=>{if(recovery?.base?.url!==origin)recovery={hasDraft:recovery?.hasDraft,base:null};return session.initialize(recovery);});
setInterval(()=>{if(!document.hidden)session.refresh();},10000);window.addEventListener('focus',()=>session.refresh());
}
if(window.ivryDesign)startSharedDesign();else window.addEventListener('ivry-design-ready',startSharedDesign,{once:true});
