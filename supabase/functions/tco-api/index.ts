import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "";
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

async function appSetting(key:string){
  const {data,error}=await supabase.from("tco_app_settings").select("value").eq("key",key).maybeSingle();
  if(error){console.error("setting",key,error);return ""}
  return safe(data?.value);
}

async function findByClientId(clientId:string){
  const {data,error}=await supabase.from("tco_evaluations").select("*").eq("client_id",clientId).single();
  if(error) throw error; return data;
}

async function makePdf(row:any){
  const p=row.payload||{}, lead=p.lead||row.lead||{}, kam=p.kam||row.kam||{}, r=p.result||row.result||{}, s=p.state||{};
  const pdf=await PDFDocument.create();
  const font=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy=rgb(.035,.149,.416), navy2=rgb(.105,.266,.659), orange=rgb(.949,.549,.094), gray=rgb(.40,.45,.55), light=rgb(.95,.965,.985), rule=rgb(.86,.89,.93), dark=rgb(.075,.125,.25), green=rgb(.055,.478,.235), red=rgb(.706,.137,.094), white=rgb(1,1,1);
  const money=(v:any)=>"$"+Math.round(Number(v||0)).toLocaleString("es-CL");
  const n1=(v:any)=>Number(v||0).toLocaleString("es-CL",{minimumFractionDigits:1,maximumFractionDigits:1});
  const n0=(v:any)=>Number(v||0).toLocaleString("es-CL",{maximumFractionDigits:0});
  const wrap=(txt:string,f:any,size:number,max:number)=>{
    const words=safe(txt).split(/\s+/).filter(Boolean),lines:string[]=[];let line="";
    words.forEach(w=>{const test=line?line+" "+w:w;if(f.widthOfTextAtSize(test,size)<=max)line=test;else{if(line)lines.push(line);line=w}});
    if(line)lines.push(line);return lines;
  };
  const block=(page:any,txt:string,x:number,y:number,max:number,size=10,color=dark,f=font,leading=size+4)=>{
    const lines=wrap(txt,f,size,max);lines.forEach((ln,i)=>page.drawText(ln,{x,y:y-i*leading,size,font:f,color}));return y-lines.length*leading;
  };
  const card=(page:any,x:number,y:number,w:number,h:number,label:string,value:string,accent=navy)=>{
    page.drawRectangle({x,y:y-h,width:w,height:h,color:white,borderColor:rule,borderWidth:1});
    page.drawText(label.toUpperCase(),{x:x+13,y:y-18,size:7.5,font:bold,color:gray});
    page.drawText(value,{x:x+13,y:y-43,size:17,font:bold,color:accent});
  };
  const pct=Number(r.pct||0),saving=Number(r.saving||0),good=saving>=0;
  const project=safe(lead.project)||safe(lead.company)||"Proyecto evaluado";
  const client=[safe(lead.name),safe(lead.company)].filter(Boolean).join(" - ")||"Cliente ACMA";
  const pid=safe(row.public_id)||safe(row.client_id);

  // Components for charts (prefer persisted values; otherwise recompute).
  let matT=Number(r.matT||0),matI=Number(r.matI||0),instT=Number(r.instT||0),instI=Number(r.instI||0),lossT=Number(r.lossT||0),lossI=Number(r.lossI||0),ggT=Number(r.ggT||0),ggI=Number(r.ggI||0),daysT=Number(r.daysT||0),daysI=Number(r.daysI||0);
  if(!(matT||matI||instT||instI)){
    const kgP=Number(r.pTon||0)*1000,sh=Number(s.pctSust||0)/100,f=Number(s.fHom||100)/100,kgMalla=kgP*sh*f,kgBarraInd=kgP*(1-sh);
    const indivTrad=Number(s.indivTrad||0),ef=Number(s.efMalla||0),indivMalla=indivTrad*(1+ef/100),jhT=indivTrad?kgP/indivTrad:0,jhI=(indivMalla?kgMalla/indivMalla:0)+(indivTrad?kgBarraInd/indivTrad:0);
    daysT=Number(s.dotTrad||0)?jhT/Number(s.dotTrad):0;daysI=Number(s.dotInd||0)?jhI/Number(s.dotInd):0;
    const cMoInd=Math.round(Number(s.cMoTrad||0)*(1-(1-1/(1+ef/100))*Number(s.traspaso||100)/100));
    matT=kgP*Number(s.cAcero||0);matI=kgMalla*Number(s.cMallaFija||0)+kgBarraInd*Number(s.cAcero||0);
    lossT=kgP*(Number(s.lossTrad||0)/100)*Number(s.cAcero||0);
    lossI=kgMalla*.01*Number(s.cMallaFija||0)+kgBarraInd*(Number(s.lossTrad||0)/100)*Number(s.cAcero||0);
    instT=kgP*Number(s.cMoTrad||0);instI=kgMalla*cMoInd+kgBarraInd*Number(s.cMoTrad||0);
    ggT=daysT*Number(s.ggDia||0)*(Number(r.incRc||s.incRc||0)/100);ggI=daysI*Number(s.ggDia||0)*(Number(r.incRc||s.incRc||0)/100);
  }

  // PAGE 1
  const p1=pdf.addPage([595.28,841.89]); const L=44,W=507;
  p1.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:white});
  p1.drawRectangle({x:0,y:829,width:595.28,height:13,color:orange});
  p1.drawText("ACMA",{x:L,y:790,size:28,font:bold,color:navy});
  p1.drawText("TCO DE ENFIERRADURA",{x:L,y:767,size:10,font:bold,color:orange});
  p1.drawText("RESUMEN EJECUTIVO",{x:405,y:790,size:8,font:bold,color:gray});
  p1.drawText(pid,{x:405,y:774,size:8,font:bold,color:navy});
  p1.drawLine({start:{x:L,y:748},end:{x:L+W,y:748},thickness:1,color:rule});
  p1.drawText(project,{x:L,y:714,size:22,font:bold,color:navy});
  let y=690;
  y=block(p1,client,L,y,W,10,gray,font,14);
  if(safe(lead.email)){p1.drawText(safe(lead.email),{x:L,y:y-2,size:9,font,color:gray});y-=20}
  p1.drawText(good?"AHORRO TCO ESTIMADO":"DIFERENCIA TCO ESTIMADA",{x:L,y:634,size:8,font:bold,color:gray});
  p1.drawText(money(Math.abs(saving)),{x:L,y:585,size:38,font:bold,color:good?green:red});
  p1.drawText((pct<0?"-":"")+n1(Math.abs(pct))+"% sobre el TCO considerado",{x:L,y:558,size:10,font:bold,color:navy});
  card(p1,L,525,158,66,"TCO tradicional",money(r.totT),navy);
  card(p1,L+174,525,158,66,"TCO con malla",money(r.totI),navy2);
  card(p1,L+348,525,159,66,"Dias liberados",n1(r.dDays)+" dias",good?green:orange);

  p1.drawText("COMPARACION TCO",{x:L,y:426,size:8,font:bold,color:gray});
  const maxTot=Math.max(Number(r.totT||0),Number(r.totI||0),1),barW=420;
  p1.drawText("Tradicional",{x:L,y:397,size:9,font:bold,color:navy});
  p1.drawRectangle({x:L+76,y:389,width:barW,height:18,color:light});
  p1.drawRectangle({x:L+76,y:389,width:barW*Number(r.totT||0)/maxTot,height:18,color:navy});
  p1.drawText(money(r.totT),{x:L+82,y:394,size:8,font:bold,color:white});
  p1.drawText("Con malla",{x:L,y:362,size:9,font:bold,color:navy});
  p1.drawRectangle({x:L+76,y:354,width:barW,height:18,color:light});
  p1.drawRectangle({x:L+76,y:354,width:barW*Number(r.totI||0)/maxTot,height:18,color:green});
  p1.drawText(money(r.totI),{x:L+82,y:359,size:8,font:bold,color:white});

  p1.drawText("BASE DE LA SIMULACION",{x:L,y:314,size:8,font:bold,color:gray});
  const baseY=286;
  card(p1,L,baseY,158,60,"Superficie",n0(r.m2)+" m2",navy);
  card(p1,L+174,baseY,158,60,"Acero estimado",n1(r.pTon)+" t",navy);
  card(p1,L+348,baseY,159,60,"Cuantia",n1(r.kgM2)+" kg/m2",navy);
  p1.drawText("Tipologia: "+safe(p.caseName),{x:L,y:205,size:9,font:bold,color:navy});
  p1.drawText("Hormigon estimado: "+n0(r.m3)+" m3  |  Cuantia volumetrica: "+n1(r.kgM3)+" kg/m3"+(Number(r.floors)>0?"  |  Pisos: "+n0(r.floors):""),{x:L,y:187,size:8.5,font,color:gray});

  p1.drawRectangle({x:L,y:74,width:W,height:84,color:rgb(.975,.985,.995),borderColor:rule,borderWidth:1});
  p1.drawRectangle({x:L,y:74,width:5,height:84,color:orange});
  p1.drawText("¿QUIERES PROFUNDIZAR ESTE ANALISIS?",{x:L+18,y:137,size:9,font:bold,color:navy});
  block(p1,"Contamos con una version mas detallada del modelo TCO. Estaremos encantados de agendar una reunion para revisarla contigo y evaluar tus proyectos en detalle, incorporando cubicaciones, cuadrillas, precios, plazos y condiciones reales de obra.",L+18,119,W-36,8.8,gray,font,12);
  p1.drawText("KAM ACMA: "+safe(kam.n)+"  |  "+safe(kam.m)+"  |  "+safe(kam.t),{x:L+18,y:86,size:8.5,font:bold,color:navy});
  p1.drawText("Simulacion preliminar sujeta a validacion de ingenieria, cubicacion y precios vigentes.",{x:L,y:42,size:7.5,font,color:gray});

  // PAGE 2
  const p2=pdf.addPage([595.28,841.89]);
  p2.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:white});
  p2.drawRectangle({x:0,y:829,width:595.28,height:13,color:orange});
  p2.drawText("ACMA · DETALLE DE LA SIMULACION",{x:L,y:790,size:18,font:bold,color:navy});
  p2.drawText(pid,{x:L,y:769,size:8,font:bold,color:orange});
  p2.drawLine({start:{x:L,y:750},end:{x:L+W,y:750},thickness:1,color:rule});

  p2.drawText("QUE EXPLICA LA DIFERENCIA TCO",{x:L,y:718,size:8,font:bold,color:gray});
  const deltas=[
    ["Material",matI-matT],
    ["Instalacion",instI-instT],
    ["Perdidas",lossI-lossT],
    ["Plazo / GG",ggI-ggT]
  ];
  const maxDelta=Math.max(1,...deltas.map(x=>Math.abs(Number(x[1]))));
  let dy=680;
  deltas.forEach(([label,val]:any)=>{
    const v=Number(val),col=v<=0?green:red,ww=300*Math.abs(v)/maxDelta;
    p2.drawText(label,{x:L,y:dy+5,size:9,font:bold,color:navy});
    p2.drawRectangle({x:L+95,y:dy,width:300,height:14,color:light});
    p2.drawRectangle({x:L+95,y:dy,width:Math.max(2,ww),height:14,color:col});
    p2.drawText((v>0?"+":"-")+money(Math.abs(v)),{x:L+410,y:dy+3,size:8,font:bold,color:col});
    dy-=42;
  });

  p2.drawText("PLAZO DE LA PARTIDA",{x:L,y:488,size:8,font:bold,color:gray});
  const maxDays=Math.max(daysT,daysI,1),timeW=330;
  p2.drawText("Tradicional",{x:L,y:454,size:9,font:bold,color:navy});
  p2.drawRectangle({x:L+85,y:447,width:timeW,height:18,color:light});
  p2.drawRectangle({x:L+85,y:447,width:timeW*daysT/maxDays,height:18,color:navy});
  p2.drawText(n1(daysT)+" dias",{x:L+425,y:451,size:8,font:bold,color:navy});
  p2.drawText("Con malla",{x:L,y:419,size:9,font:bold,color:navy});
  p2.drawRectangle({x:L+85,y:412,width:timeW,height:18,color:light});
  p2.drawRectangle({x:L+85,y:412,width:timeW*daysI/maxDays,height:18,color:green});
  p2.drawText(n1(daysI)+" dias",{x:L+425,y:416,size:8,font:bold,color:green});

  p2.drawText("SUPUESTOS PRINCIPALES",{x:L,y:362,size:8,font:bold,color:gray});
  const assumptions=[
    ["Acero sustituible por malla",n1(s.pctSust)+"%"],
    ["Ganancia productividad malla",n1(s.efMalla)+"%"],
    ["Incidencia ruta critica",n1(r.incRc||s.incRc)+"%"],
    ["Precio barra",money(s.cAcero)+"/kg"],
    ["Precio malla",money(s.cMallaFija)+"/kg"],
    ["Gasto general diario",money(s.ggDia)+"/dia"],
  ];
  let ay=334;
  assumptions.forEach(([a,b]:any,i:number)=>{
    if(i%2===0)p2.drawRectangle({x:L,y:ay-7,width:W,height:25,color:rgb(.985,.99,1)});
    p2.drawText(a,{x:L+10,y:ay,size:8.5,font,color:gray});
    p2.drawText(b,{x:L+355,y:ay,size:8.5,font:bold,color:navy});
    ay-=29;
  });

  p2.drawRectangle({x:L,y:70,width:W,height:92,color:navy});
  p2.drawText("SIGUIENTE PASO",{x:L+18,y:140,size:8,font:bold,color:orange});
  p2.drawText("Llevemos el TCO a tus proyectos reales.",{x:L+18,y:118,size:15,font:bold,color:white});
  block(p2,"Podemos preparar una evaluacion mas detallada con tus cubicaciones, programa, cuadrillas y condiciones de obra, y revisarla juntos en una reunion.",L+18,99,W-36,9,white,font,13);
  p2.drawText(safe(kam.n)+" · "+safe(kam.m)+" · "+safe(kam.t),{x:L+18,y:78,size:8.5,font:bold,color:white});
  p2.drawText("ACMA · "+pid,{x:L,y:36,size:7.5,font,color:gray});

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
      const resendKey=RESEND_API_KEY||await appSetting("resend_api_key");
      const fromEmail=FROM_EMAIL||await appSetting("from_email")||"ACMA TCO <tco@tco.acma.cl>";
      if(!resendKey) return json({ok:false,error:"Servicio de correo no configurado"},503);
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
      const html='<div style="font-family:Arial,sans-serif;color:#13203F;line-height:1.6;max-width:700px;margin:auto">'+
        '<div style="border-top:8px solid #F28C18;padding:26px 30px;border-left:1px solid #E3E8F0;border-right:1px solid #E3E8F0;border-bottom:1px solid #E3E8F0">'+
        '<div style="font-size:24px;font-weight:800;color:#09266A;letter-spacing:.08em">ACMA</div>'+
        '<div style="font-size:12px;font-weight:700;color:#F28C18;text-transform:uppercase;letter-spacing:.12em;margin-top:4px">Resumen ejecutivo TCO de enfierradura</div>'+
        '<p style="margin-top:26px">Hola '+safe(lead.name||"")+',</p>'+
        '<p>Gracias por tu tiempo. Te compartimos el resumen ejecutivo de la evaluación TCO realizada para <b>'+safe(lead.project||lead.company||"tu proyecto")+'</b>.</p>'+
        '<div style="background:#F5F7FB;padding:16px 18px;margin:22px 0;border-left:4px solid #09266A">'+
        '<b style="color:#09266A">TCO tradicional:</b> '+money(r.totT)+'<br>'+
        '<b style="color:#09266A">TCO con malla:</b> '+money(r.totI)+'<br>'+
        '<b style="color:#0E7A3C">Diferencia estimada:</b> '+money(r.saving)+' ('+num(r.pct,1)+'%)'+
        '</div>'+
        '<p>Adjuntamos un PDF con los principales resultados, gráficos y supuestos utilizados.</p>'+
        '<p><b>Contamos con una versión más detallada del análisis TCO.</b> Estaremos encantados de agendar una reunión para revisarla contigo y evaluar tus proyectos en detalle, incorporando cubicaciones, cuadrillas, precios, plazos y condiciones reales de obra.</p>'+
        '<p>Si te parece, coordinamos una reunión y profundizamos el análisis.</p>'+
        '<p style="margin-top:28px">Saludos,<br><b>'+safe(kam.n)+'</b><br>'+safe(kam.c)+'<br><a href="mailto:'+safe(kam.m)+'" style="color:#09266A">'+safe(kam.m)+'</a> · '+safe(kam.t)+'</p>'+
        '<p style="font-size:11px;color:#71809A;margin-top:26px">Simulación preliminar sujeta a validación de ingeniería, cubicación y precios vigentes.</p>'+
        '</div></div>';
      const rr=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resendKey,"Content-Type":"application/json"},body:JSON.stringify({
        from:fromEmail,to:[safe(lead.email)],cc:[safe(kam.m)],
        subject:"ACMA · Resumen ejecutivo TCO · "+(safe(lead.project)||row.public_id),html,
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
