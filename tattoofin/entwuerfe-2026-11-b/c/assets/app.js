(function(){
  var doc=document.documentElement;doc.classList.add('js');
  var nav=document.getElementById('sleeve'),figur=document.getElementById('figur'),linie=document.getElementById('linie');
  var fuell=document.getElementById('armfl'),kante=document.getElementById('armli'),gelb=document.getElementById('armgelb'),streu=document.getElementById('streu');
  var stellen=[].slice.call(nav.querySelectorAll('.stelle'));
  var bereiche=stellen.map(function(a){return document.querySelector(a.getAttribute('href'))});
  var grosse=[].slice.call(document.querySelectorAll('.gross'));

  function glatt(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
  function buckel(t,m,s){var d=(t-m)/s;return Math.exp(-d*d)}

  var maß={};
  function messen(){
    var vw=doc.clientWidth,r=figur.getBoundingClientRect(),W=r.width,sy=window.scrollY||0;
    maß.vw=vw;maß.H=nav.clientHeight;maß.W=W;
    maß.c=r.left+.8625*W;maß.w0=.171*W;
    maß.schnitt0=r.top+sy+r.height-2;
    maß.strich=Math.max(4,.0235*W);
    var dk=vw>=1100,mt=vw>=700;
    maß.w1=dk?186:mt?100:56;
    maß.flare=dk?300:mt?130:64;
    maß.drift=dk?16:mt?6:1;
    maß.stag=dk?42:0;
    var svg=nav.querySelector('svg.arm');
    svg.setAttribute('viewBox','0 0 '+vw+' '+maß.H);
    if(linie){var rr=vw-(maß.c-maß.w0/2)+1;if(vw<1100)linie.style.right=rr+'px';else linie.style.right=rr+'px'}
  }
  function breite(y,schnitt){
    var H=maß.H,t=(y-schnitt)/Math.max(1,H-schnitt);
    var x=Math.max(0,Math.min(1,(y-schnitt)/maß.flare));
    var w=maß.w0+(maß.w1-maß.w0)*(1-(1-x)*(1-x));
    var k=maß.stag?1.15:1;
    var f=1+.09*k*buckel(t,.26,.17)-.13*k*buckel(t,.56,.1)+.08*k*buckel(t,.8,.13);
    return Math.max(maß.w0,w*f);
  }
  function mitte(y,schnitt){
    var H=maß.H,t=(y-schnitt)/Math.max(1,H-schnitt);
    return maß.c-maß.drift*Math.sin(Math.PI*Math.min(1,t))*glatt(0,maß.flare,y-schnitt);
  }
  function kurve(p){
    var d='';
    for(var i=0;i<p.length-1;i++){
      var a=p[i-1]||p[i],b=p[i],c=p[i+1],e=p[i+2]||c;
      var c1x=b[0]+(c[0]-a[0])/6,c1y=b[1]+(c[1]-a[1])/6,c2x=c[0]-(e[0]-b[0])/6,c2y=c[1]-(e[1]-b[1])/6;
      d+='C'+c1x.toFixed(1)+' '+c1y.toFixed(1)+' '+c2x.toFixed(1)+' '+c2y.toFixed(1)+' '+c[0].toFixed(1)+' '+c[1].toFixed(1);
    }
    return d;
  }
  function zeichnen(){
    var sy=window.scrollY||0,H=maß.H,schnitt=maß.schnitt0-sy;
    var start=Math.max(-20,schnitt),L=[],R=[],n=26,y;
    for(var i=0;i<=n;i++){
      y=start+(H+30-start)*i/n;
      if(i>0&&y-schnitt<maß.flare*1.4){}
      var w=breite(y,schnitt),c=mitte(y,schnitt);
      L.push([c-w/2,y]);R.push([c+w/2,y]);
    }
    var dL='M'+L[0][0].toFixed(1)+' '+L[0][1].toFixed(1)+kurve(L);
    var dR='M'+R[0][0].toFixed(1)+' '+R[0][1].toFixed(1)+kurve(R);
    var rRev=R.slice().reverse();
    fuell.setAttribute('d',dL+'L'+rRev[0][0].toFixed(1)+' '+rRev[0][1].toFixed(1)+kurve(rRev)+'Z');
    kante.setAttribute('d',dL+dR);
    kante.setAttribute('stroke-width',maß.strich.toFixed(1));
    // Gelbe Hautfarbe der Figur läuft unter dem Schnitt aus: Ab hier ist der Arm noch nicht gestochen.
    if(schnitt>-60){
      var a=breite(schnitt+2,schnitt),cx=mitte(schnitt,schnitt);
      var h=Math.min(24,maß.flare*.34),w2=breite(schnitt+h,schnitt);
      gelb.setAttribute('d','M'+(cx-a/2)+' '+(schnitt-1)+'L'+(cx+a/2)+' '+(schnitt-1)+'L'+(cx+w2/2)+' '+(schnitt+h*.8)
        +'C'+(cx+w2*.3)+' '+(schnitt+h*1.25)+' '+(cx+w2*.16)+' '+(schnitt+h*.55)+' '+cx+' '+(schnitt+h*.85)
        +'C'+(cx-w2*.18)+' '+(schnitt+h*1.2)+' '+(cx-w2*.3)+' '+(schnitt+h*.65)+' '+(cx-w2/2)+' '+(schnitt+h*1.05)+'Z');
    }else gelb.setAttribute('d','');
    // Motive: am Anfang gedrängt unter der Figur, dann verteilt über die ganze Armlänge.
    var ms=stellen[0].offsetHeight,voll=maß.stag?2:1;
    var oben=Math.max(ms*.5+10,schnitt+Math.min(maß.flare*.5,70)+ms*.42),unten=H-ms*.5-8;
    var sch=(unten-oben)/(stellen.length-1);
    var skala=Math.max(.62,Math.min(1,(sch*voll-(maß.stag?10:2))/ms));
    stellen.forEach(function(a,i){
      var y=oben+sch*i,cx=mitte(y,schnitt)+(i%2?1:-1)*maß.stag;
      var rect=nav.getBoundingClientRect();
      a.style.transform='translate('+(cx-rect.left-a.offsetWidth/2).toFixed(1)+'px,'+(y-a.offsetHeight/2).toFixed(1)+'px) scale('+skala.toFixed(3)+')';
    });
    // Füller im Arm: nur wenn Platz ist
    var kids=streu.children,dk=maß.stag>0;
    for(var j=0;j<kids.length;j++){
      var yf=dk?oben+sch*j+((j%2)?-8:8):oben+sch*(j+.5),cf=mitte(yf,schnitt);
      if(dk)cf+=(j%2?-1:1)*maß.stag*1.02;
      var gr=dk?(j%2?3.1:2.5):1;
      kids[j].setAttribute('transform','translate('+cf.toFixed(1)+' '+yf.toFixed(1)+') scale('+gr+')');
      kids[j].style.opacity=(!dk&&j>=kids.length-1)?0:(dk?(sch>78?1:0):(sch>(maß.vw>=700?120:92)?1:0));
    }
  }
  function spuren(){
    var y=window.innerHeight*.45,cur=0;
    bereiche.forEach(function(b,i){if(b&&b.getBoundingClientRect().top<=y)cur=i});
    if(window.innerHeight+window.scrollY>=doc.scrollHeight-4)cur=bereiche.length-1;
    stellen.forEach(function(a,i){
      a.classList.toggle('fertig',i<=cur);
      if(i===cur)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');
    });
  }
  var wartet=false;
  function bild(){wartet=false;zeichnen();spuren()}
  function anfordern(){if(!wartet){wartet=true;requestAnimationFrame(bild)}}
  window.addEventListener('scroll',anfordern,{passive:true});
  window.addEventListener('resize',function(){messen();anfordern()});
  window.addEventListener('load',function(){messen();bild()});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){messen();bild()});
  figur.addEventListener('load',function(){messen();bild()});
  messen();bild();

  stellen.forEach(function(a){a.addEventListener('click',function(){
    a.classList.add('stempel');setTimeout(function(){a.classList.remove('stempel')},380);
  })});

  // Einmaliger, dezenter Hinweis: Die Motive lassen sich antippen.
  if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&(window.scrollY||0)<40){
    stellen.forEach(function(a,i){setTimeout(function(){
      a.classList.add('stempel');setTimeout(function(){a.classList.remove('stempel')},260);
    },700+i*130)});
  }

  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('fertig')})},{threshold:.6});
    grosse.forEach(function(g){io.observe(g)});
  }else grosse.forEach(function(g){g.classList.add('fertig')});

  // Schritte per Tippen
  var tasten=[].slice.call(document.querySelectorAll('.taste')),schritte=[].slice.call(document.querySelectorAll('.schritt'));
  function zeigen(n){
    tasten.forEach(function(t,i){t.setAttribute('aria-pressed',i===n?'true':'false')});
    schritte.forEach(function(s,i){s.hidden=i!==n});
  }
  tasten.forEach(function(t,i){t.addEventListener('click',function(){zeigen(i)})});
  zeigen(0);
})();
