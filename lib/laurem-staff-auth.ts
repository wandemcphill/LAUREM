import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
export const LAUREM_STAFF_COOKIE='laurem_staff_session';
const TTL=7*24*60*60,ITERATIONS=150000,KEY_LENGTH=32;
function secret(){const v=process.env.STAFF_SESSION_SECRET||process.env.ADMIN_SESSION_SECRET||'';if(!v)throw new Error('STAFF_SESSION_SECRET or ADMIN_SESSION_SECRET must be configured.');return v;}
export function hashPassword(p:string,salt=crypto.randomBytes(16).toString('base64url')){const d=crypto.pbkdf2Sync(p,salt,ITERATIONS,KEY_LENGTH,'sha256').toString('base64url');return`pbkdf2_sha256$${ITERATIONS}$${salt}$${d}`;}
export function verifyPassword(p:string,h:string){const[a,it,salt,d]=h.split('$');if(a!=='pbkdf2_sha256'||!it||!salt||!d)return false;const got=crypto.pbkdf2Sync(p,salt,Number(it),KEY_LENGTH,'sha256').toString('base64url');return got.length===d.length&&crypto.timingSafeEqual(Buffer.from(got),Buffer.from(d));}
export function makeActivationToken(){return crypto.randomBytes(32).toString('base64url');}
export function hashActivationToken(t:string){return crypto.createHash('sha256').update(t).digest('hex');}
function sign(v:string){return crypto.createHmac('sha256',secret()).update(v).digest('base64url');}
export function createStaffSession(staff:{id:string;laurem_id:string;email:string;session_version:number}){const p=Buffer.from(JSON.stringify({staff_id:staff.id,laurem_id:staff.laurem_id,email:staff.email.trim().toLowerCase(),session_version:staff.session_version,exp:Date.now()+TTL*1000,nonce:crypto.randomBytes(12).toString('base64url')})).toString('base64url');return`${p}.${sign(p)}`;}
export function readStaffSession(request:NextRequest){const t=request.cookies.get(LAUREM_STAFF_COOKIE)?.value;if(!t)return null;const[p,s]=t.split('.');if(!p||!s)return null;const a=Buffer.from(s),b=Buffer.from(sign(p));if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;try{const d=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));return d.staff_id&&d.laurem_id&&d.email&&d.exp>Date.now()?d:null;}catch{return null;}}
export async function getStaffSession(req:NextRequest){const token=readStaffSession(req);if(!token)return null;const{data:staff}=await db().from('staff_profiles').select('id,laurem_id,email,employment_status,session_version').eq('id',token.staff_id).maybeSingle();if(!staff||!['pending','active'].includes(staff.employment_status)||staff.session_version!==token.session_version)return null;if((staff.laurem_id||'')!==token.laurem_id||staff.email.trim().toLowerCase()!==token.email)return null;return token;}
export function setStaffSession(res:NextResponse,token:string){res.cookies.set(LAUREM_STAFF_COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:TTL});}
export function clearStaffSession(res:NextResponse){res.cookies.set(LAUREM_STAFF_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});}
