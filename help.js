
(function(){
"use strict";

var HELP = {
  floors:{n:"Cantidad de pisos",u:"pisos",g:"Dimensión",q:"Número de pisos considerados para el edificio.",m:"Representa la altura del proyecto. En los casos de edificación también se usa para derivar la incidencia de ruta crítica.",i:"No multiplica por sí solo la superficie, porque la superficie por torre se ingresa aparte. Sí modifica cuánto del ahorro de plazo se valoriza como gasto general.",e:"Un edificio de 10 pisos usa una incidencia de ruta crítica mayor que uno de 5 pisos según la curva de referencia del modelo."},
  units:{n:"Cantidad de unidades / torres",u:"unidades",g:"Dimensión",q:"Número de viviendas, bloques o torres repetidas que se incluyen en la evaluación.",m:"Escala la superficie total del proyecto.",i:"Si aumenta, crecen proporcionalmente las toneladas de acero y la magnitud económica de ambos escenarios.",e:"4 torres × 2.500 m² por torre = 10.000 m² modelados."},
  m2Unit:{n:"Superficie por unidad / torre",u:"m² por unidad",g:"Dimensión",q:"Superficie construida que se asigna a cada vivienda, bloque o torre.",m:"Junto con la cantidad de unidades define la superficie total.",i:"Una superficie mayor aumenta directamente el tonelaje de acero, material, instalación y escala del TCO.",e:"2 torres de 5.000 m² equivalen a 10.000 m² totales."},
  m2:{n:"Superficie construida",u:"m²",g:"Dimensión",q:"Superficie total considerada en la simulación.",m:"Es la base sobre la que se aplica la cuantía de acero.",i:"Más m² implican más toneladas de acero y una mayor escala del resultado.",e:"10.000 m² × 30 kg/m² = 300 t de acero."},
  kgM2:{n:"Cuantía de acero por superficie",u:"kg/m²",g:"Dimensión",q:"Kilogramos de acero estimados por cada metro cuadrado construido.",m:"La intensidad de acero respecto de la superficie.",i:"Es un determinante directo del tonelaje total: toneladas = m² × kg/m² ÷ 1.000.",e:"10.000 m² con 35 kg/m² equivalen a 350 t."},
  kgM3:{n:"Cuantía de acero por hormigón",u:"kg/m³",g:"Dimensión",q:"Kilogramos de acero asociados a cada metro cúbico de hormigón.",m:"La intensidad de armadura respecto del volumen de hormigón.",i:"En modo kg/m³ se convierte a kg/m² usando el consumo de hormigón; juntos determinan el tonelaje.",e:"92 kg/m³ × 0,38 m³/m² ≈ 35 kg/m²."},
  consHorm:{n:"Consumo de hormigón",u:"m³/m²",g:"Dimensión",q:"Volumen estimado de hormigón por cada metro cuadrado construido.",m:"Relaciona superficie, volumen de hormigón y cuantía volumétrica.",i:"En modo kg/m² sirve para traducir m³ y kg/m³. En modo kg/m³ sí participa en el cálculo de kg/m² y, por tanto, del tonelaje.",e:"0,38 m³/m² × 10.000 m² = 3.800 m³ de hormigón."},
  quantMode:{n:"Cuantía por m² o por m³",u:"modo de entrada",g:"Dimensión",q:"Dos formas distintas de ingresar la densidad de acero del proyecto.",m:"kg/m² relaciona acero con superficie; kg/m³ relaciona acero con volumen de hormigón.",i:"El modelo convierte una forma en la otra usando el consumo de hormigón para mantener una base común.",e:"35 kg/m² con 0,38 m³/m² equivalen aproximadamente a 92 kg/m³."},
  dotTrad:{n:"Cuadrilla habitual de enfierradura",u:"personas",g:"Datos de obra",q:"Número de enfierradores que normalmente trabajan simultáneamente en la partida tradicional.",m:"La capacidad simultánea de ejecución de la cuadrilla.",i:"La herramienta divide las jornadas-hombre por la dotación para estimar días. Más personas reducen días, pero no las jornadas-hombre totales.",e:"1.800 JH con una cuadrilla de 10 personas equivalen aproximadamente a 180 días."},
  indivTrad:{n:"Productividad actual",u:"kg/persona-día",g:"Datos de obra",q:"Kilogramos de acero que instala, en promedio, un enfierrador durante una jornada.",m:"El rendimiento individual de la ejecución tradicional.",i:"Mayor productividad reduce jornadas-hombre y plazo. La productividad con malla parte de este valor y aplica la ganancia de productividad definida.",e:"200 kg/persona-día significa que una persona instala aproximadamente 200 kg por jornada."},
  ggDia:{n:"Gasto general diario",u:"$/día",g:"Datos de obra",q:"Costo diario de mantener la estructura de obra asociada al plazo.",m:"Valor económico de un día de plazo relevante para la comparación: administración, instalaciones, supervisión y otros costos temporales según el criterio del proyecto.",i:"Cuanto mayor sea, mayor valor económico tendrá una reducción de plazo, siempre ponderada por la incidencia de ruta crítica.",e:"$2.400.000/día × 10 días efectivos = $24.000.000 de impacto potencial en GG."},
  cAcero:{n:"Precio actual de barra",u:"$/kg",g:"Datos de obra",q:"Precio efectivo o aproximado por kilogramo de acero tradicional.",m:"El costo unitario del material de barra usado como escenario base.",i:"Aumenta el costo material tradicional y también el costo de la barra que permanece en el escenario con malla.",e:"350.000 kg × $845/kg = $295,75 millones antes de pérdidas e instalación."},
  pctSust:{n:"Acero sustituible por malla",u:"%",g:"Modelación",q:"Porcentaje del acero total que se considera técnicamente susceptible de reemplazarse por malla electrosoldada.",m:"El alcance potencial de industrialización dentro de la enfierradura.",i:"Un porcentaje mayor traslada más toneladas desde barra hacia malla y amplifica los efectos de precio, productividad, pérdidas y plazo. Siempre requiere validación de ingeniería.",e:"60% sobre 300 t significa que 180 t de la base se analizan como potencialmente sustituibles antes de homologación."},
  fHom:{n:"Factor de homologación",u:"%",g:"Modelación",q:"Relación de masa usada para convertir los kg de barra sustituida en kg de malla equivalente.",m:"Cuánta malla se considera necesaria por cada kg de barra sustituida.",i:"100% equivale a 1 kg de malla por 1 kg de barra; un valor menor reduce kg de malla y uno mayor los aumenta. Debe validarse técnicamente.",e:"90% de homologación: 100 t de barra sustituible se modelan como 90 t de malla."},
  efMalla:{n:"Ganancia de productividad con malla",u:"%",g:"Modelación",q:"Mejora porcentual del rendimiento individual al ejecutar la porción industrializada con malla.",m:"La diferencia de productividad entre malla y enfierradura tradicional.",i:"Mayor ganancia reduce jornadas-hombre y plazo del escenario con malla. También puede reducir el costo unitario de instalación según el traspaso de eficiencia.",e:"200 kg/persona-día + 23% = 246 kg/persona-día para la porción en malla."},
  incRc:{n:"Incidencia de ruta crítica",u:"%",g:"Modelación",q:"Porcentaje del ahorro de días de la partida que se considera capaz de impactar el plazo económicamente relevante de la obra.",m:"Cuánto del ahorro de plazo se transforma en efecto sobre gasto general.",i:"Con 0% no se valoriza ahorro de GG; con 100% se valoriza todo el diferencial de días. En edificios hoy se deriva desde los pisos.",e:"20 días liberados × 50% de incidencia = 10 días valorizados en GG."},
  cMallaFija:{n:"Precio de malla",u:"$/kg",g:"Modelación",q:"Precio por kilogramo de malla electrosoldada usado en el escenario industrializado.",m:"Costo unitario del material que reemplaza la porción sustituible.",i:"Un precio mayor reduce el ahorro del escenario con malla. El punto de equilibrio muestra el precio máximo compatible con ahorro TCO cero.",e:"Si el precio supera el punto de equilibrio, el beneficio de productividad/plazo puede dejar de compensar el mayor costo material."},
  cMoTrad:{n:"Costo de instalación de barra",u:"$/kg",g:"Modelación",q:"Costo unitario de mano de obra/instalación de la enfierradura tradicional.",m:"Cuánto cuesta instalar cada kilogramo de barra.",i:"Se aplica al escenario tradicional y a la barra remanente. El costo de instalación de malla se deriva de este valor y la eficiencia transferida.",e:"$450/kg × 350.000 kg = $157,5 millones de instalación tradicional."},
  lossTrad:{n:"Pérdida de barra",u:"%",g:"Modelación",q:"Merma considerada por cortes, despuntes y pérdidas del acero tradicional.",m:"El costo de material comprado que no termina como acero útil instalado.",i:"Una pérdida mayor encarece el escenario tradicional y la porción de barra que permanece en el escenario con malla.",e:"7% sobre $100 millones de barra agrega $7 millones al costo considerado."},
  lossMalla:{n:"Pérdida de malla",u:"%",g:"Modelación",q:"Merma considerada para la porción ejecutada con malla.",m:"Costo adicional de material de malla por pérdidas del proceso.",i:"Hoy está fijada en 1%. Una pérdida mayor aumentaría el TCO con malla.",e:"1% sobre $100 millones de malla agrega $1 millón."},
  dotInd:{n:"Dotación después de industrializar",u:"personas",g:"Modelación",q:"Número de personas trabajando simultáneamente en el escenario con malla.",m:"Capacidad simultánea de ejecución después de industrializar.",i:"Afecta los días de ejecución del escenario con malla, pero no cambia por sí misma las jornadas-hombre.",e:"La misma cantidad de JH se completa en menos días si aumenta la dotación."},
  traspaso:{n:"Traspaso de eficiencia a $/kg",u:"%",g:"Modelación",q:"Porcentaje de la ganancia de productividad que se convierte además en reducción del costo unitario de instalación de malla.",m:"Cuánto de la eficiencia operativa se refleja económicamente en el $/kg instalado.",i:"0% conserva el $/kg base; 100% traspasa toda la eficiencia calculada al costo unitario de malla.",e:"Permite separar una mejora solo de plazo de una mejora que también reduce la tarifa de instalación."},
  tcoTrad:{n:"TCO escenario tradicional",u:"CLP",g:"Resultado",q:"Costo total considerado para la partida en el escenario tradicional.",m:"Suma material, instalación, pérdidas y gasto general asociado al plazo considerado.",i:"Es la base contra la que se compara el escenario con malla.",e:"No es el costo total de la obra gruesa; es el TCO de enfierradura definido por esta herramienta."},
  tcoMalla:{n:"TCO escenario con malla",u:"CLP",g:"Resultado",q:"Costo total considerado después de aplicar la sustitución modelada por malla.",m:"Material de malla + barra remanente, instalación, pérdidas y gasto general asociado al plazo.",i:"La diferencia contra el TCO tradicional determina el ahorro o mayor costo estimado.",e:"TCO tradicional $100 MM y malla $94 MM producen $6 MM de diferencia."},
  saving:{n:"Diferencia / ahorro TCO",u:"CLP y %",g:"Resultado",q:"Diferencia entre el TCO tradicional y el TCO con malla.",m:"Impacto económico neto de los componentes incluidos en el modelo.",i:"Positivo indica ahorro estimado; negativo indica mayor TCO con malla bajo los supuestos ingresados.",e:"$6 MM sobre $100 MM de TCO tradicional equivalen a 6% de diferencia."},
  dDays:{n:"Días liberados",u:"días",g:"Resultado",q:"Diferencia entre los días estimados del escenario tradicional y con malla.",m:"Ahorro de plazo dentro de la partida de enfierradura.",i:"Solo la porción definida por la incidencia de ruta crítica se valoriza como ahorro de gasto general.",e:"17 días liberados con 85% de incidencia valorizan cerca de 14,5 días de GG."},
  dJh:{n:"Jornadas-hombre liberadas",u:"JH",g:"Resultado",q:"Diferencia entre las jornadas-hombre necesarias en ambos escenarios.",m:"Ahorro de esfuerzo de mano de obra, independiente de la distribución de la cuadrilla.",i:"Refleja productividad y puede traducirse en plazo, costo de instalación o ambos según los supuestos.",e:"157 JH liberadas equivalen a 157 jornadas de una persona menos para la partida modelada."}
};

function css(){
  var s=document.createElement("style");
  s.textContent=".vhelp-strip{display:flex;justify-content:flex-end;margin:10px 0 14px}.vhelp-all,.vhelp-btn{border:1px solid #C7D1E2;background:#fff;color:#09266A;font-weight:800;cursor:pointer}.vhelp-all{font-size:10px;padding:8px 11px}.vhelp-btn{width:22px;height:22px;border-radius:50%;font-size:11px;line-height:20px;padding:0;margin-left:7px;vertical-align:middle}.vhelp-btn:hover,.vhelp-all:hover{border-color:#F28C18;color:#F28C18}.vhelp-modal{position:fixed;inset:0;background:rgba(5,18,48,.72);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px}.vhelp-modal.on{display:flex}.vhelp-card{width:min(680px,96vw);max-height:92vh;overflow:auto;background:#fff;border:1px solid #D9E0EA}.vhelp-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid #D9E0EA}.vhelp-head h3{margin:0;color:#09266A;font-size:17px}.vhelp-close{border:1px solid #D9E0EA;background:#fff;color:#5E6A80;font-weight:800;padding:9px 12px}.vhelp-hero{padding:22px 24px;background:#F7F9FC;border-bottom:1px solid #D9E0EA}.vhelp-unit{display:inline-block;margin-bottom:8px;padding:4px 7px;background:#EAF0FA;color:#09266A;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.vhelp-hero h4{margin:0;color:#09266A;font-size:23px;line-height:1.1}.vhelp-hero p{margin:8px 0 0;color:#667289;font-size:12px;line-height:1.55}.vhelp-grid{display:grid;grid-template-columns:1fr 1fr}.vhelp-cell{padding:18px 20px;border-right:1px solid #D9E0EA;border-bottom:1px solid #D9E0EA}.vhelp-cell:nth-child(2n){border-right:0}.vhelp-cell b{display:block;margin-bottom:6px;color:#09266A;font-size:9px;letter-spacing:.08em;text-transform:uppercase}.vhelp-cell p{margin:0;color:#667289;font-size:11px;line-height:1.55}.vhelp-example{margin:18px 20px;padding:14px 16px;border-left:4px solid #F28C18;background:#FFF8EE}.vhelp-example b{display:block;color:#09266A;font-size:10px;margin-bottom:5px}.vhelp-example p{margin:0;color:#667289;font-size:11px;line-height:1.5}.vhelp-glossary{padding:16px}.vhelp-group{margin:0 0 8px;color:#F28C18;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.vhelp-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}.vhelp-item{border:1px solid #D9E0EA;background:#fff;padding:12px;text-align:left}.vhelp-item b{display:block;color:#09266A;font-size:11px}.vhelp-item span{display:block;color:#7A8598;font-size:9px;margin-top:4px;line-height:1.35}@media(max-width:590px){.vhelp-grid,.vhelp-list{grid-template-columns:1fr}.vhelp-cell{border-right:0}.vhelp-strip{justify-content:stretch}.vhelp-all{width:100%}.vhelp-hero{padding:18px}.vhelp-hero h4{font-size:20px}}";
  document.head.appendChild(s);
}
function modal(){
  var m=document.createElement("div");m.className="vhelp-modal";m.id="vhelpModal";
  m.innerHTML='<div class="vhelp-card"><div class="vhelp-head"><h3 id="vhelpTitle">Glosario de variables</h3><button type="button" class="vhelp-close" id="vhelpClose">Cerrar</button></div><div id="vhelpBody"></div></div>';
  document.body.appendChild(m);
  document.getElementById("vhelpClose").onclick=function(){m.classList.remove("on")};
  m.onclick=function(e){if(e.target===m)m.classList.remove("on")};
}
function esc(s){return String(s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function card(k){
  var h=HELP[k]; if(!h)return "";
  return '<div class="vhelp-hero"><span class="vhelp-unit">'+esc(h.g)+' · '+esc(h.u)+'</span><h4>'+esc(h.n)+'</h4><p>'+esc(h.q)+'</p></div><div class="vhelp-grid"><div class="vhelp-cell"><b>Qué mide</b><p>'+esc(h.m)+'</p></div><div class="vhelp-cell"><b>Cómo afecta el TCO</b><p>'+esc(h.i)+'</p></div></div><div class="vhelp-example"><b>Ejemplo de lectura</b><p>'+esc(h.e)+'</p></div>';
}
function openOne(k){
  if(!HELP[k])return;
  document.getElementById("vhelpTitle").textContent=HELP[k].n;
  document.getElementById("vhelpBody").innerHTML=card(k);
  document.getElementById("vhelpModal").classList.add("on");
}
function openAll(){
  document.getElementById("vhelpTitle").textContent="Glosario de variables TCO";
  var out='<div class="vhelp-glossary">';
  ["Dimensión","Datos de obra","Modelación","Resultado"].forEach(function(g){
    out+='<h4 class="vhelp-group">'+g+'</h4><div class="vhelp-list">';
    Object.keys(HELP).filter(function(k){return HELP[k].g===g}).forEach(function(k){
      out+='<button type="button" class="vhelp-item" data-vhelp="'+k+'"><b>'+esc(HELP[k].n)+'</b><span>'+esc(HELP[k].u)+' · '+esc(HELP[k].q)+'</span></button>';
    });
    out+='</div>';
  });
  out+='</div>';document.getElementById("vhelpBody").innerHTML=out;
  document.getElementById("vhelpModal").classList.add("on");
}
function addBtn(parent,key){
  if(!parent||!HELP[key]||parent.querySelector(".vhelp-btn"))return;
  var b=document.createElement("button");b.type="button";b.className="vhelp-btn";b.setAttribute("data-vhelp",key);b.setAttribute("aria-label","Explicar "+HELP[key].n);b.textContent="?";parent.appendChild(b);
}
function addStrip(section){
  if(!section||section.querySelector(".vhelp-strip"))return;
  var sub=section.querySelector(".sub,.resultHead");if(!sub)return;
  var d=document.createElement("div");d.className="vhelp-strip";d.innerHTML='<button type="button" class="vhelp-all" data-vhelp-all>Ver glosario de variables</button>';
  sub.insertAdjacentElement("afterend",d);
}
function decorate(){
  var st2=document.querySelector('.gate[data-step="2"]'),st3=document.querySelector('.gate[data-step="3"]'),st4=document.querySelector('.gate[data-step="4"]');
  addStrip(st2);addStrip(st3);addStrip(st4);
  var qm=document.getElementById("quantMode");
  if(qm&&!qm.querySelector(".vhelp-btn")){var b=document.createElement("button");b.type="button";b.className="vhelp-btn";b.setAttribute("data-vhelp","quantMode");b.textContent="?";qm.appendChild(b);}
  var ids={dimFloors:"floors",dimUnits:"units",dimM2Unit:"m2Unit",dimM2:"m2",dimConsHorm:"consHorm",dimKgM2:"kgM2",dimKgM3:"kgM3"};
  Object.keys(ids).forEach(function(id){var e=document.getElementById(id);if(e){var c=e.closest(".numCard");if(c)addBtn(c.querySelector(".numTop label"),ids[id]);}});
  document.querySelectorAll("[data-vkey]").forEach(function(e){var c=e.closest(".dataCard");if(c)addBtn(c.querySelector(".dataCardTop b"),e.getAttribute("data-vkey"));});
  ["pctSust","efMalla","incRc","cMallaFija","cMoTrad","fHom","lossTrad","lossMalla","dotInd","traspaso"].forEach(function(id){var e=document.getElementById(id);if(e){var f=e.closest(".field");if(f)addBtn(f.querySelector("label"),id);}});
  var metrics=st4?st4.querySelectorAll(".metric"):[];
  if(metrics[0])addBtn(metrics[0].querySelector("span"),"saving");
  if(metrics[1])addBtn(metrics[1].querySelector("span"),"dDays");
  if(metrics[2])addBtn(metrics[2].querySelector("span"),"dJh");
}
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-vhelp]");if(b){e.preventDefault();e.stopPropagation();openOne(b.getAttribute("data-vhelp"));return;}
  if(e.target.closest("[data-vhelp-all]")){e.preventDefault();openAll();}
});
css();modal();decorate();
var queued=false;
new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;decorate();});}).observe(document.body,{childList:true,subtree:true});
})();
