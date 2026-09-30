import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "ACMA TCO <onboarding@resend.dev>";
const ADMIN_PIN = Deno.env.get("ADMIN_PIN") || "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const safe = (v:any) => String(v ?? "").trim();
const num = (v:any,d=1) => Number(v||0).toLocaleString("es-CL",{minimumFractionDigits:d,maximumFractionDigits:d});
const money = (v:any) => "$"+Math.round(Number(v||0)).toLocaleString("es-CL");
const json = (body:any,status=200) => new Response(JSON.stringify(body),{status,headers:cors});
const publicId = () => {
  const d=new Date(), y=d.getUTCFullYear(), m=String(d.getUTCMonth()+1).padStart(2,"0"), day=String(d.getUTCDate()).padStart(2,"0");
  return "TCO-"+y+m+day+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase();
};
const requirePin = (pin:any) => {
  if(!ADMIN_PIN || safe(pin)!==ADMIN_PIN) throw new Error("PIN de administración inválido");
};
const bytesToBase64 = (bytes:Uint8Array) => {
  let binary=""; const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) binary += String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  return btoa(binary);
};

async function findByClientId(clientId:string){
  const {data,error}=await supabase.from("tco_evaluations").select("*").eq("client_id",clientId).single();
  if(error) throw error; return data;
}

async function makePdf(row:any){
  const p=row.payload||{}, lead=p.lead||row.lead||{}, kam=p.kam||row.kam||{}, r=p.result||row.result||{}, s=p.state||{};
  const pdf=await PDFDocument.create(), page=pdf.addPage([595.28,841.89]);
  const font=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy=rgb(.035,.149,.416), orange=rgb(.949,.549,.094), gray=rgb(.40,.45,.55), dark=rgb(.075,.125,.25), green=rgb(.055,.478,.235);
  const left=48, width=499; let y=790;
  const line=(txt:string,size=9,color=dark,f=font) => { page.drawText(txt,{x:left,y,size,font:f,color}); y-=size+6; };
  const rule=()=>{page.drawLine({start:{x:left,y},end:{x:left+width,y},thickness:1,color:rgb(.86,.89,.93)});y-=14;};
  page.drawText("ACMA · TCO ENFIERRADURA",{x:left,y,size:21,font:bold,color:navy}); y-=27;
  page.drawText(row.public_id,{x:left,y,size:9,font:bold,color:orange}); y-=18;
  line([safe(lead.name),safe(lead.company)].filter(Boolean).join(" · ")||"Visitante",13,dark,bold);
  if(safe(lead.project)) line("Proyecto: "+safe(lead.project),10);
  if(safe(lead.email)) line("Email: "+safe(lead.email),9,gray);
  line("KAM ACMA: "+safe(kam.n)+" · "+safe(kam.m),9,gray); y-=4; rule();
  line("RESULTADO TCO",8,navy,bold);
  line("TCO tradicional: "+money(r.totT),14,navy,bold);
  line("TCO con malla: "+money(r.totI),14,navy,bold);
  line("Diferencia TCO: "+money(r.saving)+" ("+num(r.pct,1)+"%)",14,Number(r.saving)>=0?green:rgb(.70,.14,.09),bold);
  line("Días liberados: "+num(r.dDays,1)+" · Jornadas-hombre liberadas: "+num(r.dJh,0),9,gray); y-=4; rule();
  line("BASE DE LA SIMULACIÓN",8,navy,bold);
  line("Tipología: "+safe(p.caseName),10,dark,bold);
  line("Superficie: "+num(r.m2,0)+" m² · Hormigón: "+num(r.m3,0)+" m³ · Acero: "+num(r.pTon,1)+" t",9);
  line("Cuantía: "+num(r.kgM2,1)+" kg/m² · "+num(r.kgM3,1)+" kg/m³ · Hormigón: "+num(r.consHorm,2)+" m³/m²",9);
  if(Number(r.floors)>0) line("Pisos: "+num(r.floors,0)+" · Incidencia ruta crítica: "+num(r.incRc,1)+"%",9);
  line("Sustitución potencial: "+num(s.pctSust,1)+"% · Productividad malla: +"+num(s.efMalla,1)+"% · Pérdida malla: 1%",9);
  line("Precio barra: "+money(s.cAcero)+"/kg · Precio malla: "+money(s.cMallaFija)+"/kg · GG: "+money(s.ggDia)+"/día",9);
  y-=4; rule();
  line("TRAZABILIDAD",8,navy,bold);
  const vf=(p.validation?.clientFields||row.validation?.clientFields||[]);
  line(vf.length+" variables fueron informadas o confirmadas durante la evaluación.",9);
  if(vf.length) line("Campos validados: "+vf.join(", "),8,gray);
  y-=4; rule();
  line("ALCANCE",8,navy,bold);
  line("Simulación TCO preliminar: material, instalación, pérdidas y gasto general asociado al plazo.",8,gray);
  line("No representa el costo total de obra gruesa. Requiere validación de ingeniería, cubicación y precios vigentes.",8,gray);
  page.drawText("ACMA · "+row.public_id,{x:left,y:28,size:7,font,color:gray});
  return await pdf.save();
}

