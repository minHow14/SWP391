// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/api.test.js
// Kiểm thử (node:test) hàm api dùng fetch: phiên lưu trong bộ nhớ khi storage bị chặn, envelope response và xử lý 401/lỗi mạng.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Lưu descriptor gốc của các biến toàn cục để khôi phục sau mỗi test.
const originals = Object.fromEntries(['window','sessionStorage','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
// Bộ đếm để mỗi lần setup import một bản module api mới, tránh chia sẻ trạng thái giữa các test.
let sequence=0;
// Chuẩn bị môi trường: window giả ghi lại sự kiện, sessionStorage ném lỗi (giả lập trình duyệt chặn storage) và phiên rỗng.
async function setup() {
  const events=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:event=>events.push(event.type)}});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw new Error('Storage blocked');}});
  const api=await import(`../src/services/api.js?case=${sequence++}`);
  const session=await import('../src/utils/session.js');
  session.setSession(null);
  events.length=0;
  return {...api,...session,events};
}
afterEach(()=>{for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});

// Khi storage bị chặn, phiên đăng nhập vẫn hoạt động trong bộ nhớ và vẫn phát sự kiện thay đổi phiên.
test('authentication works in memory when storage is blocked',async()=>{
  const {getSession,setSession,events}=await setup();
  setSession({token:'token',user:{user_id:7}});
  assert.equal(getSession().user.user_id,7);
  setSession(null);
  assert.equal(getSession(),null);
  assert.deepEqual(events,['chayxanh-session','chayxanh-session']);
});
// api phải gắn Bearer token, bóc data từ envelope chuẩn và giữ nguyên response dạng auth (token/user ở cấp gốc).
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
// Tùy chọn includeMeta trả cả envelope (để biết trạng thái nhà cung cấp bản đồ), còn mặc định chỉ trả data.
test('places can retain provider status while existing API callers still receive data', async () => {
  const { api } = await setup();
  const envelope = { success: true, data: { places: [] }, meta: { ziomap: 'unavailable' } };
  globalThis.fetch = async () => new Response(JSON.stringify(envelope));
  assert.deepEqual(await api('/places/nearby', { includeMeta: true }), envelope);
  assert.deepEqual(await api('/places/nearby'), envelope.data);
});
// Response 401 của token cũ không được xóa phiên đăng nhập mới hơn.
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
// 401 của phiên hiện tại thì xóa phiên; lỗi mạng phải được bọc thành thông báo thân thiện và giữ nguyên cause.
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
