// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/services/api.js
import { getSession, setSession } from '../utils/session.js';

export async function api(path,{method='GET',body,signal,includeMeta=false}={}) {
  const session=getSession();
  let response;
  const timeout=AbortSignal.timeout(15000);
  const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
  try{response=await fetch(`/api${path}`,{method,signal:requestSignal,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(session?.token?{Authorization:`Bearer ${session.token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}catch(error){if(signal?.aborted)throw error;if(timeout.aborted)throw new Error('Yêu cầu quá thời gian chờ. Vui lòng thử lại.',{cause:error});throw new Error('Không thể kết nối. Vui lòng thử lại sau.',{cause:error});}
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result?.success){if(response.status===401&&session?.token&&getSession()?.token===session.token)setSession(null);throw new Error(typeof result?.error==='string'?result.error:result?.error?.message||'Không thể tải dữ liệu từ server.');}
  return includeMeta ? result : result.data??result;
}
