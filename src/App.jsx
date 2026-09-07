import React, { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { LayoutDashboard, GitBranch, Wallet, User, Shield, Users, LogOut, Menu, X } from "lucide-react";

const money = n => `₱${Number(n || 0).toLocaleString("en-PH", {minimumFractionDigits:2, maximumFractionDigits:2})}`;

function useMember() {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) { setLoading(false); setMember(null); } return; }
      const { data } = await supabase.from("members").select("*").eq("auth_user_id", user.id).single();
      if (mounted) { setMember(data); setLoading(false); }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  return { member, loading };
}

function App() {
  return <Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/MemberLogin" element={<Login/>}/>
    <Route path="/Register" element={<Register/>}/>
    <Route element={<Protected/>}>
      <Route element={<Shell/>}>
        <Route path="/Dashboard" element={<Dashboard/>}/>
        <Route path="/Genealogy" element={<Genealogy/>}/>
        <Route path="/Earnings" element={<Earnings/>}/>
        <Route path="/Monitoring" element={<Monitoring/>}/>
        <Route path="/LevelBonuses" element={<LevelBonuses/>}/>
        <Route path="/Profile" element={<Profile/>}/>
        <Route path="/Admin" element={<Admin/>}/>
        <Route path="/SubAdmin" element={<SubAdmin/>}/>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}

function Landing() {
  return <main className="landing">
    <div className="hero-card">
      <span className="badge">MAMLAKAH NETWORK</span>
      <h1>Build. Connect. Grow.</h1>
      <p>Manage your genealogy network, maintenance status, earnings and withdrawals in one place.</p>
      <div className="actions"><Link className="btn primary" to="/MemberLogin">Member Login</Link><Link className="btn" to="/Register">Register</Link></div>
    </div>
  </main>;
}

function Login() {
  const [username,setUsername]=useState(""), [password,setPassword]=useState(""), [error,setError]=useState(""), [busy,setBusy]=useState(false);
  const nav=useNavigate();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { data, error } = await supabase.functions.invoke("member-login", { body:{username,password} });
    if (error || data?.error) setError(data?.error || error.message);
    else { window.location.href="/Dashboard"; }
    setBusy(false);
  }
  return <AuthCard title="Member Login"><form onSubmit={submit}>
    <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} required /></label>
    <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
    {error && <div className="error">{error}</div>}
    <button className="btn primary full" disabled={busy}>{busy?"Signing in...":"Login"}</button>
    <p className="center">No account? <Link to="/Register">Register</Link></p>
  </form></AuthCard>;
}

function Register() {
  const params=new URLSearchParams(location.search);
  const [form,setForm]=useState({username:"",password:"",confirm:"",full_name:"",email:""});
  const [error,setError]=useState(""),[ok,setOk]=useState(""),[busy,setBusy]=useState(false);
  async function submit(e) {
    e.preventDefault(); setError(""); setOk("");
    if(form.password!==form.confirm) return setError("Passwords do not match.");
    setBusy(true);
    const { data,error }=await supabase.functions.invoke("register-member",{body:{...form,ref:params.get("ref")}});
    if(error||data?.error) setError(data?.error||error.message); else { setOk("Registration successful. You can now log in."); setForm({...form,username:"",password:"",confirm:""}); }
    setBusy(false);
  }
  return <AuthCard title="Create Account"><form onSubmit={submit}>
    {["username","full_name","email"].map(k=><label key={k}>{k==="full_name"?"Full Name":k==="email"?"Email":"Username"}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required={k!=="email"}/></label>)}
    <label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /></label>
    <label>Confirm Password<input type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} required /></label>
    {error&&<div className="error">{error}</div>}{ok&&<div className="success">{ok}</div>}
    <button className="btn primary full" disabled={busy}>{busy?"Creating...":"Register"}</button>
    <p className="center"><Link to="/MemberLogin">Back to login</Link></p>
  </form></AuthCard>;
}

function AuthCard({title,children}) { return <main className="auth"><div className="auth-card"><Link to="/" className="brand">Mamlakah</Link><h2>{title}</h2>{children}</div></main>; }

function Protected() {
  const {member,loading}=useMember();
  if(loading) return <div className="loading">Loading...</div>;
  return member ? <Outlet/> : <Navigate to="/MemberLogin" replace/>;
}

