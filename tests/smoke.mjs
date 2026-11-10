import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.abort());
try {
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#mobileNav button');
 assert.match(await page.locator('#appVersion').innerText(),/v3\.3\.0/);
 assert.match(await page.locator('.brand').innerText(),/House & Cart/);
 assert.equal(await page.locator('.mobile-bottom-nav button').count(),5);
 assert.equal(await page.locator('#cloudStatusDetail').count(),0);
 assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth),true,'Mobile horizontal overflow');
 assert.equal(await page.evaluate(()=>formatQuantity(300,'ml')),'300 mL');
 assert.equal(await page.evaluate(()=>formatQuantity(1000,'ml')),'1 L');
 assert.equal(await page.evaluate(()=>formatQuantity(1500,'ml')),'1.5 L');
 assert.equal(await page.evaluate(()=>fieldWordMatch('Fresh strawberries','str')),true);
 assert.equal(await page.evaluate(()=>fieldWordMatch('Fresh strawberries','raw')),false);
 assert.equal(await page.evaluate(()=>fieldWordMatch('Goûter maison','gou')),true);
 assert.equal(await page.evaluate(()=>stableJson({b:1,a:{z:2,x:3}})),await page.evaluate(()=>stableJson({a:{x:3,z:2},b:1})));

 await page.locator('#mobileNav button[data-mobile-view="plan"]').click();
 assert.equal(await page.locator('.day').count(),7);
 assert.equal(await page.locator('.day .slot[data-extra="true"]').count(),0);
 await page.locator('.day .planner-extra-toggle').first().click();
 assert.ok(await page.locator('.day .slot[data-extra="true"]').count()>=4,'Apéro/Goûter slots are expandable');
 assert.ok(await page.getByText('Apéro',{exact:true}).count()>0);
 assert.ok(await page.getByText('Goûter',{exact:true}).count()>0);

 await page.locator('.mobile-menu-button').click();
 assert.equal(await page.getByRole('dialog').isVisible(),true);
 assert.ok(await page.getByRole('button',{name:/Recovery snapshot/}).count()>0);
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').isVisible(),false);

 await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
 await page.getByRole('button',{name:/Create meal/}).click();
 await page.getByRole('button',{name:/Add ingredient/}).click();
 const row=page.locator('.ingredient-row').first();
 await row.locator('.search-picker input').fill('Milk');
 await row.locator('.ing-qty').fill('1500');
 assert.match(await row.locator('.quantity-preview').innerText(),/1\.5 L/);
 await page.locator('#mealForm input[name="name"]').fill('Strawberry smoothie');
 await page.locator('#mealForm button[type="submit"],#mealForm button.btn.green').first().click();
 assert.equal(await page.locator('#mealGrid .meal-card').count(),1);

 await page.locator('#mealSearch').fill('raw');
 assert.equal(await page.locator('#mealGrid .meal-card:not(.hidden)').count(),0,'Word-inside should not match');
 assert.match(await page.locator('#mealSearchSummary').innerText(),/0 recipes/);
 assert.equal(await page.locator('#mealSearchEmpty').isVisible(),true);
 await page.locator('#mealSearch').fill('smo');
 assert.equal(await page.locator('#mealGrid .meal-card:not(.hidden)').count(),1,'Word-start should match');
 await page.locator('#mobileNav button[data-mobile-view="home"]').click();
 assert.equal(await page.locator('.backup-notice').count(),1,'Backup reminder for saved recipes');

 const snap=await page.evaluate(()=>snapshotForRecovery('Automated smoke test'));
 assert.equal(snap,true);
 await page.locator('.mobile-menu-button').click();
 await page.getByRole('button',{name:/Recovery snapshot/}).click();
 assert.match(await page.getByRole('dialog').innerText(),/Automated smoke test/);
 await page.keyboard.press('Escape');
 await page.screenshot({path:'housecart-mobile.png',fullPage:true});

 await page.setViewportSize({width:1440,height:900});
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.top-actions').isVisible(),true);
 assert.equal(await page.locator('#mobileNav').isVisible(),false);
 await page.screenshot({path:'housecart-desktop.png',fullPage:true});

 await testMockCloudSync(browser,origin);
 assert.deepEqual(errors,[],'Browser JavaScript exceptions');
 console.log('PASS: mobile navigation, planner, recipe editing, unit formatting, searches, backups, desktop layout');
}finally{
 await browser.close();
}

