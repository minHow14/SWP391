import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const originals = Object.fromEntries(['window','sessionStorage','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
let sequence=0;
async function setup() {
  const events=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:event=>events.push(event.type)}});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw new Error('Storage blocked');}});
  const api=await import(`../src/lib/api.js?case=${sequence++}`);
  return {...api,events};
}
afterEach(()=>{for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});

test('authentication works in memory when storage is blocked',async()=>{
  const {getSession,setSession,events}=await setup();
  setSession({token:'token',user:{user_id:7}});
  assert.equal(getSession().user.user_id,7);
  setSession(null);
  assert.equal(getSession(),null);
  assert.deepEqual(events,['chayxanh-session','chayxanh-session']);
});
test('API supports workspace envelopes and auth responses',async()=>{
  const {api,setSession}=await setup();
  setSession({token:'token'});
  globalThis.fetch=async(url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer token');
    return new Response(JSON.stringify(url.endsWith('/catalog')?{success:true,data:{recipes:[]}}:{success:true,token:'new',user:{user_id:8}}));
  };
  assert.deepEqual(await api('/workspace/catalog'),{recipes:[]});
  assert.equal((await api('/auth/login',{method:'POST',body:{}})).token,'new');
});
test('a stale unauthorized response cannot clear a newer login',async()=>{
  const {api,setSession,getSession}=await setup();
  setSession({token:'old'});
  globalThis.fetch=async()=>{
    setSession({token:'new'});
    return new Response(JSON.stringify({success:false,error:'Expired'}),{status:401});
  };
  await assert.rejects(api('/auth/me'),/Expired/);
  assert.equal(getSession().token,'new');
});
test('current unauthorized session is cleared and network errors retain cause',async()=>{
  const {api,setSession,getSession}=await setup();
  setSession({token:'old'});
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,error:'Expired'}),{status:401});
  await assert.rejects(api('/auth/me'),/Expired/);
  assert.equal(getSession(),null);
  const failure=new TypeError('Connection refused');
  globalThis.fetch=async()=>{throw failure;};
  await assert.rejects(api('/workspace/catalog'),error=>error.cause===failure&&error.message.includes('kết nối'));
});
