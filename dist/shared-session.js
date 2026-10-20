// One revision-checked shared design. Transport and rendering are injected for testing.
export class SharedDesignSession {
constructor({read,write,capture,apply,fingerprint,busy=()=>false,onChange=()=>{},onPersist=()=>{}}){Object.assign(this,{read,write,capture,apply,fingerprint,busy,onChange,onPersist});this.revision=null;this.baseFingerprint=null;this.dirty=false;this.conflict=false;this.working=false;this.error='';}
base(){return this.revision===null?null:{revision:this.revision,fingerprint:this.baseFingerprint};}
changed(){this.dirty=true;this.onChange(this);}
async initialize(recovery){if(recovery?.base){this.revision=recovery.base.revision;this.baseFingerprint=recovery.base.fingerprint;this.dirty=this.fingerprint(this.capture())!==this.baseFingerprint;}else this.dirty=!!recovery?.hasDraft;await this.refresh();}
async refresh({discard=false}={}){
if(this.working||this.busy())return false;this.working=true;this.error='';this.onChange(this);
try{const remote=await this.read();if(!remote||!Number.isInteger(remote.revision))throw new Error('Shared design table is not initialized.');
if(remote.payload===null){this.revision=remote.revision;this.conflict=false;this.dirty=true;}
else if(discard||!this.dirty){if(!discard&&remote.revision===this.revision&&this.baseFingerprint!==null)return true;if(this.busy())return false;await this.apply(remote.payload);this.revision=remote.revision;this.baseFingerprint=this.fingerprint(this.capture());this.dirty=false;this.conflict=false;}
else if(remote.revision!==this.revision){this.conflict=true;}
await this.onPersist();return true;
}catch(error){this.error=error.message;return false;}finally{this.working=false;this.onChange(this);}}
async save({replaceLatest=false}={}){
if(this.working||this.busy())return false;if(this.conflict&&!replaceLatest){this.onChange(this);return false;}
this.working=true;this.error='';this.onChange(this);
try{let expected=this.revision;if(replaceLatest||expected===null){const latest=await this.read();expected=latest.revision;}
const payload=this.capture(),sent=this.fingerprint(payload);const result=await this.write(expected,payload);
this.revision=result.revision;this.baseFingerprint=sent;this.conflict=false;this.dirty=this.fingerprint(this.capture())!==sent;await this.onPersist();return true;
}catch(error){if(error.code==='40001'||error.status===409)this.conflict=true;this.error=error.message;return false;}finally{this.working=false;this.onChange(this);}}
}
