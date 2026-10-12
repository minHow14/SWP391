let memorySession;
export function getSession() {if(memorySession!==undefined)return memorySession;try{return JSON.parse(sessionStorage.getItem('chayxanh-session'))||null;}catch{return null;}}
export function setSession(value) {memorySession=value||null;try{if(value)sessionStorage.setItem('chayxanh-session',JSON.stringify(value));else sessionStorage.removeItem('chayxanh-session');}catch{/* Keep the session in memory if storage is blocked. */}window.dispatchEvent(new Event('chayxanh-session'));}
export async function api(path,{method='GET',body,signal}={}) {
  const session=getSession();
  let response;
  const timeout=AbortSignal.timeout(15000);
  const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
  try{response=await fetch(`/api${path}`,{method,signal:requestSignal,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(session?.token?{Authorization:`Bearer ${session.token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}catch(error){if(signal?.aborted)throw error;if(timeout.aborted)throw new Error('Yêu cầu quá thời gian chờ. Vui lòng thử lại.',{cause:error});throw new Error('Không thể kết nối. Vui lòng thử lại sau.',{cause:error});}
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result?.success){if(response.status===401&&session?.token&&getSession()?.token===session.token)setSession(null);throw new Error(typeof result?.error==='string'?result.error:result?.error?.message||'Không thể tải dữ liệu từ server.');}
  return result.data??result;
}
