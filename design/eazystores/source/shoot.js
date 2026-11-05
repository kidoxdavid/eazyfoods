const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch();
 const jobs=[['1_home_desktop',1280],['2_buyer_phones',1760],['3_seller_onboarding',1760],['4_seller_studio',1860],['5_shop_looks',1400],['dir_A',520],['dir_B',520],['dir_C',520],['shop_A',520],['shop_B',520],['shop_C',520]];
 for(const [n,w] of jobs){const p=await b.newPage({viewport:{width:w,height:900},deviceScaleFactor:1.5});await p.goto('file://'+'/tmp/claude-0/-home-user/9231efc3-27e1-52c8-9bf8-f2e603c79dbc/scratchpad/es'+'/'+n+'.html');await p.waitForTimeout(2200);await p.screenshot({path:n+'.png',fullPage:true});await p.close();console.log(n)}
 await b.close()})()
