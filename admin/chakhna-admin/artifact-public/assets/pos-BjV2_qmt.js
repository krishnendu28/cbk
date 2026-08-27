import{r as n,j as t}from"./vendor-DYrmjGv1.js";import{D as W,C as Y,B as c,t as G}from"./index-o0H0RYKM.js";import{I as m}from"./input-B6eTG1__.js";import{B as re}from"./badge-CD_CzOyx.js";import{a as J,b as z,c as le,e as de,h as ce,i as Q,U as ue}from"./bridge-DhQ9_yL0.js";import{a as pe,R as me}from"./icons-DvtMWh4N.js";import"./react-query-CLD8H1WL.js";import"./radix-C9Xnr4WV.js";function je(){const[w,M]=n.useState(J),[k,$]=n.useState(w[0]?.id||"non-veg-chakhna"),[P,V]=n.useState(""),[i,T]=n.useState("dine-in"),[r,L]=n.useState(null),[o,j]=n.useState([]),[q,_]=n.useState(!1),[h,R]=n.useState(""),[x,B]=n.useState(""),[g,D]=n.useState(""),[N,O]=n.useState(""),[S,F]=n.useState(""),[f,u]=n.useState(""),[U,I]=n.useState(null),A=z(),X=A.filter(e=>e.status==="available"),K=w.find(e=>e.id===k)||w[0];n.useEffect(()=>{if(localStorage.getItem(W)==="1"){const s=J();M(s),$(s[0]?.id||"");return}async function e(){const s=await de();M(s),s.some(d=>d.id===k)||$(s[0]?.id||"")}return e(),le(()=>{e()})},[]);const Z=n.useMemo(()=>(K?.items||[]).filter(e=>e.name.toLowerCase().includes(P.trim().toLowerCase())),[K?.items,P]),y=n.useMemo(()=>o.reduce((e,s)=>e+s.totalPrice,0),[o]),v=o.length>0&&i==="delivery"?20:0,C=y+v;function ee(e){j(s=>s.find(a=>a.id===e.id)?s.map(a=>a.id===e.id?{...a,quantity:a.quantity+1,totalPrice:(a.quantity+1)*a.unitPrice}:a):[...s,{id:e.id,name:e.name,quantity:1,unitPrice:e.price,totalPrice:e.price}])}function H(e,s){j(d=>d.map(a=>{if(a.id!==e)return a;const l=Math.max(0,a.quantity+s);return{...a,quantity:l,totalPrice:l*a.unitPrice}}).filter(a=>a.quantity>0))}async function te(){if(!navigator.geolocation){u("Geolocation not supported on this browser");return}navigator.geolocation.getCurrentPosition(async e=>{try{const{latitude:s,longitude:d}=e.coords,p=(await(await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${s}&lon=${d}`)).json())?.display_name||`${s.toFixed(5)}, ${d.toFixed(5)}`;u(p)}catch{u("Unable to fetch readable location, please type manually")}},()=>u("Location permission denied"),{enableHighAccuracy:!0,timeout:12e3})}async function ae(){if(!(i==="delivery"&&(!h.trim()||!x.trim()))&&o.length!==0&&!(i==="dine-in"&&!r)&&!(i==="delivery"&&!g.trim()&&!f.trim())){_(!0);try{const e=i==="delivery"?[g&&`Flat: ${g}`,N&&`Room: ${N}`,S&&`Landmark: ${S}`,f&&`Location: ${f}`].filter(Boolean):i==="dine-in"?[`Table: ${A.find(a=>a.id===r)?.name||r}`]:["Counter pickup"],s={customerName:h.trim()||(i==="dine-in"?"Walk-in Guest":"Takeaway Guest"),phone:x.trim()||"0000000000",address:e.join(", "),items:o.map(a=>({name:a.name,variant:"Regular",quantity:a.quantity,unitPrice:a.unitPrice,totalPrice:a.totalPrice})),deliveryCharge:v,subtotal:y,total:Math.round(C)};if(localStorage.getItem(W)==="1"){const a={_id:`demo-${Date.now()}`,customerName:s.customerName,phone:s.phone,address:s.address,items:s.items,total:s.total,deliveryCharge:v,status:"Preparing",createdAt:new Date().toISOString()};if(ce(a),i==="dine-in"&&r){const l=z().map(p=>p.id===r?{...p,status:"occupied"}:p);Q(l)}j([]),R(""),B(""),D(""),O(""),F(""),u(""),L(null),I(null),G({title:"Order sent to kitchen",description:"Demo order created successfully."});return}if(!(await fetch(`${ue}/api/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)})).ok)throw new Error("Failed to place order");if(i==="dine-in"&&r){const a=z().map(l=>l.id===r?{...l,status:"occupied"}:l);Q(a)}j([]),R(""),B(""),D(""),O(""),F(""),u(""),L(null),I(null),G({title:"Order sent to kitchen",description:"POS order created successfully."})}catch(e){G({title:"Failed to place order",description:e instanceof Error?e.message:"Please check order details and try again.",variant:"destructive"})}finally{_(!1)}}}function se(){const e={orderType:i,selectedTableId:r,customerName:h,phone:x,flatNo:g,roomNo:N,landmark:S,autoLocation:f,cart:o,subtotal:y,deliveryCharge:v,total:C,savedAt:new Date().toISOString()};localStorage.setItem("cbk_pos_cart_draft",JSON.stringify(e)),I(new Date().toLocaleTimeString())}function ie(){if(o.length===0)return;const e=new Date,s=`CBK-${e.getFullYear()}${String(e.getMonth()+1).padStart(2,"0")}${String(e.getDate()).padStart(2,"0")}-${String(e.getHours()).padStart(2,"0")}${String(e.getMinutes()).padStart(2,"0")}${String(e.getSeconds()).padStart(2,"0")}`,d=h.trim()||(i==="dine-in"?"Walk-in Guest":"Takeaway Guest"),a=x.trim()||"N/A",l=i==="dine-in"?A.find(b=>b.id===r)?.name||"Not selected":"-",p=o.map(b=>`
          <tr>
            <td class="item-name">${b.name}</td>
            <td class="num">${b.quantity}</td>
            <td class="num">${b.unitPrice.toFixed(2)}</td>
            <td class="num">${b.totalPrice.toFixed(2)}</td>
          </tr>
        `).join(""),oe=new URL("/logo.jpeg",window.location.origin).toString(),E=window.open("","_blank","width=430,height=780");E&&(E.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Chakhna by Kilo E-Bill</title>
          <style>
            @page { size: 80mm auto; margin: 6mm; }
            * { box-sizing: border-box; }
            body {
              font-family: "Courier New", monospace;
              color: #0f172a;
              margin: 0;
              background: #ffffff;
            }
            .bill {
              width: 78mm;
              margin: 0 auto;
              border: 1px dashed #64748b;
              padding: 10px;
            }
            .center { text-align: center; }
            .logo {
              width: 60px;
              height: 60px;
              object-fit: cover;
              border-radius: 10px;
              border: 1px solid #cbd5e1;
              margin-bottom: 6px;
            }
            h1 {
              margin: 0;
              font-size: 16px;
              letter-spacing: 0.3px;
            }
            .muted { color: #334155; font-size: 11px; }
            .line {
              border-top: 1px dashed #334155;
              margin: 8px 0;
            }
            .meta {
              font-size: 11px;
              line-height: 1.45;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              padding: 3px 0;
              border-bottom: 1px dotted #94a3b8;
              vertical-align: top;
            }
            th { text-align: left; font-size: 10px; color: #1e293b; }
            .num { text-align: right; white-space: nowrap; }
            .item-name { max-width: 28mm; }
            .totals {
              margin-top: 8px;
              font-size: 12px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .grand {
              font-weight: 800;
              font-size: 14px;
              border-top: 1px dashed #334155;
              padding-top: 5px;
              margin-top: 4px;
            }
            .footer {
              margin-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #1e293b;
            }
          </style>
        </head>
        <body>
          <div class="bill">
            <div class="center">
              <img src="${oe}" alt="Chakhna by Kilo" class="logo" />
              <h1>Chakhna by Kilo</h1>
              <div class="muted">E-BILL / TAX INVOICE</div>
            </div>

            <div class="line"></div>

            <div class="meta">
              <div><strong>Order No:</strong> ${s}</div>
              <div><strong>Date:</strong> ${e.toLocaleDateString()} ${e.toLocaleTimeString()}</div>
              <div><strong>Type:</strong> ${i.toUpperCase()}</div>
              <div><strong>Table:</strong> ${l}</div>
              <div><strong>Customer:</strong> ${d}</div>
              <div><strong>Phone:</strong> ${a}</div>
            </div>

            <div class="line"></div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="num">Qty</th>
                  <th class="num">Rate</th>
                  <th class="num">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${p}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>Rs ${y.toFixed(2)}</span></div>
              <div class="totals-row"><span>Delivery</span><span>Rs ${v.toFixed(2)}</span></div>
              <div class="totals-row grand"><span>Grand Total</span><span>Rs ${C.toFixed(2)}</span></div>
            </div>

            <div class="line"></div>

            <div class="footer">
              <div>Thank you for dining with us!</div>
              <div>By Kilo By Choice By Taste</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          <\/script>
        </body>
      </html>
    `),E.document.close())}function ne(){o.length!==0&&(se(),ie())}return t.jsxs("div",{className:"h-[calc(100vh-8rem)] flex gap-6",children:[t.jsxs("div",{className:"flex-1 flex flex-col gap-4 overflow-hidden",children:[t.jsx("div",{className:"flex gap-2 overflow-x-auto pb-1",children:w.map(e=>t.jsx("button",{type:"button",onClick:()=>$(e.id),className:k===e.id?"px-4 py-2 rounded-full bg-primary text-primary-foreground whitespace-nowrap":"px-4 py-2 rounded-full bg-muted whitespace-nowrap",children:e.title},e.id))}),t.jsx(m,{value:P,onChange:e=>V(e.target.value),placeholder:"Search in menu"}),t.jsx("div",{className:"flex-1 overflow-y-auto pr-1",children:t.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",children:Z.map(e=>t.jsxs(Y,{className:"overflow-hidden",children:[t.jsx("img",{src:e.image,alt:e.name,className:"w-full h-32 object-cover"}),t.jsxs("div",{className:"p-3 space-y-2",children:[t.jsx("h3",{className:"font-semibold",children:e.name}),t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsxs(re,{variant:"outline",children:["Rs ",e.price]}),t.jsx(c,{onClick:()=>ee(e),size:"sm",children:"Add"})]})]})]},e.id))})})]}),t.jsxs(Y,{className:"w-[420px] flex flex-col overflow-hidden border-blue-200 shadow-xl shadow-blue-200/30 bg-gradient-to-b from-blue-50/50 to-white",children:[t.jsxs("div",{className:"p-4 border-b bg-blue-100/60 space-y-3",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsxs("div",{className:"flex items-center gap-2 text-foreground font-bold",children:[t.jsx(pe,{className:"w-5 h-5 text-primary"}),t.jsx("span",{children:"Cart"})]}),U&&t.jsxs("span",{className:"text-xs text-muted-foreground",children:["Saved ",U]})]}),t.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[t.jsx(c,{variant:i==="dine-in"?"default":"outline",onClick:()=>T("dine-in"),children:"Dine-in"}),t.jsx(c,{variant:i==="takeaway"?"default":"outline",onClick:()=>T("takeaway"),children:"Takeaway"}),t.jsx(c,{variant:i==="delivery"?"default":"outline",onClick:()=>T("delivery"),children:"Delivery"})]}),i==="dine-in"&&t.jsxs("select",{className:"w-full h-10 rounded-md border border-blue-300 bg-white px-3 text-sm",value:r||"",onChange:e=>L(Number(e.target.value)),children:[t.jsx("option",{value:"",disabled:!0,children:"Select available table first"}),X.map(e=>t.jsxs("option",{value:e.id,children:[e.name," (Capacity ",e.capacity,")"]},e.id))]}),t.jsx(m,{value:h,onChange:e=>R(e.target.value),placeholder:"Customer Name"}),t.jsx(m,{value:x,onChange:e=>B(e.target.value),placeholder:"Phone"}),i==="delivery"&&t.jsxs("div",{className:"space-y-2",children:[t.jsx(m,{value:g,onChange:e=>D(e.target.value),placeholder:"Flat No"}),t.jsx(m,{value:N,onChange:e=>O(e.target.value),placeholder:"Room No"}),t.jsx(m,{value:S,onChange:e=>F(e.target.value),placeholder:"Nearby Landmark"}),t.jsxs("div",{className:"flex gap-2",children:[t.jsx(m,{value:f,onChange:e=>u(e.target.value),placeholder:"Auto location / map location"}),t.jsx(c,{type:"button",variant:"outline",onClick:te,children:"Auto"})]})]})]}),t.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-3 bg-[#f7fcff]",children:[o.length===0&&t.jsx("p",{className:"text-muted-foreground",children:"Cart is empty"}),o.map(e=>t.jsxs("div",{className:"rounded-xl border border-blue-200 p-3 bg-white flex items-center justify-between gap-3 shadow-sm",children:[t.jsxs("div",{children:[t.jsx("p",{className:"font-semibold",children:e.name}),t.jsxs("p",{className:"text-sm text-muted-foreground",children:["Rs ",e.unitPrice," each"]})]}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx(c,{size:"sm",variant:"outline",onClick:()=>H(e.id,-1),children:"-"}),t.jsx("span",{className:"w-5 text-center",children:e.quantity}),t.jsx(c,{size:"sm",variant:"outline",onClick:()=>H(e.id,1),children:"+"})]}),t.jsxs("p",{className:"font-semibold",children:["Rs ",e.totalPrice]})]},e.id))]}),t.jsxs("div",{className:"p-4 border-t bg-blue-50 space-y-2",children:[t.jsxs("div",{className:"flex justify-between text-sm",children:[t.jsx("span",{children:"Subtotal"}),t.jsxs("span",{children:["Rs ",y.toFixed(2)]})]}),t.jsxs("div",{className:"flex justify-between text-sm",children:[t.jsx("span",{children:"Delivery"}),t.jsxs("span",{children:["Rs ",v.toFixed(2)]})]}),t.jsxs("div",{className:"flex justify-between font-bold text-lg border-t pt-2",children:[t.jsx("span",{children:"Total"}),t.jsxs("span",{children:["Rs ",C.toFixed(2)]})]}),t.jsxs(c,{type:"button",variant:"outline",onClick:ne,disabled:o.length===0,children:[t.jsx(me,{className:"w-4 h-4 mr-2"}),"Save & Print E-Bill"]}),t.jsx(c,{className:"w-full mt-2",onClick:ae,disabled:q||o.length===0||i==="delivery"&&!h.trim()||i==="delivery"&&!x.trim()||i==="dine-in"&&!r||i==="delivery"&&!g.trim()&&!f.trim(),children:q?"Placing...":"Place Bill + Order"})]})]})]})}export{je as default};