function Shell() {
  const {member}=useMember(); const [open,setOpen]=useState(false);
  const nav=useNavigate();
  const items=[
    ["/Dashboard","Dashboard",LayoutDashboard],
    ["/Genealogy","Mamlakah Tree",GitBranch],
    ["/Earnings","Total Withdrawal",Wallet],
    ["/Monitoring","Monitoring",Users],
    ["/LevelBonuses","ComPlan",Wallet],
    ["/Profile","My Profile",User],
  ];
  if(member?.role==="admin") items.push(["/Admin","Admin Panel",Shield]);
  if(member?.role==="sub_admin") items.push(["/SubAdmin","Sub-Admin",Users]);
  async function logout(){await supabase.auth.signOut();nav("/MemberLogin");}
  return <div className="app"><aside className={open?"sidebar open":"sidebar"}><div className="brand">Mamlakah</div><button className="close" onClick={()=>setOpen(false)}><X/></button>{items.map(([p,n,I])=><Link onClick={()=>setOpen(false)} key={p} to={p}><I size={18}/>{n}</Link>)}<button className="logout" onClick={logout}><LogOut size={18}/>Logout</button></aside><button className="menu" onClick={()=>setOpen(true)}><Menu/></button><section className="content"><div className="maintenance-banner">Maintenance status is calculated from your latest code redemption.</div><Outlet/></section></div>;
}

function Dashboard() {
  const {member}=useMember(); const [code,setCode]=useState(""); const [msg,setMsg]=useState("");
  async function redeem(e){e.preventDefault();setMsg("");const {data,error}=await supabase.functions.invoke("redeem-maintenance-code",{body:{code}});setMsg(error?.message||data?.error||"Maintenance code redeemed successfully.");if(!error&&!data?.error)setCode("");}
  return <Page title={`Welcome, ${member?.full_name||member?.username}`}><div className="grid3"><Stat title="Available Balance" value={money(member?.available_balance)}/><Stat title="Total Earnings" value={money(member?.total_earnings)}/><Stat title="Status" value={<span className="green">Active</span>}/></div><div className="panel"><h3>Redeem Maintenance Code</h3><form className="inline-form" onSubmit={redeem}><input placeholder="MAINT-XXXXXX" value={code} onChange={e=>setCode(e.target.value)} required/><button className="btn primary">Redeem</button></form>{msg&&<p className={msg.includes("success")?"success":"error"}>{msg}</p>}</div></Page>;
}

function Stat({title,value}){return <div className="stat"><span>{title}</span><strong>{value}</strong></div>}

function Genealogy(){const {member}=useMember();return <Page title="Mamlakah Tree"><div className="tree"><div className="node root">{member?.full_name||member?.username}<small>Level {member?.tree_level||0}</small></div><div className="tree-note">Genealogy viewer ready for Supabase member relationships. Connect the recursive query/view to render all five levels and ten slots per member.</div></div></Page>}

function Earnings(){const {member}=useMember();const [rows,setRows]=useState([]);useEffect(()=>{if(member) supabase.from("transactions").select("*").eq("member_id",member.id).order("created_at",{ascending:false}).then(({data})=>setRows(data||[]));},[member]);return <Page title="Earnings"><div className="panel"><h3>Total Withdrawn</h3><strong className="big">{money(rows.filter(x=>x.type==="withdrawal"&&x.status==="completed").reduce((a,x)=>a+Number(x.amount),0)*-1)}</strong></div><div className="panel"><h3>Transactions</h3><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.type}</td><td>{money(r.amount)}</td><td>{r.status}</td></tr>)}</tbody></table></div></div></Page>}

function Monitoring(){return <Page title="1st Level Monitoring"><div className="grid5">{Array.from({length:10},(_,i)=><div className="slot" key={i}><span>Slot {i+1}</span><strong>Open / Loading</strong></div>)}</div></Page>}
function LevelBonuses(){return <Page title="Mamlakah ComPlan"><div className="panel"><table><thead><tr><th>Level</th><th>Bonus</th><th>Max Members</th><th>Total Max</th></tr></thead><tbody>{[[1,150,10,1500],[2,100,100,10000],[3,50,1000,50000],[4,20,10000,200000],[5,10,100000,1000000]].map(r=><tr key={r[0]}><td>{r[0]}</td><td>{money(r[1])}</td><td>{r[2].toLocaleString()}</td><td>{money(r[3])}</td></tr>)}</tbody></table></div></Page>}
function Profile(){const {member}=useMember();return <Page title="My Profile"><div className="panel profile"><p><b>Username:</b> {member?.username}</p><p><b>Name:</b> {member?.full_name}</p><p><b>Email:</b> {member?.email||"—"}</p><p><b>Role:</b> {member?.role}</p><p><b>Referral Code:</b> {member?.referral_code}</p><p><b>GCash:</b> {member?.gcash_number||"Not set"}</p></div></Page>}
function Admin(){return <Page title="Admin Panel"><div className="grid3"><Stat title="Total Members" value="—"/><Stat title="Unused Codes" value="—"/><Stat title="Used Codes" value="—"/></div><div className="panel"><p>Connect the administrative tables and protected Edge Functions described in the Supabase migration.</p></div></Page>}
function SubAdmin(){return <Page title="Sub-Admin Panel"><div className="panel"><p>Assigned codes and managed users will appear here after role assignment.</p></div></Page>}
function Page({title,children}){return <><header className="page-header"><h1>{title}</h1></header>{children}</>}

export default App;