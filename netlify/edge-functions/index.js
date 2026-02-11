var bt=Object.defineProperty;var $e=t=>{throw TypeError(t)};var xt=(t,e,s)=>e in t?bt(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var p=(t,e,s)=>xt(t,typeof e!="symbol"?e+"":e,s),Te=(t,e,s)=>e.has(t)||$e("Cannot "+s);var l=(t,e,s)=>(Te(t,e,"read from private field"),s?s.call(t):e.get(t)),g=(t,e,s)=>e.has(t)?$e("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,s),f=(t,e,s,i)=>(Te(t,e,"write to private field"),i?i.call(t,s):e.set(t,s),s),b=(t,e,s)=>(Te(t,e,"access private method"),s);var _e=(t,e,s,i)=>({set _(a){f(t,e,a,s)},get _(){return l(t,e,i)}});var qe=(t,e,s)=>(i,a)=>{let r=-1;return n(0);async function n(d){if(d<=r)throw new Error("next() called multiple times");r=d;let o,c=!1,u;if(t[d]?(u=t[d][0][0],i.req.routeIndex=d):u=d===t.length&&a||void 0,u)try{o=await u(i,()=>n(d+1))}catch(h){if(h instanceof Error&&e)i.error=h,o=await e(h,i),c=!0;else throw h}else i.finalized===!1&&s&&(o=await s(i));return o&&(i.finalized===!1||c)&&(i.res=o),i}},vt=Symbol(),yt=async(t,e=Object.create(null))=>{const{all:s=!1,dot:i=!1}=e,r=(t instanceof st?t.raw.headers:t.headers).get("Content-Type");return r!=null&&r.startsWith("multipart/form-data")||r!=null&&r.startsWith("application/x-www-form-urlencoded")?wt(t,{all:s,dot:i}):{}};async function wt(t,e){const s=await t.formData();return s?zt(s,e):{}}function zt(t,e){const s=Object.create(null);return t.forEach((i,a)=>{e.all||a.endsWith("[]")?Et(s,a,i):s[a]=i}),e.dot&&Object.entries(s).forEach(([i,a])=>{i.includes(".")&&(Rt(s,i,a),delete s[i])}),s}var Et=(t,e,s)=>{t[e]!==void 0?Array.isArray(t[e])?t[e].push(s):t[e]=[t[e],s]:e.endsWith("[]")?t[e]=[s]:t[e]=s},Rt=(t,e,s)=>{let i=t;const a=e.split(".");a.forEach((r,n)=>{n===a.length-1?i[r]=s:((!i[r]||typeof i[r]!="object"||Array.isArray(i[r])||i[r]instanceof File)&&(i[r]=Object.create(null)),i=i[r])})},Je=t=>{const e=t.split("/");return e[0]===""&&e.shift(),e},jt=t=>{const{groups:e,path:s}=At(t),i=Je(s);return Ct(i,e)},At=t=>{const e=[];return t=t.replace(/\{[^}]+\}/g,(s,i)=>{const a=`@${i}`;return e.push([a,s]),a}),{groups:e,path:t}},Ct=(t,e)=>{for(let s=e.length-1;s>=0;s--){const[i]=e[s];for(let a=t.length-1;a>=0;a--)if(t[a].includes(i)){t[a]=t[a].replace(i,e[s][1]);break}}return t},je={},kt=(t,e)=>{if(t==="*")return"*";const s=t.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);if(s){const i=`${t}#${e}`;return je[i]||(s[2]?je[i]=e&&e[0]!==":"&&e[0]!=="*"?[i,s[1],new RegExp(`^${s[2]}(?=/${e})`)]:[t,s[1],new RegExp(`^${s[2]}$`)]:je[i]=[t,s[1],!0]),je[i]}return null},Fe=(t,e)=>{try{return e(t)}catch{return t.replace(/(?:%[0-9A-Fa-f]{2})+/g,s=>{try{return e(s)}catch{return s}})}},Pt=t=>Fe(t,decodeURI),Qe=t=>{const e=t.url,s=e.indexOf("/",e.indexOf(":")+4);let i=s;for(;i<e.length;i++){const a=e.charCodeAt(i);if(a===37){const r=e.indexOf("?",i),n=e.indexOf("#",i),d=r===-1?n===-1?void 0:n:n===-1?r:Math.min(r,n),o=e.slice(s,d);return Pt(o.includes("%25")?o.replace(/%25/g,"%2525"):o)}else if(a===63||a===35)break}return e.slice(s,i)},Ot=t=>{const e=Qe(t);return e.length>1&&e.at(-1)==="/"?e.slice(0,-1):e},se=(t,e,...s)=>(s.length&&(e=se(e,...s)),`${(t==null?void 0:t[0])==="/"?"":"/"}${t}${e==="/"?"":`${(t==null?void 0:t.at(-1))==="/"?"":"/"}${(e==null?void 0:e[0])==="/"?e.slice(1):e}`}`),Ye=t=>{if(t.charCodeAt(t.length-1)!==63||!t.includes(":"))return null;const e=t.split("/"),s=[];let i="";return e.forEach(a=>{if(a!==""&&!/\:/.test(a))i+="/"+a;else if(/\:/.test(a))if(/\?/.test(a)){s.length===0&&i===""?s.push("/"):s.push(i);const r=a.replace("?","");i+="/"+r,s.push(i)}else i+="/"+a}),s.filter((a,r,n)=>n.indexOf(a)===r)},Me=t=>/[%+]/.test(t)?(t.indexOf("+")!==-1&&(t=t.replace(/\+/g," ")),t.indexOf("%")!==-1?Fe(t,tt):t):t,et=(t,e,s)=>{let i;if(!s&&e&&!/[%+]/.test(e)){let n=t.indexOf("?",8);if(n===-1)return;for(t.startsWith(e,n+1)||(n=t.indexOf(`&${e}`,n+1));n!==-1;){const d=t.charCodeAt(n+e.length+1);if(d===61){const o=n+e.length+2,c=t.indexOf("&",o);return Me(t.slice(o,c===-1?void 0:c))}else if(d==38||isNaN(d))return"";n=t.indexOf(`&${e}`,n+1)}if(i=/[%+]/.test(t),!i)return}const a={};i??(i=/[%+]/.test(t));let r=t.indexOf("?",8);for(;r!==-1;){const n=t.indexOf("&",r+1);let d=t.indexOf("=",r);d>n&&n!==-1&&(d=-1);let o=t.slice(r+1,d===-1?n===-1?void 0:n:d);if(i&&(o=Me(o)),r=n,o==="")continue;let c;d===-1?c="":(c=t.slice(d+1,n===-1?void 0:n),i&&(c=Me(c))),s?(a[o]&&Array.isArray(a[o])||(a[o]=[]),a[o].push(c)):a[o]??(a[o]=c)}return e?a[e]:a},It=et,St=(t,e)=>et(t,e,!0),tt=decodeURIComponent,Ue=t=>Fe(t,tt),re,C,H,it,at,Le,_,Be,st=(Be=class{constructor(t,e="/",s=[[]]){g(this,H);p(this,"raw");g(this,re);g(this,C);p(this,"routeIndex",0);p(this,"path");p(this,"bodyCache",{});g(this,_,t=>{const{bodyCache:e,raw:s}=this,i=e[t];if(i)return i;const a=Object.keys(e)[0];return a?e[a].then(r=>(a==="json"&&(r=JSON.stringify(r)),new Response(r)[t]())):e[t]=s[t]()});this.raw=t,this.path=e,f(this,C,s),f(this,re,{})}param(t){return t?b(this,H,it).call(this,t):b(this,H,at).call(this)}query(t){return It(this.url,t)}queries(t){return St(this.url,t)}header(t){if(t)return this.raw.headers.get(t)??void 0;const e={};return this.raw.headers.forEach((s,i)=>{e[i]=s}),e}async parseBody(t){var e;return(e=this.bodyCache).parsedBody??(e.parsedBody=await yt(this,t))}json(){return l(this,_).call(this,"text").then(t=>JSON.parse(t))}text(){return l(this,_).call(this,"text")}arrayBuffer(){return l(this,_).call(this,"arrayBuffer")}blob(){return l(this,_).call(this,"blob")}formData(){return l(this,_).call(this,"formData")}addValidatedData(t,e){l(this,re)[t]=e}valid(t){return l(this,re)[t]}get url(){return this.raw.url}get method(){return this.raw.method}get[vt](){return l(this,C)}get matchedRoutes(){return l(this,C)[0].map(([[,t]])=>t)}get routePath(){return l(this,C)[0].map(([[,t]])=>t)[this.routeIndex].path}},re=new WeakMap,C=new WeakMap,H=new WeakSet,it=function(t){const e=l(this,C)[0][this.routeIndex][1][t],s=b(this,H,Le).call(this,e);return s&&/\%/.test(s)?Ue(s):s},at=function(){const t={},e=Object.keys(l(this,C)[0][this.routeIndex][1]);for(const s of e){const i=b(this,H,Le).call(this,l(this,C)[0][this.routeIndex][1][s]);i!==void 0&&(t[s]=/\%/.test(i)?Ue(i):i)}return t},Le=function(t){return l(this,C)[1]?l(this,C)[1][t]:t},_=new WeakMap,Be),Tt={Stringify:1},rt=async(t,e,s,i,a)=>{typeof t=="object"&&!(t instanceof String)&&(t instanceof Promise||(t=t.toString()),t instanceof Promise&&(t=await t));const r=t.callbacks;return r!=null&&r.length?(a?a[0]+=t:a=[t],Promise.all(r.map(d=>d({phase:e,buffer:a,context:i}))).then(d=>Promise.all(d.filter(Boolean).map(o=>rt(o,e,!1,i,a))).then(()=>a[0]))):Promise.resolve(t)},Mt="text/plain; charset=UTF-8",De=(t,e)=>({"Content-Type":t,...e}),be,xe,T,le,M,j,ve,ne,oe,W,ye,we,q,ie,Ve,Dt=(Ve=class{constructor(t,e){g(this,q);g(this,be);g(this,xe);p(this,"env",{});g(this,T);p(this,"finalized",!1);p(this,"error");g(this,le);g(this,M);g(this,j);g(this,ve);g(this,ne);g(this,oe);g(this,W);g(this,ye);g(this,we);p(this,"render",(...t)=>(l(this,ne)??f(this,ne,e=>this.html(e)),l(this,ne).call(this,...t)));p(this,"setLayout",t=>f(this,ve,t));p(this,"getLayout",()=>l(this,ve));p(this,"setRenderer",t=>{f(this,ne,t)});p(this,"header",(t,e,s)=>{this.finalized&&f(this,j,new Response(l(this,j).body,l(this,j)));const i=l(this,j)?l(this,j).headers:l(this,W)??f(this,W,new Headers);e===void 0?i.delete(t):s!=null&&s.append?i.append(t,e):i.set(t,e)});p(this,"status",t=>{f(this,le,t)});p(this,"set",(t,e)=>{l(this,T)??f(this,T,new Map),l(this,T).set(t,e)});p(this,"get",t=>l(this,T)?l(this,T).get(t):void 0);p(this,"newResponse",(...t)=>b(this,q,ie).call(this,...t));p(this,"body",(t,e,s)=>b(this,q,ie).call(this,t,e,s));p(this,"text",(t,e,s)=>!l(this,W)&&!l(this,le)&&!e&&!s&&!this.finalized?new Response(t):b(this,q,ie).call(this,t,e,De(Mt,s)));p(this,"json",(t,e,s)=>b(this,q,ie).call(this,JSON.stringify(t),e,De("application/json",s)));p(this,"html",(t,e,s)=>{const i=a=>b(this,q,ie).call(this,a,e,De("text/html; charset=UTF-8",s));return typeof t=="object"?rt(t,Tt.Stringify,!1,{}).then(i):i(t)});p(this,"redirect",(t,e)=>{const s=String(t);return this.header("Location",/[^\x00-\xFF]/.test(s)?encodeURI(s):s),this.newResponse(null,e??302)});p(this,"notFound",()=>(l(this,oe)??f(this,oe,()=>new Response),l(this,oe).call(this,this)));f(this,be,t),e&&(f(this,M,e.executionCtx),this.env=e.env,f(this,oe,e.notFoundHandler),f(this,we,e.path),f(this,ye,e.matchResult))}get req(){return l(this,xe)??f(this,xe,new st(l(this,be),l(this,we),l(this,ye))),l(this,xe)}get event(){if(l(this,M)&&"respondWith"in l(this,M))return l(this,M);throw Error("This context has no FetchEvent")}get executionCtx(){if(l(this,M))return l(this,M);throw Error("This context has no ExecutionContext")}get res(){return l(this,j)||f(this,j,new Response(null,{headers:l(this,W)??f(this,W,new Headers)}))}set res(t){if(l(this,j)&&t){t=new Response(t.body,t);for(const[e,s]of l(this,j).headers.entries())if(e!=="content-type")if(e==="set-cookie"){const i=l(this,j).headers.getSetCookie();t.headers.delete("set-cookie");for(const a of i)t.headers.append("set-cookie",a)}else t.headers.set(e,s)}f(this,j,t),this.finalized=!0}get var(){return l(this,T)?Object.fromEntries(l(this,T)):{}}},be=new WeakMap,xe=new WeakMap,T=new WeakMap,le=new WeakMap,M=new WeakMap,j=new WeakMap,ve=new WeakMap,ne=new WeakMap,oe=new WeakMap,W=new WeakMap,ye=new WeakMap,we=new WeakMap,q=new WeakSet,ie=function(t,e,s){const i=l(this,j)?new Headers(l(this,j).headers):l(this,W)??new Headers;if(typeof e=="object"&&"headers"in e){const r=e.headers instanceof Headers?e.headers:new Headers(e.headers);for(const[n,d]of r)n.toLowerCase()==="set-cookie"?i.append(n,d):i.set(n,d)}if(s)for(const[r,n]of Object.entries(s))if(typeof n=="string")i.set(r,n);else{i.delete(r);for(const d of n)i.append(r,d)}const a=typeof e=="number"?e:(e==null?void 0:e.status)??l(this,le);return new Response(t,{status:a,headers:i})},Ve),y="ALL",Lt="all",Ht=["get","post","put","delete","options","patch"],lt="Can not add a route since the matcher is already built.",nt=class extends Error{},Ft="__COMPOSED_HANDLER",Nt=t=>t.text("404 Not Found",404),Ge=(t,e)=>{if("getResponse"in t){const s=t.getResponse();return e.newResponse(s.body,s)}return console.error(t),e.text("Internal Server Error",500)},k,w,ot,P,K,Ae,Ce,ce,$t=(ce=class{constructor(e={}){g(this,w);p(this,"get");p(this,"post");p(this,"put");p(this,"delete");p(this,"options");p(this,"patch");p(this,"all");p(this,"on");p(this,"use");p(this,"router");p(this,"getPath");p(this,"_basePath","/");g(this,k,"/");p(this,"routes",[]);g(this,P,Nt);p(this,"errorHandler",Ge);p(this,"onError",e=>(this.errorHandler=e,this));p(this,"notFound",e=>(f(this,P,e),this));p(this,"fetch",(e,...s)=>b(this,w,Ce).call(this,e,s[1],s[0],e.method));p(this,"request",(e,s,i,a)=>e instanceof Request?this.fetch(s?new Request(e,s):e,i,a):(e=e.toString(),this.fetch(new Request(/^https?:\/\//.test(e)?e:`http://localhost${se("/",e)}`,s),i,a)));p(this,"fire",()=>{addEventListener("fetch",e=>{e.respondWith(b(this,w,Ce).call(this,e.request,e,void 0,e.request.method))})});[...Ht,Lt].forEach(r=>{this[r]=(n,...d)=>(typeof n=="string"?f(this,k,n):b(this,w,K).call(this,r,l(this,k),n),d.forEach(o=>{b(this,w,K).call(this,r,l(this,k),o)}),this)}),this.on=(r,n,...d)=>{for(const o of[n].flat()){f(this,k,o);for(const c of[r].flat())d.map(u=>{b(this,w,K).call(this,c.toUpperCase(),l(this,k),u)})}return this},this.use=(r,...n)=>(typeof r=="string"?f(this,k,r):(f(this,k,"*"),n.unshift(r)),n.forEach(d=>{b(this,w,K).call(this,y,l(this,k),d)}),this);const{strict:i,...a}=e;Object.assign(this,a),this.getPath=i??!0?e.getPath??Qe:Ot}route(e,s){const i=this.basePath(e);return s.routes.map(a=>{var n;let r;s.errorHandler===Ge?r=a.handler:(r=async(d,o)=>(await qe([],s.errorHandler)(d,()=>a.handler(d,o))).res,r[Ft]=a.handler),b(n=i,w,K).call(n,a.method,a.path,r)}),this}basePath(e){const s=b(this,w,ot).call(this);return s._basePath=se(this._basePath,e),s}mount(e,s,i){let a,r;i&&(typeof i=="function"?r=i:(r=i.optionHandler,i.replaceRequest===!1?a=o=>o:a=i.replaceRequest));const n=r?o=>{const c=r(o);return Array.isArray(c)?c:[c]}:o=>{let c;try{c=o.executionCtx}catch{}return[o.env,c]};a||(a=(()=>{const o=se(this._basePath,e),c=o==="/"?0:o.length;return u=>{const h=new URL(u.url);return h.pathname=h.pathname.slice(c)||"/",new Request(h,u)}})());const d=async(o,c)=>{const u=await s(a(o.req.raw),...n(o));if(u)return u;await c()};return b(this,w,K).call(this,y,se(e,"*"),d),this}},k=new WeakMap,w=new WeakSet,ot=function(){const e=new ce({router:this.router,getPath:this.getPath});return e.errorHandler=this.errorHandler,f(e,P,l(this,P)),e.routes=this.routes,e},P=new WeakMap,K=function(e,s,i){e=e.toUpperCase(),s=se(this._basePath,s);const a={basePath:this._basePath,path:s,method:e,handler:i};this.router.add(e,s,[i,a]),this.routes.push(a)},Ae=function(e,s){if(e instanceof Error)return this.errorHandler(e,s);throw e},Ce=function(e,s,i,a){if(a==="HEAD")return(async()=>new Response(null,await b(this,w,Ce).call(this,e,s,i,"GET")))();const r=this.getPath(e,{env:i}),n=this.router.match(a,r),d=new Dt(e,{path:r,matchResult:n,env:i,executionCtx:s,notFoundHandler:l(this,P)});if(n[0].length===1){let c;try{c=n[0][0][0][0](d,async()=>{d.res=await l(this,P).call(this,d)})}catch(u){return b(this,w,Ae).call(this,u,d)}return c instanceof Promise?c.then(u=>u||(d.finalized?d.res:l(this,P).call(this,d))).catch(u=>b(this,w,Ae).call(this,u,d)):c??l(this,P).call(this,d)}const o=qe(n[0],this.errorHandler,l(this,P));return(async()=>{try{const c=await o(d);if(!c.finalized)throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");return c.res}catch(c){return b(this,w,Ae).call(this,c,d)}})()},ce),ct=[];function _t(t,e){const s=this.buildAllMatchers(),i=((a,r)=>{const n=s[a]||s[y],d=n[2][r];if(d)return d;const o=r.match(n[0]);if(!o)return[[],ct];const c=o.indexOf("",1);return[n[1][c],o]});return this.match=i,i(t,e)}var Pe="[^/]+",ge=".*",me="(?:|/.*)",ae=Symbol(),qt=new Set(".\\+*[^]$()");function Ut(t,e){return t.length===1?e.length===1?t<e?-1:1:-1:e.length===1||t===ge||t===me?1:e===ge||e===me?-1:t===Pe?1:e===Pe?-1:t.length===e.length?t<e?-1:1:e.length-t.length}var Z,J,O,ee,Gt=(ee=class{constructor(){g(this,Z);g(this,J);g(this,O,Object.create(null))}insert(e,s,i,a,r){if(e.length===0){if(l(this,Z)!==void 0)throw ae;if(r)return;f(this,Z,s);return}const[n,...d]=e,o=n==="*"?d.length===0?["","",ge]:["","",Pe]:n==="/*"?["","",me]:n.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);let c;if(o){const u=o[1];let h=o[2]||Pe;if(u&&o[2]&&(h===".*"||(h=h.replace(/^\((?!\?:)(?=[^)]+\)$)/,"(?:"),/\((?!\?:)/.test(h))))throw ae;if(c=l(this,O)[h],!c){if(Object.keys(l(this,O)).some(m=>m!==ge&&m!==me))throw ae;if(r)return;c=l(this,O)[h]=new ee,u!==""&&f(c,J,a.varIndex++)}!r&&u!==""&&i.push([u,l(c,J)])}else if(c=l(this,O)[n],!c){if(Object.keys(l(this,O)).some(u=>u.length>1&&u!==ge&&u!==me))throw ae;if(r)return;c=l(this,O)[n]=new ee}c.insert(d,s,i,a,r)}buildRegExpStr(){const s=Object.keys(l(this,O)).sort(Ut).map(i=>{const a=l(this,O)[i];return(typeof l(a,J)=="number"?`(${i})@${l(a,J)}`:qt.has(i)?`\\${i}`:i)+a.buildRegExpStr()});return typeof l(this,Z)=="number"&&s.unshift(`#${l(this,Z)}`),s.length===0?"":s.length===1?s[0]:"(?:"+s.join("|")+")"}},Z=new WeakMap,J=new WeakMap,O=new WeakMap,ee),Oe,ze,Ke,Bt=(Ke=class{constructor(){g(this,Oe,{varIndex:0});g(this,ze,new Gt)}insert(t,e,s){const i=[],a=[];for(let n=0;;){let d=!1;if(t=t.replace(/\{[^}]+\}/g,o=>{const c=`@\\${n}`;return a[n]=[c,o],n++,d=!0,c}),!d)break}const r=t.match(/(?::[^\/]+)|(?:\/\*$)|./g)||[];for(let n=a.length-1;n>=0;n--){const[d]=a[n];for(let o=r.length-1;o>=0;o--)if(r[o].indexOf(d)!==-1){r[o]=r[o].replace(d,a[n][1]);break}}return l(this,ze).insert(r,e,i,l(this,Oe),s),i}buildRegExp(){let t=l(this,ze).buildRegExpStr();if(t==="")return[/^$/,[],[]];let e=0;const s=[],i=[];return t=t.replace(/#(\d+)|@(\d+)|\.\*\$/g,(a,r,n)=>r!==void 0?(s[++e]=Number(r),"$()"):(n!==void 0&&(i[Number(n)]=++e),"")),[new RegExp(`^${t}`),s,i]}},Oe=new WeakMap,ze=new WeakMap,Ke),Vt=[/^$/,[],Object.create(null)],ke=Object.create(null);function dt(t){return ke[t]??(ke[t]=new RegExp(t==="*"?"":`^${t.replace(/\/\*$|([.\\+*[^\]$()])/g,(e,s)=>s?`\\${s}`:"(?:|/.*)")}$`))}function Kt(){ke=Object.create(null)}function Xt(t){var c;const e=new Bt,s=[];if(t.length===0)return Vt;const i=t.map(u=>[!/\*|\/:/.test(u[0]),...u]).sort(([u,h],[m,v])=>u?1:m?-1:h.length-v.length),a=Object.create(null);for(let u=0,h=-1,m=i.length;u<m;u++){const[v,A,F]=i[u];v?a[A]=[F.map(([R])=>[R,Object.create(null)]),ct]:h++;let x;try{x=e.insert(A,h,v)}catch(R){throw R===ae?new nt(A):R}v||(s[h]=F.map(([R,N])=>{const Ee=Object.create(null);for(N-=1;N>=0;N--){const[Re,I]=x[N];Ee[Re]=I}return[R,Ee]}))}const[r,n,d]=e.buildRegExp();for(let u=0,h=s.length;u<h;u++)for(let m=0,v=s[u].length;m<v;m++){const A=(c=s[u][m])==null?void 0:c[1];if(!A)continue;const F=Object.keys(A);for(let x=0,R=F.length;x<R;x++)A[F[x]]=d[A[F[x]]]}const o=[];for(const u in n)o[u]=s[n[u]];return[r,o,a]}function te(t,e){if(t){for(const s of Object.keys(t).sort((i,a)=>a.length-i.length))if(dt(s).test(e))return[...t[s]]}}var U,G,Ie,ut,Xe,Wt=(Xe=class{constructor(){g(this,Ie);p(this,"name","RegExpRouter");g(this,U);g(this,G);p(this,"match",_t);f(this,U,{[y]:Object.create(null)}),f(this,G,{[y]:Object.create(null)})}add(t,e,s){var d;const i=l(this,U),a=l(this,G);if(!i||!a)throw new Error(lt);i[t]||[i,a].forEach(o=>{o[t]=Object.create(null),Object.keys(o[y]).forEach(c=>{o[t][c]=[...o[y][c]]})}),e==="/*"&&(e="*");const r=(e.match(/\/:/g)||[]).length;if(/\*$/.test(e)){const o=dt(e);t===y?Object.keys(i).forEach(c=>{var u;(u=i[c])[e]||(u[e]=te(i[c],e)||te(i[y],e)||[])}):(d=i[t])[e]||(d[e]=te(i[t],e)||te(i[y],e)||[]),Object.keys(i).forEach(c=>{(t===y||t===c)&&Object.keys(i[c]).forEach(u=>{o.test(u)&&i[c][u].push([s,r])})}),Object.keys(a).forEach(c=>{(t===y||t===c)&&Object.keys(a[c]).forEach(u=>o.test(u)&&a[c][u].push([s,r]))});return}const n=Ye(e)||[e];for(let o=0,c=n.length;o<c;o++){const u=n[o];Object.keys(a).forEach(h=>{var m;(t===y||t===h)&&((m=a[h])[u]||(m[u]=[...te(i[h],u)||te(i[y],u)||[]]),a[h][u].push([s,r-c+o+1]))})}}buildAllMatchers(){const t=Object.create(null);return Object.keys(l(this,G)).concat(Object.keys(l(this,U))).forEach(e=>{t[e]||(t[e]=b(this,Ie,ut).call(this,e))}),f(this,U,f(this,G,void 0)),Kt(),t}},U=new WeakMap,G=new WeakMap,Ie=new WeakSet,ut=function(t){const e=[];let s=t===y;return[l(this,U),l(this,G)].forEach(i=>{const a=i[t]?Object.keys(i[t]).map(r=>[r,i[t][r]]):[];a.length!==0?(s||(s=!0),e.push(...a)):t!==y&&e.push(...Object.keys(i[y]).map(r=>[r,i[y][r]]))}),s?Xt(e):null},Xe),B,D,We,Zt=(We=class{constructor(t){p(this,"name","SmartRouter");g(this,B,[]);g(this,D,[]);f(this,B,t.routers)}add(t,e,s){if(!l(this,D))throw new Error(lt);l(this,D).push([t,e,s])}match(t,e){if(!l(this,D))throw new Error("Fatal error");const s=l(this,B),i=l(this,D),a=s.length;let r=0,n;for(;r<a;r++){const d=s[r];try{for(let o=0,c=i.length;o<c;o++)d.add(...i[o]);n=d.match(t,e)}catch(o){if(o instanceof nt)continue;throw o}this.match=d.match.bind(d),f(this,B,[d]),f(this,D,void 0);break}if(r===a)throw new Error("Fatal error");return this.name=`SmartRouter + ${this.activeRouter.name}`,n}get activeRouter(){if(l(this,D)||l(this,B).length!==1)throw new Error("No active router has been determined yet.");return l(this,B)[0]}},B=new WeakMap,D=new WeakMap,We),pe=Object.create(null),V,E,Q,de,z,L,X,ue,Jt=(ue=class{constructor(e,s,i){g(this,L);g(this,V);g(this,E);g(this,Q);g(this,de,0);g(this,z,pe);if(f(this,E,i||Object.create(null)),f(this,V,[]),e&&s){const a=Object.create(null);a[e]={handler:s,possibleKeys:[],score:0},f(this,V,[a])}f(this,Q,[])}insert(e,s,i){f(this,de,++_e(this,de)._);let a=this;const r=jt(s),n=[];for(let d=0,o=r.length;d<o;d++){const c=r[d],u=r[d+1],h=kt(c,u),m=Array.isArray(h)?h[0]:c;if(m in l(a,E)){a=l(a,E)[m],h&&n.push(h[1]);continue}l(a,E)[m]=new ue,h&&(l(a,Q).push(h),n.push(h[1])),a=l(a,E)[m]}return l(a,V).push({[e]:{handler:i,possibleKeys:n.filter((d,o,c)=>c.indexOf(d)===o),score:l(this,de)}}),a}search(e,s){var o;const i=[];f(this,z,pe);let r=[this];const n=Je(s),d=[];for(let c=0,u=n.length;c<u;c++){const h=n[c],m=c===u-1,v=[];for(let A=0,F=r.length;A<F;A++){const x=r[A],R=l(x,E)[h];R&&(f(R,z,l(x,z)),m?(l(R,E)["*"]&&i.push(...b(this,L,X).call(this,l(R,E)["*"],e,l(x,z))),i.push(...b(this,L,X).call(this,R,e,l(x,z)))):v.push(R));for(let N=0,Ee=l(x,Q).length;N<Ee;N++){const Re=l(x,Q)[N],I=l(x,z)===pe?{}:{...l(x,z)};if(Re==="*"){const $=l(x,E)["*"];$&&(i.push(...b(this,L,X).call(this,$,e,l(x,z))),f($,z,I),v.push($));continue}const[gt,Ne,fe]=Re;if(!h&&!(fe instanceof RegExp))continue;const S=l(x,E)[gt],mt=n.slice(c).join("/");if(fe instanceof RegExp){const $=fe.exec(mt);if($){if(I[Ne]=$[0],i.push(...b(this,L,X).call(this,S,e,l(x,z),I)),Object.keys(l(S,E)).length){f(S,z,I);const Se=((o=$[0].match(/\//))==null?void 0:o.length)??0;(d[Se]||(d[Se]=[])).push(S)}continue}}(fe===!0||fe.test(h))&&(I[Ne]=h,m?(i.push(...b(this,L,X).call(this,S,e,I,l(x,z))),l(S,E)["*"]&&i.push(...b(this,L,X).call(this,l(S,E)["*"],e,I,l(x,z)))):(f(S,z,I),v.push(S)))}}r=v.concat(d.shift()??[])}return i.length>1&&i.sort((c,u)=>c.score-u.score),[i.map(({handler:c,params:u})=>[c,u])]}},V=new WeakMap,E=new WeakMap,Q=new WeakMap,de=new WeakMap,z=new WeakMap,L=new WeakSet,X=function(e,s,i,a){const r=[];for(let n=0,d=l(e,V).length;n<d;n++){const o=l(e,V)[n],c=o[s]||o[y],u={};if(c!==void 0&&(c.params=Object.create(null),r.push(c),i!==pe||a&&a!==pe))for(let h=0,m=c.possibleKeys.length;h<m;h++){const v=c.possibleKeys[h],A=u[c.score];c.params[v]=a!=null&&a[v]&&!A?a[v]:i[v]??(a==null?void 0:a[v]),u[c.score]=!0}}return r},ue),Y,Ze,Qt=(Ze=class{constructor(){p(this,"name","TrieRouter");g(this,Y);f(this,Y,new Jt)}add(t,e,s){const i=Ye(e);if(i){for(let a=0,r=i.length;a<r;a++)l(this,Y).insert(t,i[a],s);return}l(this,Y).insert(t,e,s)}match(t,e){return l(this,Y).search(t,e)}},Y=new WeakMap,Ze),ht=class extends $t{constructor(t={}){super(t),this.router=t.router??new Zt({routers:[new Wt,new Qt]})}},Yt=t=>{const s={...{origin:"*",allowMethods:["GET","HEAD","PUT","POST","DELETE","PATCH"],allowHeaders:[],exposeHeaders:[]},...t},i=(r=>typeof r=="string"?r==="*"?()=>r:n=>r===n?n:null:typeof r=="function"?r:n=>r.includes(n)?n:null)(s.origin),a=(r=>typeof r=="function"?r:Array.isArray(r)?()=>r:()=>[])(s.allowMethods);return async function(n,d){var u;function o(h,m){n.res.headers.set(h,m)}const c=await i(n.req.header("origin")||"",n);if(c&&o("Access-Control-Allow-Origin",c),s.credentials&&o("Access-Control-Allow-Credentials","true"),(u=s.exposeHeaders)!=null&&u.length&&o("Access-Control-Expose-Headers",s.exposeHeaders.join(",")),n.req.method==="OPTIONS"){s.origin!=="*"&&o("Vary","Origin"),s.maxAge!=null&&o("Access-Control-Max-Age",s.maxAge.toString());const h=await a(n.req.header("origin")||"",n);h.length&&o("Access-Control-Allow-Methods",h.join(","));let m=s.allowHeaders;if(!(m!=null&&m.length)){const v=n.req.header("Access-Control-Request-Headers");v&&(m=v.split(/\s*,\s*/))}return m!=null&&m.length&&(o("Access-Control-Allow-Headers",m.join(",")),n.res.headers.append("Vary","Access-Control-Request-Headers")),n.res.headers.delete("Content-Length"),n.res.headers.delete("Content-Type"),new Response(null,{headers:n.res.headers,status:204,statusText:"No Content"})}await d(),s.origin!=="*"&&n.header("Vary","Origin",{append:!0})}};const he=new ht;he.use("/api/*",Yt());he.get("/",t=>t.html(ft()));he.get("/login",t=>t.html(ft()));he.get("/dashboard",t=>t.html(es()));he.get("/api/health",t=>t.json({status:"ok",version:"0.1.0",name:"MATRIX Intelligence"}));function ft(){return`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MATRIX Intelligence — Login</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>
  <link href="/static/css/styles.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            zanichelli: { 
              blue: '#003B7B', 
              light: '#0066CC', 
              accent: '#E8F0FE',
              dark: '#002654'
            }
          }
        }
      }
    }
  <\/script>