async function testMockCloudSync(browser,origin){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const faults=[];
 page.on('pageerror',e=>faults.push(String(e)));
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.abort());
 await page.addInitScript(()=>{
  const state={row:null};
  window.__fakeCloudState=state;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const user={id:'00000000-0000-4000-8000-000000000001',email:'qa@example.com'};
  window.supabase={createClient(){
   return {
    auth:{
     getSession:async()=>({data:{session:{user}},error:null}),
     onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
    },
    from(){
     let operation=null,write=null,filters={};
     const builder={
      select(){return builder},
      eq(k,v){filters[k]=v;return builder},
      is(k,v){filters[k]=v;return builder},
      update(value){operation='update';write=value;return builder},
      insert(value){operation='insert';write=value;return builder},
      async maybeSingle(){return {data:state.row?copy(state.row):null,error:null}},
      then(resolve,reject){
       let result;
       if(operation==='insert'){
        if(state.row)result={data:null,error:{message:'Row already exists'}};
        else{state.row=copy(write);result={data:[{updated_at:state.row.updated_at}],error:null}}
       }else if(operation==='update'){
        if(!state.row||state.row.updated_at!==filters.updated_at)result={data:[],error:null};
        else{state.row=copy({...state.row,...write});result={data:[{updated_at:state.row.updated_at}],error:null}}
       }else result={data:[],error:null};
       return Promise.resolve(result).then(resolve,reject);
      }
     };
     return builder;
    },
    channel(){return {on(){return this},subscribe(){return this}}},
    removeChannel:async()=>{}
   };
  }};
 });
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudStatusLabel')?.textContent.includes('Cloud synced'),{timeout:15000});
  await page.evaluate(()=>{
   db.meals.push({id:'local1',name:'First synced recipe',category:['Dinner'],servings:2,ingredients:[],steps:[]});
   save();
  });
  await page.waitForFunction(()=>window.__fakeCloudState.row?.payload.meals?.some(x=>x.id==='local1'),{timeout:15000});
  await page.evaluate(()=>{
   window.__fakeCloudState.row.payload.meals.push({id:'remote1',name:'Remote edit',category:['Dinner'],servings:2,ingredients:[],steps:[]});
   window.__fakeCloudState.row.updated_at=new Date(Date.now()+5000).toISOString();
   db.meals.push({id:'local2',name:'Unsynced local edit',category:['Dinner'],servings:2,ingredients:[],steps:[]});
   save();
  });
  const dialog=page.getByRole('dialog',{name:/Choose which data to keep/});
  await dialog.waitFor({timeout:15000});
  assert.equal(await page.evaluate(()=>window.__fakeCloudState.row.payload.meals.some(x=>x.id==='local2')),false,'Conflict must not overwrite cloud automatically');
  await dialog.getByRole('button',{name:/Not now/}).click();
  await page.waitForTimeout(1400);
  assert.equal(await dialog.isVisible(),false,'Choosing Not now must not reopen the conflict');
  await page.evaluate(()=>{syncNow('both')});
  await dialog.waitFor({timeout:15000});
  await dialog.getByRole('button',{name:/Use cloud data/}).click();
  await page.waitForFunction(()=>db.meals.some(m=>m.id==='remote1')&&!db.meals.some(m=>m.id==='local2'),{timeout:15000});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(RECOVERY_KEY)).payload.meals.some(x=>x.id==='local2')),true,'Recovery snapshot must preserve the local version');
  assert.deepEqual(faults,[],'No JavaScript exceptions in cloud sync');
  console.log('PASS: mocked cloud sync with optimistic updates, conflict cancel and recovery snapshot');
 }finally{await page.close()}
}
