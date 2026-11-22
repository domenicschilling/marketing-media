(function(){
  var html=document.documentElement,bewegt=html.classList.contains('armed');

  // Tattoo-Karten: Kamera faehrt auf das Tattoo, sobald die Karte im Bild ist
  if(bewegt&&'IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return;
      var k=e.target;void k.offsetWidth;k.classList.add('drin');io.unobserve(k);
    })},{threshold:.55});
    document.querySelectorAll('.karte').forEach(function(k){io.observe(k)});
  }

  // Daumen nochmal
  var nb=document.getElementById('nochmal'),box=document.querySelector('.box');
  if(nb&&box&&bewegt&&box.getAnimations){
    nb.hidden=false;
    nb.addEventListener('click',function(){
      box.getAnimations({subtree:true}).forEach(function(a){a.cancel();a.play()});
    });
  }

  // Beispiel-Liste
  var ARM=document.getElementById('mini-vorlage');
  document.querySelectorAll('.reihe button').forEach(function(btn){
    var r=btn.closest('.reihe');
    var of=r.querySelector('.offen');if(of)of.hidden=true;
    btn.hidden=false;
    btn.addEventListener('click',function(){
      btn.disabled=true;btn.textContent='Link ist raus';
      setTimeout(function(){
        var s=ARM.content?ARM.content.cloneNode(true).firstElementChild:null;
        if(s){if(bewegt)s.classList.add('neu');btn.replaceWith(s)}
        var m=document.getElementById('listen-status');
        m.textContent=document.querySelector('.reihe button')?'Beispiel: bezahlt. Daumen hoch.':'Beispiel: alles bezahlt. Daumen hoch.';
      },bewegt?800:0);
    });
  });

  // Formular (Demo)
  var form=document.getElementById('studio-form');
  if(form){
    var feld=document.getElementById('f-name'),pv=document.getElementById('pv'),fin=document.getElementById('fin'),antw=document.getElementById('antwort');
    var START=pv.textContent;
    feld.addEventListener('input',function(){
      pv.textContent=feld.value.trim()||START;
      fin.classList.remove('go');antw.textContent='';
    });
    form.addEventListener('submit',function(ev){
      ev.preventDefault();
      pv.textContent=feld.value.trim()||START;
      fin.classList.add('go');
      fin.scrollIntoView({block:'center',behavior:bewegt?'smooth':'auto'});
      antw.textContent='Daumen hoch, '+pv.textContent+'! Das war nur die Demo: Es wurde nichts gesendet und nichts gespeichert. Im echten Start bestätigst du den Vertrag, legst dein Stripe-Konto an, und wir richten den Rest mit dir ein.';
    });
  }

  // Klebeleiste am Handy
  var kl=document.getElementById('klebe');
  if(kl&&'IntersectionObserver' in window){
    var s={};
    var ob=new IntersectionObserver(function(es){
      es.forEach(function(e){s[e.target.id]=e.isIntersecting});
      kl.classList.toggle('an',!s.first&&!s.start);
    });
    ['first','start'].forEach(function(i){var el=document.getElementById(i);if(el)ob.observe(el)});
  }
})();