</head>
<body class="min-h-screen bg-gradient-to-br from-zanichelli-dark via-zanichelli-blue to-zanichelli-light flex items-center justify-center p-4">
  
  <div class="w-full max-w-md">
    <!-- Logo / Brand -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
        <i class="fas fa-brain text-4xl text-white"></i>
      </div>
      <h1 class="text-3xl font-bold text-white">MATRIX Intelligence</h1>
      <p class="text-blue-200 mt-2">Piattaforma di analisi per promotori editoriali</p>
    </div>

    <!-- Card Login -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <!-- Stato configurazione -->
      <div id="config-status" class="mb-4 text-center"></div>

      <!-- Tab Login / Registrazione / Configura -->
      <div class="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button id="tab-login" onclick="switchTab('login')" 
                class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700">
          Accedi
        </button>
        <button id="tab-register" onclick="switchTab('register')" 
                class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700">
          Registrati
        </button>
        <button id="tab-config" onclick="switchTab('config')" 
                class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700">
          <i class="fas fa-cog mr-1"></i>Configura
        </button>
      </div>

      <!-- Form Login -->
      <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4 hidden">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div class="relative">
            <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="email" id="login-email" required
                   class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                   placeholder="sergio@zanichelli.it">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div class="relative">
            <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="password" id="login-password" required
                   class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                   placeholder="La tua password">
          </div>
        </div>
        <button type="submit" id="login-btn"
                class="w-full py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
          <i class="fas fa-sign-in-alt"></i>
          Accedi
        </button>
      </form>

      <!-- Form Registrazione (nascosto) -->
      <form id="register-form" onsubmit="handleRegister(event)" class="space-y-4 hidden">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div class="relative">
            <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="email" id="register-email" required
                   class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                   placeholder="la-tua-email@esempio.it">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div class="relative">
            <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="password" id="register-password" required minlength="6"
                   class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                   placeholder="Minimo 6 caratteri">
          </div>
        </div>
        <button type="submit" id="register-btn"
                class="w-full py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
          <i class="fas fa-user-plus"></i>
          Crea Account
        </button>
      </form>

      <!-- Form Configurazione Supabase (nascosto) -->
      <form id="config-form" onsubmit="handleSaveConfig(event)" class="space-y-4 hidden">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <i class="fas fa-info-circle mr-1"></i>
          Inserisci le credenziali dal tuo progetto Supabase.<br>
          Le trovi in: <strong>Settings &rarr; API Keys &rarr; Legacy anon key</strong>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URL Progetto Supabase</label>
          <div class="relative">
            <i class="fas fa-globe absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="url" id="config-supabase-url" required
                   class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none text-sm"
                   placeholder="https://xxxxx.supabase.co">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Anon Key (inizia con eyJ...)</label>
          <div class="relative">
            <i class="fas fa-key absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" id="config-supabase-key" required
                   class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none text-sm font-mono"
                   placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
          </div>
        </div>
        <button type="submit"
                class="w-full py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
          <i class="fas fa-save"></i>
          Salva Configurazione
        </button>
      </form>

      <!-- Messaggi -->
      <div id="auth-message" class="mt-4 hidden"></div>
    </div>

    <p class="text-center text-blue-200 text-sm mt-6">
      MATRIX Intelligence v0.1 &mdash; Zanichelli
    </p>
  </div>

  <script src="/static/js/config.js"><\/script>
  <script src="/static/js/auth.js"><\/script>
