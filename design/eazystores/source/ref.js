const {chromium}=require('playwright');
const jobs=[
 ['2_buyer_phones',['buyer-home','buyer-category','buyer-product','buyer-basket'],1760],
 ['3_seller_onboarding',['seller-onboarding-1-what-do-you-sell','seller-onboarding-2-shop-identity','seller-onboarding-3-first-product','seller-onboarding-4-live'],1760],
 ['shop_A',['shop-look-atelier'],520],['shop_B',['shop-look-noir'],520],['shop_C',['shop-look-sage'],520],
 ['dir_A',['home-direction-atelier'],520],['dir_B',['home-direction-noir'],520],['dir_C',['home-direction-sage'],520],
 ['4_seller_studio',['studio-desktop','studio-phone'],1860],
];
(async()=>{const b=await chromium.launch();
 for(const [n,names,w] of jobs){const p=await b.newPage({viewport:{width:w,height:900},deviceScaleFactor:2});await p.goto('file:///tmp/claude-0/-home-user/9231efc3-27e1-52c8-9bf8-f2e603c79dbc/scratchpad/es/'+n+'.html');await p.waitForTimeout(2200);
  const phones=await p.$$('.phone');
  if(n==='4_seller_studio'){const desk=await p.$('div[style*="width:1180px"]');await desk.screenshot({path:'/tmp/claude-0/-home-user/9231efc3-27e1-52c8-9bf8-f2e603c79dbc/scratchpad/es/ref/'+names[0]+'.png'});const bb=await phones[0].boundingBox();await p.screenshot({path:'/tmp/claude-0/-home-user/9231efc3-27e1-52c8-9bf8-f2e603c79dbc/scratchpad/es/ref/'+names[1]+'.png',clip:{x:bb.x,y:bb.y+46,width:390,height:798}});}
  else for(let i=0;i<names.length;i++){const bb=await phones[i].boundingBox();await p.screenshot({path:'/tmp/claude-0/-home-user/9231efc3-27e1-52c8-9bf8-f2e603c79dbc/scratchpad/es/ref/'+names[i]+'.png',clip:{x:bb.x,y:bb.y+46,width:390,height:798}});}
  await p.close();console.log(n)}
 const p=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});await p.goto('file:///tmp/claude-0/-home-user/9231efc3-27e1-52c8-9bf8-f2e603c79dbc/scratchpad/es/1_home_desktop.html');await p.waitForTimeout(2200);await p.screenshot({path:'/tmp/claude-0/-home-user/9231efc3-27e1-52c8-9bf8-f2e603c79dbc/scratchpad/es/ref/buyer-home-desktop.png',fullPage:true});
 await b.close()})()
