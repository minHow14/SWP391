import { useEffect,useState,useCallback } from 'react';
import { api,getSession,setSession } from './api.js';
import { DatabaseContext } from './databaseContext.js';
export function DatabaseProvider({children}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[user,setUser]=useState(()=>getSession()?.user||null);
  const reload=useCallback(async()=>{try{const catalog=await api('/workspace/catalog');setData(catalog);setError('');return catalog;}catch(e){setError(e.message);throw e;}},[]);
  useEffect(()=>{const controller=new AbortController();api('/workspace/catalog',{signal:controller.signal}).then(catalog=>{setData(catalog);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[]);
  useEffect(()=>{let active=true;const sync=()=>setUser(getSession()?.user||null);window.addEventListener('chayxanh-session',sync);const session=getSession();if(session?.token)api('/auth/me').then(result=>{if(active&&getSession()?.token===session.token)setSession({...session,user:result.user});}).catch(()=>{});return()=>{active=false;window.removeEventListener('chayxanh-session',sync);};},[]);
  return <DatabaseContext.Provider value={{data,error,user,reload}}>{children}</DatabaseContext.Provider>;
}