</body>
</html>`}function es(){return`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MATRIX Intelligence — Dashboard</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
  <link href="/static/css/styles.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            zanichelli: { 
              blue: '#003B7B', 
              light: '#0066CC', 
              accent: '#E8F0FE',
              dark: '#002654'
            }
          }
        }
      }
    }
  <\/script>
</head>
<body class="min-h-screen bg-gray-50">
  
  <!-- Sidebar -->
  <aside id="sidebar" class="fixed left-0 top-0 h-full w-64 bg-zanichelli-blue text-white shadow-xl z-50 transform -translate-x-full lg:translate-x-0 transition-transform duration-300">
    <!-- Brand -->
    <div class="p-6 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
          <i class="fas fa-brain text-xl"></i>
        </div>
        <div>
          <h1 class="font-bold text-lg leading-tight">MATRIX</h1>
          <p class="text-xs text-blue-200">Intelligence v0.1</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="p-4 space-y-1">
      <button onclick="navigateTo('upload')" id="nav-upload"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-cloud-upload-alt w-5 text-center"></i>
        <span>Upload Programmi</span>
      </button>
      <button onclick="navigateTo('database')" id="nav-database"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-database w-5 text-center"></i>
        <span>Database Programmi</span>
      </button>
      <button onclick="navigateTo('campagne')" id="nav-campagne"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-bullseye w-5 text-center"></i>
        <span>Campagne</span>
      </button>
      <button onclick="navigateTo('impostazioni')" id="nav-impostazioni"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-cog w-5 text-center"></i>
        <span>Impostazioni</span>
      </button>
    </nav>

    <!-- User -->
    <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
          <i class="fas fa-user text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p id="user-email" class="text-sm truncate">utente@email.it</p>
        </div>
        <button onclick="handleLogout()" class="text-blue-200 hover:text-white transition-colors" title="Logout">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile Header -->
  <header class="lg:hidden fixed top-0 left-0 right-0 bg-zanichelli-blue text-white p-4 z-40 flex items-center gap-4 shadow-lg">
    <button onclick="toggleSidebar()" class="text-xl">
      <i class="fas fa-bars"></i>
    </button>
    <h1 class="font-bold">MATRIX Intelligence</h1>
  </header>

  <!-- Main Content -->
  <main class="lg:ml-64 min-h-screen pt-4 lg:pt-0">
    <div class="p-4 lg:p-8 mt-14 lg:mt-0">

      <!-- ===================== SEZIONE UPLOAD ===================== -->
      <section id="section-upload" class="section hidden">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-cloud-upload-alt text-zanichelli-light mr-2"></i>
            Upload Programmi
          </h2>
          <p class="text-gray-500 mt-1">Carica i PDF dei programmi universitari per l'analisi automatica</p>
        </div>

        <!-- Drop Zone -->
        <div id="drop-zone" 
             class="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-zanichelli-light hover:bg-zanichelli-accent/30 transition-all"
             ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)" onclick="document.getElementById('file-input').click()">
          <i class="fas fa-file-pdf text-5xl text-gray-300 mb-4"></i>
          <p class="text-lg font-medium text-gray-600">Trascina qui i PDF dei programmi</p>
          <p class="text-sm text-gray-400 mt-1">oppure clicca per selezionare i file</p>
          <input type="file" id="file-input" accept=".pdf" multiple class="hidden" onchange="handleFileSelect(event)">
        </div>

        <!-- File Queue -->
        <div id="file-queue" class="mt-6 hidden">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-700">File selezionati</h3>
            <div class="flex gap-2">
              <span id="queue-count" class="text-sm text-gray-500"></span>
              <button onclick="clearQueue()" class="text-sm text-red-500 hover:text-red-700">
                <i class="fas fa-trash-alt mr-1"></i>Svuota
              </button>
            </div>
          </div>
          <div id="file-list" class="space-y-2 max-h-60 overflow-y-auto"></div>
          
          <!-- Preview testo estratto -->
          <div id="text-preview-container" class="mt-4 hidden">
            <h4 class="font-medium text-gray-700 mb-2">
              <i class="fas fa-eye mr-1"></i>Anteprima testo estratto
            </h4>
            <div id="text-preview" class="bg-gray-50 border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-600 font-mono"></div>
          </div>

          <button onclick="startProcessing()" id="btn-start-processing"
                  class="mt-4 w-full py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
            <i class="fas fa-play"></i>
            Avvia Analisi
          </button>
        </div>

        <!-- Progress -->
        <div id="processing-progress" class="mt-6 hidden">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-700">Analisi in corso...</h3>
              <span id="progress-text" class="text-sm font-medium text-zanichelli-light">0/0</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div id="progress-bar" class="bg-zanichelli-light h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
            </div>
            <p id="progress-detail" class="text-sm text-gray-500 mt-2"></p>
          </div>
        </div>

        <!-- Results Summary -->
        <div id="upload-results" class="mt-6 hidden">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-700 mb-4">
              <i class="fas fa-check-circle text-green-500 mr-2"></i>Risultati Analisi
            </h3>
            <div class="grid grid-cols-3 gap-4 mb-4">
              <div class="text-center p-4 bg-green-50 rounded-lg">
                <p id="result-success" class="text-2xl font-bold text-green-600">0</p>
                <p class="text-sm text-green-700">Completati</p>
              </div>
              <div class="text-center p-4 bg-red-50 rounded-lg">
                <p id="result-errors" class="text-2xl font-bold text-red-600">0</p>
                <p class="text-sm text-red-700">Errori</p>
              </div>
              <div class="text-center p-4 bg-yellow-50 rounded-lg">
                <p id="result-skipped" class="text-2xl font-bold text-yellow-600">0</p>
                <p class="text-sm text-yellow-700">Saltati</p>
              </div>
            </div>
            <div id="result-details" class="space-y-2 max-h-60 overflow-y-auto"></div>
            <button onclick="navigateTo('database')" class="mt-4 w-full py-2 bg-zanichelli-accent text-zanichelli-blue rounded-lg font-medium hover:bg-blue-100 transition-colors">
              <i class="fas fa-database mr-2"></i>Vai al Database
            </button>
          </div>
        </div>
      </section>

      <!-- ===================== SEZIONE DATABASE ===================== -->
      <section id="section-database" class="section hidden">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-database text-zanichelli-light mr-2"></i>
            Database Programmi
          </h2>
          <p class="text-gray-500 mt-1">Consulta e filtra i programmi analizzati</p>
        </div>

        <!-- Filtri -->
        <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Cerca</label>
              <div class="relative">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input type="text" id="filter-search" placeholder="Docente, ateneo, materia..."
                       class="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                       oninput="applyFilters()">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Materia</label>
              <select id="filter-materia" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyFilters()">
                <option value="">Tutte le materie</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Ateneo</label>
              <select id="filter-ateneo" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyFilters()">
                <option value="">Tutti gli atenei</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Scenario</label>
              <select id="filter-scenario" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyFilters()">
                <option value="">Tutti gli scenari</option>
                <option value="zanichelli_principale">Zanichelli Principale</option>
                <option value="zanichelli_alternativo">Zanichelli Alternativo</option>
                <option value="zanichelli_assente">Zanichelli Assente</option>
              </select>
            </div>
          </div>
          <div class="flex items-center justify-between mt-3 pt-3 border-t">
            <span id="db-count" class="text-sm text-gray-500">0 programmi trovati</span>
            <button onclick="resetFilters()" class="text-sm text-zanichelli-light hover:text-zanichelli-blue">
              <i class="fas fa-undo mr-1"></i>Reset filtri
            </button>
          </div>
        </div>

        <!-- Tabella -->
        <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th class="px-4 py-3 font-medium">Docente</th>
                  <th class="px-4 py-3 font-medium">Ateneo</th>
                  <th class="px-4 py-3 font-medium">Materia</th>
                  <th class="px-4 py-3 font-medium">Classe</th>
                  <th class="px-4 py-3 font-medium">Manuale principale</th>
                  <th class="px-4 py-3 font-medium">Scenario</th>
                  <th class="px-4 py-3 font-medium text-center">Azioni</th>
                </tr>
              </thead>
              <tbody id="db-table-body">
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                    <i class="fas fa-inbox text-3xl mb-2 block"></i>
                    Nessun programma trovato. Carica dei PDF dalla sezione Upload.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ===================== SEZIONE CAMPAGNE ===================== -->
      <section id="section-campagne" class="section hidden">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-bullseye text-zanichelli-light mr-2"></i>
              Campagne
            </h2>
            <p class="text-gray-500 mt-1">Crea campagne promozionali e genera liste target</p>
          </div>
          <button onclick="showNewCampaignForm()" id="btn-new-campaign"
                  class="px-4 py-2 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center gap-2">
            <i class="fas fa-plus"></i>
            Nuova Campagna
          </button>
        </div>

        <!-- Lista campagne esistenti -->
        <div id="campaigns-list" class="space-y-4">
          <div class="text-center py-12 text-gray-400">
            <i class="fas fa-bullseye text-4xl mb-3 block"></i>
            <p>Nessuna campagna creata</p>
            <p class="text-sm mt-1">Crea la tua prima campagna per generare liste target</p>
          </div>
        </div>

        <!-- Form nuova campagna (nascosto) -->
        <div id="campaign-form-container" class="hidden mt-6">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-1">
              <i class="fas fa-bullhorn mr-2 text-zanichelli-light"></i>
              Nuova Campagna Promozionale
            </h3>
            <p class="text-sm text-gray-500 mb-5">Inserisci i dati del volume che vuoi promuovere presso i docenti</p>

            <form id="campaign-form" onsubmit="handleCreateCampaign(event)" class="space-y-5">

              <!-- ====== SEZIONE 1: VOLUME DA PROMUOVERE ====== -->
              <div class="space-y-4">
                <div class="flex items-center gap-2 mb-1">
                  <span class="flex items-center justify-center w-6 h-6 bg-zanichelli-blue text-white rounded-full text-xs font-bold">1</span>
                  <h4 class="font-semibold text-gray-800">Volume da promuovere</h4>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Titolo del volume *</label>
                    <input type="text" id="camp-titolo" required
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none"
                           placeholder="Es: Chimica Generale e Inorganica">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Autore/i</label>
                    <input type="text" id="camp-autore"
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none"
                           placeholder="Es: Petrucci, Harwood, Herring">
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Materia di riferimento *</label>
                    <input type="text" id="camp-materia" required oninput="onMateriaChange()"
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none"
                           placeholder="Es: Chimica Generale">
                    <p class="text-xs text-gray-400 mt-1">Usata per cercare i docenti target nel database programmi</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Editore</label>
                    <input type="text" id="camp-editore" value="Zanichelli"
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
                  </div>
                </div>

                <!-- Pannello Scenario A/B/C (appare automaticamente quando si inserisce la materia) -->
                <div id="scenario-panel" class="hidden"></div>

                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-sm font-medium text-gray-700">
                      Indice / Sommario del volume
                      <span id="indice-source-badge" class="hidden ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        <i class="fas fa-magic mr-1"></i>importato dal catalogo
                      </span>
                    </label>
                    <button type="button" onclick="toggleCatalogImport()" id="btn-import-catalog"
                            class="text-xs text-zanichelli-light hover:text-zanichelli-blue font-medium transition-colors">
                      <i class="fas fa-book-open mr-1"></i>Importa dal catalogo MATRIX
                    </button>
                  </div>
                  <textarea id="camp-indice" rows="5"
                            class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm"
                            placeholder="Incolla qui l'indice del libro (capitoli principali). L'indice migliora la qualita delle motivazioni generate per ogni docente target."></textarea>
                </div>

                <!-- === CATALOGO MATRIX (collassabile, nascosto di default) === -->
                <div id="catalog-import-panel" class="hidden">
                  <div class="bg-zanichelli-accent rounded-xl p-4 border border-blue-200">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <i class="fas fa-book-open text-zanichelli-blue"></i>
                        <h5 class="font-semibold text-zanichelli-blue text-sm">Importa indice dal Catalogo MATRIX</h5>
                        <span id="catalog-count" class="text-xs bg-zanichelli-blue text-white px-2 py-0.5 rounded-full">0 manuali</span>
                      </div>
                      <button type="button" onclick="toggleCatalogImport()" class="text-xs text-zanichelli-blue/60 hover:text-zanichelli-blue">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                    <p class="text-xs text-zanichelli-blue/70 mb-3">
                      Se il volume e gia nel catalogo, selezionalo per importare automaticamente l'indice dei capitoli.
                      I campi titolo, autore, materia ed editore si compileranno automaticamente.
                    </p>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-zanichelli-blue/80 mb-1">Materia</label>
                        <select id="catalog-subject-filter" onchange="filterCatalogManuals()"
                                class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                          <option value="">Tutte le materie</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-zanichelli-blue/80 mb-1">Editore</label>
                        <select id="catalog-publisher-filter" onchange="filterCatalogManuals()"
                                class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                          <option value="">Tutti gli editori</option>
                          <option value="zanichelli">Solo Zanichelli</option>
                          <option value="competitor">Solo concorrenti</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-zanichelli-blue/80 mb-1">Manuale</label>
                        <select id="catalog-manual-select" onchange="selectManualFromCatalog()"
                                class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                          <option value="">— Seleziona un manuale —</option>
                        </select>
                      </div>
                    </div>

                    <div class="mt-3">
                      <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm"></i>
                        <input type="text" id="catalog-search" placeholder="Cerca per titolo o autore..." oninput="filterCatalogManuals()"
                               class="w-full pl-9 pr-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                      </div>
                    </div>

                    <div id="catalog-selected-info" class="hidden mt-3 bg-white rounded-lg p-3 border border-blue-200">
                      <div class="flex items-center justify-between">
                        <div>
                          <span id="catalog-selected-title" class="font-medium text-gray-800"></span>
                          <span id="catalog-selected-meta" class="text-xs text-gray-500 ml-2"></span>
                        </div>
                        <button type="button" onclick="clearCatalogSelection()" class="text-xs text-red-500 hover:text-red-700">
                          <i class="fas fa-times mr-1"></i>Rimuovi
                        </button>
                      </div>
                      <div id="catalog-selected-chapters" class="text-xs text-gray-500 mt-1"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Temi chiave (opzionale)</label>
                  <input type="text" id="camp-temi"
                         class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm"
                         placeholder="Generati automaticamente dall'indice, oppure inseriscili a mano separati da virgola">
                </div>
              </div>

              <!-- ====== SEZIONE 2: AZIONI ====== -->
              <div class="border-t pt-5">
                <div class="flex items-center gap-2 mb-4">
                  <span class="flex items-center justify-center w-6 h-6 bg-zanichelli-blue text-white rounded-full text-xs font-bold">2</span>
                  <h4 class="font-semibold text-gray-800">Genera lista target</h4>
                  <span class="text-xs text-gray-400 ml-1">I docenti target verranno estratti dal database programmi</span>
                </div>
                <div class="flex gap-3">
                  <button type="submit"
                          class="flex-1 py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
                    <i class="fas fa-rocket"></i>
                    Crea Campagna e Genera Target
                  </button>
                  <button type="button" onclick="hideCampaignForm()"
                          class="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    Annulla
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>

        <!-- Target Results (nascosto) -->
        <div id="target-results-container" class="hidden mt-6">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-800">
                <i class="fas fa-list-ol mr-2 text-zanichelli-light"></i>
                Lista Target — <span id="target-campaign-title"></span>
              </h3>
              <div class="flex items-center gap-2">
                <button onclick="exportTargetCSV()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
                  <i class="fas fa-file-csv"></i>
                  Esporta CSV
                </button>
                <button onclick="document.getElementById('target-results-container').classList.add('hidden')" class="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors flex items-center gap-2">
                  <i class="fas fa-times"></i>
                  Chiudi
                </button>
              </div>
            </div>

            <!-- Progress generazione target -->
            <div id="target-progress" class="mb-4 hidden">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-gray-600">Generazione motivazioni...</span>
                <span id="target-progress-text" class="text-sm font-medium text-zanichelli-light">0/0</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="target-progress-bar" class="bg-zanichelli-light h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
            </div>

            <!-- Summary badges -->
            <div class="flex gap-3 mb-4">
              <span id="target-alta" class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Alta: 0
              </span>
              <span id="target-media" class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                Media: 0
              </span>
              <span id="target-bassa" class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                Bassa: 0
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th class="px-4 py-3 font-medium w-8">#</th>
                    <th class="px-4 py-3 font-medium">Docente</th>
                    <th class="px-4 py-3 font-medium">Ateneo</th>
                    <th class="px-4 py-3 font-medium">Materia</th>
                    <th class="px-4 py-3 font-medium">Scenario</th>
                    <th class="px-4 py-3 font-medium">
                      Rilevanza
                      <div class="text-[10px] font-normal text-gray-400 mt-0.5">
                        <span title="Overlap tematico: % di temi in comune tra il programma del docente e i contenuti di riferimento (volume o framework). Piu e alto, piu il programma e allineato.">📊 Overlap = allineamento temi</span>
                        &middot;
                        <span title="Framework Score: % dei moduli del framework disciplinare MATRIX coperti dal programma del docente. Indica quanto il corso e completo rispetto allo standard della materia.">📐 FW = copertura framework</span>
                      </div>
                    </th>
                    <th class="px-4 py-3 font-medium">Motivazione</th>
                  </tr>
                </thead>
                <tbody id="target-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================== SEZIONE IMPOSTAZIONI ===================== -->
      <section id="section-impostazioni" class="section hidden">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-cog text-zanichelli-light mr-2"></i>
            Impostazioni
          </h2>
          <p class="text-gray-500 mt-1">Configura la tua API Key e le preferenze</p>
        </div>

        <div class="max-w-2xl space-y-6">
          <!-- API Key -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-800 mb-1">
              <i class="fas fa-key mr-2 text-zanichelli-light"></i>
              API Key OpenAI
            </h3>
            <p class="text-sm text-gray-500 mb-4">La chiave viene salvata solo nel tuo browser (localStorage). Non viene mai inviata al server.</p>
            <div class="flex gap-3">
              <div class="relative flex-1">
                <input type="password" id="settings-apikey" 
                       class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none font-mono text-sm"
                       placeholder="sk-...">
                <button onclick="toggleApiKeyVisibility()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i id="apikey-eye-icon" class="fas fa-eye"></i>
                </button>
              </div>
              <button onclick="saveApiKey()" class="px-6 py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors">
                <i class="fas fa-save mr-1"></i>
                Salva
              </button>
            </div>
            <div id="apikey-status" class="mt-2 text-sm"></div>
          </div>

          <!-- Modello LLM -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-800 mb-1">
              <i class="fas fa-robot mr-2 text-zanichelli-light"></i>
              Modello LLM
            </h3>
            <p class="text-sm text-gray-500 mb-4">Seleziona il modello OpenAI da utilizzare per le analisi</p>
            <select id="settings-model" onchange="saveModel()" 
                    class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
              <option value="gpt-4o-mini">GPT-4o Mini (consigliato — veloce e economico)</option>
              <option value="gpt-4o">GPT-4o (più preciso, più costoso)</option>
              <option value="gpt-4.1-mini">GPT-4.1 Mini (ultimo modello economico)</option>
              <option value="gpt-4.1">GPT-4.1 (ultimo modello avanzato)</option>
            </select>
          </div>

          <!-- Connessione Supabase -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-800 mb-1">
              <i class="fas fa-database mr-2 text-zanichelli-light"></i>
              Connessione Supabase
            </h3>
            <p class="text-sm text-gray-500 mb-4">Configura i dettagli della tua istanza Supabase</p>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">URL del progetto</label>
                <input type="text" id="settings-supabase-url"
                       class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm font-mono"
                       placeholder="https://xxxxx.supabase.co">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Anon Key</label>
                <input type="text" id="settings-supabase-key"
                       class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm font-mono"
                       placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
              </div>
              <button onclick="saveSupabaseConfig()" 
                      class="px-6 py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors">
                <i class="fas fa-save mr-1"></i>
                Salva Configurazione
              </button>
              <div id="supabase-status" class="text-sm"></div>
            </div>
          </div>

          <!-- Info -->
          <div class="bg-zanichelli-accent rounded-xl p-6">
            <h3 class="font-semibold text-zanichelli-blue mb-2">
              <i class="fas fa-info-circle mr-2"></i>
              Informazioni
            </h3>
            <ul class="text-sm text-zanichelli-blue/80 space-y-1">
              <li><strong>Versione:</strong> MVP v0.1</li>
              <li><strong>Compatibilità:</strong> Chrome, Firefox, Safari, Edge</li>
              <li><strong>Dati:</strong> I tuoi dati sono salvati su Supabase (tuo account)</li>
              <li><strong>API Key:</strong> Salvata solo nel browser, mai sul server</li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  </main>

  <!-- Modal Dettaglio Programma -->
  <div id="modal-overlay" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4" onclick="closeModal(event)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
        <h3 class="text-lg font-semibold text-gray-800">
          <i class="fas fa-id-card mr-2 text-zanichelli-light"></i>
          Dettaglio Programma
        </h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div id="modal-content" class="p-6"></div>
    </div>
  </div>

  <!-- Notification Toast -->
  <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>

  <!-- Scripts -->
  <script src="/static/js/config.js"><\/script>
  <script src="/static/js/utils.js"><\/script>
  <script src="/static/js/auth.js"><\/script>
  <script src="/static/js/llm.js"><\/script>
  <script src="/static/js/upload.js"><\/script>
  <script src="/static/js/database.js"><\/script>
  <script src="/static/js/campagna.js"><\/script>
</body>
</html>`}var ts=t=>(e,s)=>t.fetch(e,{context:s});const He=new ht,ss=Object.assign({"/src/index.tsx":he});let pt=!1;for(const[,t]of Object.entries(ss))t&&(He.all("*",e=>{let s;try{s=e.executionCtx}catch{}return t.fetch(e.req.raw,e.env,s)}),He.notFound(e=>{let s;try{s=e.executionCtx}catch{}return t.fetch(e.req.raw,e.env,s)}),pt=!0);if(!pt)throw new Error("Can't import modules from ['/src/index.tsx']");const rs={path:"/*",preferStatic:!0},ls=ts(He);export{rs as config,ls as default};
