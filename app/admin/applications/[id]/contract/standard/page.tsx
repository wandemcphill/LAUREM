'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function StandardContractPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  return <main className="wrap" style={{padding:'70px 0 80px',maxWidth:800}}><section className="card" style={{padding:32,textAlign:'center'}}><p style={{color:'var(--accent)',fontWeight:800,letterSpacing:'.08em'}}>CONTRACT WORKFLOW RESTRICTION</p><h1>International Registered Nurse contract only</h1><p style={{color:'var(--muted)',lineHeight:1.7}}>The LAUREM recruitment platform currently generates employment contracts only for international Registered Nurse applications. This route does not create or issue standard contracts for other roles.</p>{id&&<Link href={`/admin/applications/${encodeURIComponent(id)}`} style={{display:'inline-block',marginTop:12,padding:'12px 16px',border:'1px solid var(--line)',borderRadius:9,textDecoration:'none',fontWeight:800}}>Back to candidate</Link>}</section></main>;
}
