/** Runs before React hydration — instant scroll on iOS Safari first touch. */
export const SCROLL_UNLOCK_INLINE_SCRIPT = `
(function(){
  try {
    var d=document.documentElement,b=document.body;
    var touch=window.matchMedia("(max-width:1023px),(pointer:coarse)").matches;
    for(var i=0;i<2;i++){
      var el=i?b:d;
      if(!el) continue;
      el.style.overflow="";
      el.style.overflowY="";
      el.style.overflowX="";
      el.style.position="";
      el.style.height="";
      el.style.width="";
      el.style.top="";
      el.style.left="";
      el.style.right="";
      el.style.paddingRight="";
      el.style.touchAction="";
      el.classList.remove("overflow-hidden","modal-open","menu-open","nav-open");
    }
    d.classList.add("scroll-ready");
    if(touch){
      d.classList.add("is-touch");
      d.style.overflowX="hidden";
      d.style.overflowY="auto";
      d.style.webkitOverflowScrolling="touch";
      d.style.scrollBehavior="auto";
      b.style.overflowX="hidden";
      b.style.overflowY="auto";
      b.style.webkitOverflowScrolling="touch";
      b.style.touchAction="pan-y";
    }
  }catch(e){}
})();
`.trim();
