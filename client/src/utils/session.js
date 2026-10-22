// client/src/utils/session.js
let memorySession;
export function getSession() {if(memorySession!==undefined)return memorySession;try{return JSON.parse(sessionStorage.getItem('chayxanh-session'))||null;}catch{return null;}}
export function setSession(value) {memorySession=value||null;try{if(value)sessionStorage.setItem('chayxanh-session',JSON.stringify(value));else sessionStorage.removeItem('chayxanh-session');}catch{/* Keep the session in memory if storage is blocked. */}window.dispatchEvent(new Event('chayxanh-session'));}