async function ensurePdf(row:any){
  if(row.pdf_path){
    const {data}=await supabase.storage.from("tco-pdfs").createSignedUrl(row.pdf_path,600);
    if(data?.signedUrl) return {bytes:null,path:row.pdf_path,signedUrl:data.signedUrl};
  }
  const bytes=await makePdf(row), path=row.public_id+".pdf";
  const {error}=await supabase.storage.from("tco-pdfs").upload(path,bytes,{contentType:"application/pdf",upsert:true});
  if(error) throw error;
  await supabase.from("tco_evaluations").update({pdf_path:path,updated_at:new Date().toISOString()}).eq("id",row.id);
  const {data,error:signErr}=await supabase.storage.from("tco-pdfs").createSignedUrl(path,600);
  if(signErr) throw signErr;
  return {bytes,path,signedUrl:data.signedUrl};
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({ok:false,error:"Método no permitido"},405);
  try{
    const body=await req.json(), action=safe(body.action), payload=body.payload||{};

    if(action==="create"){
      const e=payload.evaluation||{};
      if(!safe(e.id)) return json({ok:false,error:"Falta ID local de evaluación"},400);
      const existing=await supabase.from("tco_evaluations").select("id,public_id,pdf_path").eq("client_id",e.id).maybeSingle();
      const pid=existing.data?.public_id||safe(e.publicId)||publicId();
      if(existing.data?.pdf_path) await supabase.storage.from("tco-pdfs").remove([existing.data.pdf_path]);
      const record={
        client_id:e.id,public_id:pid,event:e.event||null,kam:e.kam||{},lead:e.lead||{},case_name:e.caseName||null,
        payload:e,result:e.result||{},validation:e.validation||{},follow:e.follow||{},send_status:e.sendStatus||"Guardada",
        pdf_path:null,updated_at:new Date().toISOString()
      };
      const {data,error}=await supabase.from("tco_evaluations").upsert(record,{onConflict:"client_id"}).select("id,public_id").single();
      if(error) throw error; return json({ok:true,id:data.id,public_id:data.public_id});
    }

    if(action==="list"){
      requirePin(body.pin);
      const {data,error}=await supabase.from("tco_evaluations").select("id,client_id,public_id,created_at,updated_at,payload,follow,send_status,email_sent_at").order("created_at",{ascending:false}).limit(1000);
      if(error) throw error; return json({ok:true,items:data||[]});
    }

    if(action==="update_followup"){
      requirePin(body.pin);
      const {error}=await supabase.from("tco_evaluations").update({follow:payload.follow||{},updated_at:new Date().toISOString()}).eq("client_id",safe(payload.client_id));
      if(error) throw error; return json({ok:true});
    }

    if(action==="delete"){
      requirePin(body.pin);
      const row=await findByClientId(safe(payload.client_id));
      if(row.pdf_path) await supabase.storage.from("tco-pdfs").remove([row.pdf_path]);
      const {error}=await supabase.from("tco_evaluations").delete().eq("id",row.id);
      if(error) throw error; return json({ok:true});
    }

    if(action==="pdf"){
      const row=await findByClientId(safe(payload.client_id)), pdf=await ensurePdf(row);
      return json({ok:true,public_id:row.public_id,signed_url:pdf.signedUrl});
    }

    if(action==="send_email"){
      if(!RESEND_API_KEY) return json({ok:false,error:"RESEND_API_KEY no configurada"},503);
      const row=await findByClientId(safe(payload.client_id)), e=row.payload||{}, lead=e.lead||row.lead||{}, kam=e.kam||row.kam||{};
      if(!safe(lead.email)) return json({ok:false,error:"La evaluación no tiene email de cliente"},400);
      if(!safe(kam.m)) return json({ok:false,error:"El KAM seleccionado no tiene email"},400);
      const pdf=await ensurePdf(row);
      let bytes=pdf.bytes;
      if(!bytes){
        const {data,error}=await supabase.storage.from("tco-pdfs").download(pdf.path);
        if(error) throw error; bytes=new Uint8Array(await data.arrayBuffer());
      }
      const r=e.result||row.result||{};
      const html='<div style="font-family:Arial,sans-serif;color:#13203F;line-height:1.55;max-width:680px">'+
        '<h2 style="color:#09266A">ACMA · Resumen TCO de enfierradura</h2>'+
        '<p>Hola '+safe(lead.name)+',</p><p>Adjuntamos el resumen de la simulación TCO realizada para <b>'+safe(lead.project||lead.company||"tu proyecto")+'</b>.</p>'+
        '<p><b>TCO tradicional:</b> '+money(r.totT)+'<br><b>TCO con malla:</b> '+money(r.totI)+'<br><b>Diferencia estimada:</b> '+money(r.saving)+' ('+num(r.pct,1)+'%)</p>'+
        '<p>La evaluación es preliminar y debe validarse con ingeniería, cubicación y precios vigentes.</p>'+
        '<p>Saludos,<br><b>'+safe(kam.n)+'</b><br>'+safe(kam.c)+'<br>'+safe(kam.m)+' · '+safe(kam.t)+'</p></div>';
      const rr=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({
        from:FROM_EMAIL,to:[safe(lead.email)],cc:[safe(kam.m)],
        subject:"ACMA · TCO · "+(safe(lead.project)||row.public_id),html,
        attachments:[{filename:row.public_id+".pdf",content:bytesToBase64(bytes!)}]
      })});
      const er=await rr.json(); if(!rr.ok) throw new Error(er?.message||"Error al enviar correo");
      await supabase.from("tco_evaluations").update({send_status:"Correo enviado · CC "+safe(kam.m),email_sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",row.id);
      return json({ok:true,public_id:row.public_id,email_id:er.id});
    }

    return json({ok:false,error:"Acción no reconocida"},400);
  }catch(e){
    console.error(e);
    return json({ok:false,error:e instanceof Error?e.message:String(e)},400);
  }
});
