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
 assert.match(await page.locator('#appVersion').innerText(),/v3\.5\.0/);
 assert.match(await page.locator('.brand').innerText(),/House & Cart/);
 assert.equal(await page.locator('.mobile-bottom-nav button').count(),5);
 assert.equal(await page.locator('#cloudStatusDetail').count(),0);
 assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth),true,'Mobile horizontal overflow');
 assert.equal(await page.evaluate(()=>formatQuantity(300,'ml')),'300 mL');
 assert.equal(await page.evaluate(()=>formatQuantity(1000,'ml')),'1 L');
 assert.equal(await page.evaluate(()=>formatQuantity(1500,'ml')),'1.5 L');
 assert.equal(await page.evaluate(()=>formatQuantity(1250,'g')),'1.25 kg');
 assert.equal(await page.evaluate(()=>formatQuantity(0.25,'kg')),'250 g');
 assert.equal(await page.evaluate(()=>formatQuantity(1500,'mg')),'1.5 g');
 assert.equal(await page.evaluate(()=>formatQuantity(100,'cl')),'1 L');
 assert.equal(await page.evaluate(()=>formatQuantity(10,'dl')),'1 L');
 assert.equal(await page.evaluate(()=>formatQuantity(4,'cup')),'1 L');
 assert.equal(await page.evaluate(()=>formatQuantity(7,'handful')),'7 handful');
 assert.equal(await page.evaluate(()=>convertQty(2,'tbsp','ml')),30);
 assert.equal(await page.evaluate(()=>convertQty(1,'kg','g')),1000);
 assert.equal(await page.evaluate(()=>fieldWordMatch('Fresh strawberries','str')),true);
 assert.equal(await page.evaluate(()=>fieldWordMatch('Fresh strawberries','raw')),false);
 assert.equal(await page.evaluate(()=>fieldWordMatch('Goûter maison','gou')),true);
 assert.equal(await page.evaluate(()=>stableJson({b:1,a:{z:2,x:3}})),await page.evaluate(()=>stableJson({a:{x:3,z:2},b:1})));

 await page.locator('#mobileNav button[data-mobile-view="plan"]').click();
 assert.equal(await page.locator('.day').count(),7);
 assert.equal(await page.locator('.day .slot[data-extra="true"]').count(),0);
 await page.locator('.day .planner-extra-toggle').first().click();
 assert.equal(await page.getByRole('dialog',{name:/Add a meal occasion/}).isVisible(),true);
 assert.ok(await page.locator('.occasion-choice[data-occasion="Apéro"]').count()>0);
 await page.locator('.occasion-choice[data-occasion="Apéro"]').click();
 assert.equal(await page.locator('.day').first().locator('.slot[data-occasion="Apéro"]').count(),1);
 assert.equal(await page.locator('.day').first().locator('.slot[data-extra="true"]').count(),1,'Only chosen extra occasion should appear');
 await page.locator('.day .planner-extra-toggle').first().click();
 await page.locator('#customOccasionInput').fill('Midnight feast');
 await page.locator('#customOccasionForm button[type="submit"]').click();
 assert.equal(await page.locator('.day').first().locator('.slot[data-occasion="Midnight feast"]').count(),1);
 assert.equal(await page.evaluate(()=>db.settings.customMealOccasions.includes('Midnight feast')),true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#mobileNav button[data-mobile-view="plan"]').click();
 assert.equal(await page.locator('.day').first().locator('.slot[data-occasion="Midnight feast"]').count(),1,'Chosen occasion should persist after reload');
 await page.locator('.day').first().locator('.slot[data-occasion="Midnight feast"] .occasion-remove').click();
 assert.equal(await page.locator('.day').first().locator('.slot[data-occasion="Midnight feast"]').count(),0,'Occasion removable per day');
 assert.equal(await page.evaluate(()=>getMealOccasions().includes('Midnight feast')),true,'Custom occasion remains reusable');
 await page.locator('.day .planner-extra-toggle').first().click();
 await page.locator('.occasion-choice[data-occasion="Midnight feast"]').click();

 await page.locator('.mobile-menu-button').click();
 assert.equal(await page.getByRole('dialog').isVisible(),true);
 assert.ok(await page.getByRole('button',{name:/Recovery snapshot/}).count()>0);
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').isVisible(),false);

 await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
 // Recipe families can be created, renamed and reused independently of meal occasions.
 await page.getByRole('button',{name:/Manage families/}).click();
 assert.equal(await page.getByRole('dialog',{name:/Manage recipe families/}).isVisible(),true);
 await page.locator('#newRecipeFamily').fill('Risotto');
 await page.locator('#addRecipeFamilyForm button[type="submit"]').click();
 assert.equal(await page.locator('.family-editor-row[data-name="Risotto"]').count(),1);
 await page.locator('.family-editor-row[data-name="Risotto"] input').fill('Risotto & Rice');
 await page.locator('.family-editor-row[data-name="Risotto"] button[data-action="rename"]').click();
 assert.equal(await page.locator('.family-editor-row[data-name="Risotto & Rice"]').count(),1);
 await page.locator('#modalback .x').click();
 await page.getByRole('button',{name:/Create meal/}).click();
 assert.equal(await page.locator('#mealForm select[name="category"] option').filter({hasText:'Midnight feast'}).count(),1,'Custom occasion appears in recipe category choices');
 assert.equal(await page.locator('#mealForm select[name="family"] option').filter({hasText:'Risotto & Rice'}).count(),1);
 const familySelect=page.locator('#mealForm select[name="family"] + .styled-select');
 await familySelect.locator('.styled-select-trigger').click();
 await familySelect.locator('.styled-select-option',{hasText:'Risotto & Rice'}).click();
 await page.getByRole('button',{name:/Add ingredient/}).click();
 const row=page.locator('.ingredient-row').first();
 await row.locator('.search-picker input').fill('Milk');
 await row.locator('.ing-qty').fill('1500');
 assert.match(await row.locator('.quantity-preview').innerText(),/1\.5 L/);
 await page.locator('#mealForm input[name="name"]').fill('Strawberry smoothie');
 await page.locator('#mealForm button[type="submit"],#mealForm button.btn.green').first().click();
 assert.equal(await page.locator('#mealGrid .meal-card').count(),1);
 assert.equal(await page.evaluate(()=>db.meals[0].family),'Risotto & Rice');
 assert.equal(await page.locator('.meal-card .family-inline-tag').innerText(),'Risotto & Rice');
 const cardFavorite=page.locator('.meal-card-favorite').first();
 assert.equal(await cardFavorite.getAttribute('aria-pressed'),'false');
 await cardFavorite.click();
 assert.equal(await page.evaluate(()=>db.meals[0].favorite),true,'Card heart toggles without opening recipe');
 assert.equal(await page.getByRole('dialog').isVisible(),false);
 await page.locator('.meal-card h3').first().click();
 const favoriteButton=page.locator('.recipe-favorite-button');
 assert.equal(await favoriteButton.innerText(),'♥');
 assert.match(await favoriteButton.getAttribute('aria-label'),/Remove from favorites/);
 assert.ok(await page.locator('.recipe-title-and-favorite h1').count()===1,'Favorite appears on the title row');
 await favoriteButton.click();
 assert.equal(await favoriteButton.getAttribute('aria-pressed'),'false');
 assert.equal(await page.evaluate(()=>db.meals[0].favorite),false);
 await favoriteButton.click();
 assert.equal(await favoriteButton.getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>db.meals[0].favorite),true);
 await page.locator('#modalback .x').click();


 // Assignments survive a rename, and deletion clears only the family assignment, not the recipe.
 await page.getByRole('button',{name:/Manage families/}).click();
 await page.locator('.family-editor-row[data-name="Risotto & Rice"] input').fill('Rice dishes');
 await page.locator('.family-editor-row[data-name="Risotto & Rice"] button[data-action="rename"]').click();
 assert.equal(await page.evaluate(()=>db.meals[0].family),'Rice dishes');
 assert.equal(await page.locator('.family-filter-chips button[data-family="Rice dishes"]').count(),1);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('.family-editor-row[data-name="Rice dishes"] button[data-action="delete"]').click();
 assert.equal(await page.evaluate(()=>db.meals[0].family),'');
 assert.equal(await page.locator('#mealGrid .meal-card').count(),1,'Deleting a family never deletes recipes');
 await page.locator('#modalback .x').click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
 assert.equal(await page.evaluate(()=>getRecipeFamilies().includes('Rice dishes')),false,'Deleted families stay deleted after reload');
 assert.equal(await page.evaluate(()=>db.meals.length),1,'Saved recipes survive the family deletion');
 await page.locator('#mealSearch').fill('raw');
 assert.equal(await page.locator('#mealGrid .meal-card:not(.hidden)').count(),0,'Word-inside should not match');
 assert.match(await page.locator('#mealSearchSummary').innerText(),/0 recipes/);
 assert.equal(await page.locator('#mealSearchEmpty').isVisible(),true);
 await page.locator('#mealSearch').fill('smo');
 assert.equal(await page.locator('#mealGrid .meal-card:not(.hidden)').count(),1,'Word-start should match');
 await page.locator('#mobileNav button[data-mobile-view="home"]').click();
 assert.equal(await page.locator('.backup-notice').count(),1,'Backup reminder for saved recipes');
 await page.evaluate(()=>{
  const key=dateKey(weekDays()[0]),meal=db.meals[0];
  db.plan[key]??={};
  for(const occasion of ['Breakfast','Lunch','Dinner','Apéro','Midnight feast'])db.plan[key][occasion]={mealId:meal.id,servings:2};
  save();render();
 });
 await page.locator('#mobileNav button[data-mobile-view="home"]').click();
 const homeDay=page.locator('.home-menu-day').first();
 assert.equal(await homeDay.locator('.home-meal-chip').count(),3,'Home summary shows Breakfast Lunch Dinner if all are planned');
 await homeDay.getByRole('button',{name:/2 more/}).click();
 assert.equal(await homeDay.locator('.home-meal-chip').count(),5,'Home summary expands when requested');
 await homeDay.getByRole('button',{name:/Show less/}).click();
 assert.equal(await homeDay.locator('.home-meal-chip').count(),3);

 await page.evaluate(()=>{
  const day=dateKey(weekDays()[0]);
  delete db.plan[day].Lunch;
  save();render();
 });
 assert.equal(await homeDay.locator('.home-meal-chip').count(),2,'Only planned core occasions show (no empty Lunch)');
 assert.equal(await homeDay.locator('.home-meal-kind').allInnerTexts().then(x=>x.map(y=>y.toLowerCase()).join(',')),'breakfast,dinner');
 await homeDay.getByRole('button',{name:/2 more/}).click();
 assert.equal(await homeDay.locator('.home-meal-chip').count(),4);
 await homeDay.getByRole('button',{name:/Show less/}).click();
 await page.evaluate(()=>window.scrollTo(0,1000));
 await page.waitForFunction(()=>window.scrollY>100);
 await page.locator('#mobileNav button[data-mobile-view="plan"]').click();
 await page.waitForFunction(()=>window.scrollY<2);
 assert.equal(await page.evaluate(()=>window.scrollY),0,'Tab navigation starts at top');
 await page.locator('#mobileNav button[data-mobile-view="home"]').click();
 await page.evaluate(()=>{
  const node=document.getElementById('main');
  const start=new Event('touchstart',{bubbles:true});
  Object.defineProperty(start,'touches',{value:[{clientX:325,clientY:360}]});
  node.dispatchEvent(start);
  const end=new Event('touchend',{bubbles:true});
  Object.defineProperty(end,'changedTouches',{value:[{clientX:65,clientY:380}]});
  node.dispatchEvent(end);
 });
 assert.equal(await page.evaluate(()=>tabSwipeBusy),true,'A swipe starts an animated transition');
 await page.waitForFunction(()=>document.querySelector('#mobileNav button.active')?.dataset.mobileView==='meals',{timeout:5000});
 await page.waitForFunction(()=>!tabSwipeBusy,{timeout:5000});
 assert.equal(await page.locator('#mobileNav button.active').getAttribute('data-mobile-view'),'meals','Left swipe moves to next tab');
 await page.evaluate(()=>{
  const node=document.getElementById('main');
  const start=new Event('touchstart',{bubbles:true});
  Object.defineProperty(start,'touches',{value:[{clientX:60,clientY:360}]});
  node.dispatchEvent(start);
  const end=new Event('touchend',{bubbles:true});
  Object.defineProperty(end,'changedTouches',{value:[{clientX:320,clientY:380}]});
  node.dispatchEvent(end);
 });
 await page.waitForFunction(()=>document.querySelector('#mobileNav button.active')?.dataset.mobileView==='home',{timeout:5000});
 await page.waitForFunction(()=>!tabSwipeBusy,{timeout:5000});
 assert.equal(await page.locator('#mobileNav button.active').getAttribute('data-mobile-view'),'home','Right swipe moves to previous tab');


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
 console.log('PASS: recipe families create/rename/delete, priority Home meals, card and detail hearts, animated swipes, backups, cloud and desktop');
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
