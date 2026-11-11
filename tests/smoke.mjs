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
 assert.match(await page.locator('#appVersion').innerText(),/v3\.9\.0/);
 assert.match(await page.locator('.brand').innerText(),/House & Cart/);
 // The small version badge sits on the same baseline as the app name.
 assert.equal(await page.locator('.brand-name-row #appVersion').count(),1);
 const headerPosition=await page.evaluate(()=>{
  const title=document.querySelector('.brand-name-row > span:first-child').getBoundingClientRect();
  const badge=document.getElementById('appVersion').getBoundingClientRect();
  return {rightOfName:badge.left>=title.right-1,aligned:Math.abs(badge.top-title.top)<14};
 });
 assert.ok(headerPosition.rightOfName&&headerPosition.aligned,'Version badge belongs beside House & Cart');
 const icons=await page.evaluate(async()=>{
  const manifest=await fetch('./manifest.json?v=3.7.1').then(r=>r.json());
  const readIcon=async(src)=>{const img=new Image();img.src=src;await img.decode();return {width:img.naturalWidth,height:img.naturalHeight}};
  const results=await Promise.all(['./icon-192.png?v=3.7.1','./icon-512.png?v=3.7.1','./icon-maskable-512.png?v=3.7.1','./favicon.png?v=3.7.1','./apple-touch-icon.png?v=3.7.1'].map(readIcon));
  return {manifest:manifest.icons.map(x=>({src:x.src,sizes:x.sizes,purpose:x.purpose})),sizes:results};
 });
 assert.deepEqual(icons.sizes.map(x=>[x.width,x.height]),[[192,192],[512,512],[512,512],[64,64],[180,180]],'Five PNG icons use their declared dimensions');
 assert.ok(icons.manifest.every(x=>x.src.endsWith('?v=3.7.1')),'Manifest cache-busts new app icons');
 assert.ok(icons.manifest.some(x=>x.purpose==='maskable'),'Maskable icon included for Android');
 await page.setViewportSize({width:360,height:740});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Header should fit 360px mobile');
 await page.setViewportSize({width:390,height:844});

 const theme=await page.evaluate(()=>({
  background:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase(),
  ink:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim().toLowerCase(),
  champagne:getComputedStyle(document.documentElement).getPropertyValue('--champagne').trim().toLowerCase(),
  themeColor:document.querySelector('meta[name="theme-color"]').content.toLowerCase(),
  primary:getComputedStyle(document.querySelector('.top')).backgroundColor
 }));
 assert.deepEqual([theme.background,theme.ink,theme.champagne,theme.themeColor],['#f8f5ef','#26323a','#c4a574','#26323a'],'Ink & Champagne tokens and Android chrome color');
 assert.equal(await page.locator('.mode-row #cloudStatusBar').count(),1,'Compact status remains beside mode tabs');

 assert.equal(await page.locator('.mobile-bottom-nav button').count(),5);
 assert.equal(await page.locator('#cloudStatusDetail').count(),0);
 assert.equal(await page.locator('.mode-row #cloudStatusBar').count(),1,'Cloud badge must be beside Kitchen and Home care');
 const modeBox=await page.locator('#modeKitchen').boundingBox(),syncBox=await page.locator('#cloudStatusBar').boundingBox();
 assert.ok(syncBox.x>modeBox.x+modeBox.width&&Math.abs(syncBox.y-modeBox.y)<15,'Cloud badge aligned at right of modes');
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
 await page.locator('#mealForm .tag-pick',{hasText:'Chicken'}).click();
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
 assert.equal(await page.evaluate(()=>db.meals[0].tags.includes('Chicken')),true,'Parent recipe tags stored');
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

 // A variation inherits the parent but replaces selected ingredients and may override instructions.
 await page.locator('.meal-card h3').first().click();
 await page.getByRole('button',{name:/Add variation/}).click();
 assert.equal(await page.locator('#variantForm').isVisible(),true);
 await page.locator('#variantName').fill('Fish');
 await page.locator('.variant-base-remove').first().check();
 await page.locator('#variantForm .tag-pick',{hasText:'Fish'}).click();
 await page.locator('#variantForm .tag-pick',{hasText:'Dairy-free'}).click();
 await page.getByRole('button',{name:/Add ingredient/}).click();
 const versionRow=page.locator('#variantIngredients .ingredient-row').first();
 await versionRow.locator('.search-picker input').fill('Salmon');
 await versionRow.locator('.ing-qty').fill('200');
 await page.locator('#variantCustomSteps').check();
 await page.locator('#variantSteps').fill('Sear the salmon until golden');
 await page.locator('#variantForm button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>db.meals[0].variants.length),1);
 assert.equal(await page.evaluate(()=>db.meals[0].ingredients.length),1,'Original recipe should be unchanged');
 assert.equal(await page.evaluate(()=>resolveRecipe(db.meals[0],db.meals[0].variants[0].id).ingredients.length),1);
 assert.equal(await page.evaluate(()=>resolveRecipe(db.meals[0],db.meals[0].variants[0].id).tags.includes('Dairy-free')),true);
 assert.match(await page.locator('#modbody .recipe-detail').innerText(),/Sear the salmon until golden/);
 assert.ok(await page.locator('.version-pill').count()>=2);
 assert.equal(await page.locator('#modbody .recipe-detail').getByText('Salmon',{exact:true}).count(),1);
 assert.equal(await page.locator('#modbody .recipe-detail').getByText('Milk',{exact:true}).count(),0);
 await page.locator('.version-pill',{hasText:'Original'}).click();
 assert.equal(await page.locator('#modbody .recipe-detail').getByText('Milk',{exact:true}).count(),1);
 assert.equal(await page.locator('#modbody .recipe-detail').getByText('Salmon',{exact:true}).count(),0);
 await page.locator('.version-pill',{hasText:'Fish'}).click();
 await page.getByRole('button',{name:/Cooking mode/}).click();
 assert.match(await page.locator('#cookOverlay').innerText(),/Sear the salmon/);
 await page.getByRole('button',{name:/Exit/}).click();
 await page.locator('#modalback .x').click();

 // Planner selection persists version, and ingredient roll-up is derived from that version.
 const planned=await page.evaluate(()=>{
   const day=dateKey(weekDays()[0]),id=db.meals[0].id;
   return {day,id,variantId:db.meals[0].variants[0].id};
 });
 await page.locator('#mobileNav button[data-mobile-view="plan"]').click();
 await page.evaluate(({day})=>editPlanSlot(day,'Lunch'),planned);
 await page.locator('#planForm .search-picker input').fill('Strawberry smoothie');
 await page.locator('#planVariantSelect + .styled-select .styled-select-trigger').click();
 await page.locator('#planVariantSelect + .styled-select .styled-select-option',{hasText:'Fish'}).click();
 await page.locator('#planForm button[type="submit"],#planForm button.btn.green').first().click();
 assert.equal(await page.evaluate(({day})=>db.plan[day].Lunch.variantId,planned),planned.variantId);
 const agg=await page.evaluate(()=>Object.values(aggregatePlan()).map(x=>({name:ingById(x.ingredientId)?.name,qty:x.qty,unit:x.unit})));
 assert.ok(agg.some(x=>x.name==='Salmon'&&x.qty===200),'Fish must be included in planned ingredients');
 assert.ok(!agg.some(x=>x.name==='Milk'),'Excluded Milk must not appear in planned ingredients');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(({day})=>db.plan[day].Lunch.variantId,planned),planned.variantId,'Version choice should survive reload');
 await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
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



 // Home Care: editable multi-category essentials and safe deletion.
 await page.locator('#modeCare').click();
 assert.equal(await page.locator('#mobileNav button').count(),6,'Home Care has Home, Essentials, Cupboard, Restock, Budget and History');
 await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
 await page.waitForTimeout(650); // Let prior swipe ghost-click suppression finish.
 await page.getByRole('button',{name:/Manage categories/}).first().click();
 assert.equal(await page.getByRole('dialog',{name:/Home Care categories/}).isVisible(),true);
 await page.locator('#newCareCat').fill('Pet Care');
 await page.locator('#careCatCreateForm button[type="submit"]').click();
 assert.equal(await page.locator('.care-cat-edit-row[data-category="Pet Care"]').count(),1);
 await page.locator('.care-cat-edit-row[data-category="Pet Care"] input').fill('Pet supplies');
 await page.locator('.care-cat-edit-row[data-category="Pet Care"] button[data-action="rename"]').click();
 assert.equal(await page.locator('.care-cat-edit-row[data-category="Pet supplies"]').count(),1);
 await page.locator('#modalback .x').click();
 await page.getByRole('button',{name:/Add essential/}).click();
 await page.locator('#essentialForm input[name="name"]').fill('Grooming wipes');
 await page.locator('#essentialForm .care-cat-chip',{hasText:'Bathroom'}).click();
 await page.locator('#essentialForm .care-cat-chip',{hasText:'Pet supplies'}).click();
 await page.locator('#essentialForm button[type="submit"]').click();
 const extraId=await page.evaluate(()=>db.cleaningEssentials.find(x=>x.name==='Grooming wipes')?.id);
 assert.ok(extraId,'New essential stored');
 assert.deepEqual(await page.evaluate(id=>categoriesOf(db.cleaningEssentials.find(x=>x.id===id)),extraId),['Bathroom','Pet supplies']);
 assert.equal(await page.locator('.essential-main b',{hasText:'Grooming wipes'}).count(),2,'One essential appears under both groups');
 await page.evaluate(id=>trackEssential(id),extraId);
 assert.equal(await page.evaluate(id=>db.cleaningInventory.filter(x=>x.essentialId===id).length,extraId),1,'Multi-category essential creates only one stock record');
 await page.getByRole('button',{name:/Manage categories/}).first().click();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('.care-cat-edit-row[data-category="Pet supplies"] button[data-action="delete"]').click();
 assert.equal(await page.evaluate(()=>db.cleaningEssentials.some(x=>x.name==='Grooming wipes')),true,'Category deletion retains essentials');
 assert.deepEqual(await page.evaluate(id=>categoriesOf(db.cleaningEssentials.find(x=>x.id===id)),extraId),['Bathroom']);
 await page.locator('#modalback .x').click();

 // Supply cupboard keeps category assignments and auto-generates a restock entry.
 await page.locator('#mobileNav button[data-mobile-view="kitchen"]').click();
 await page.locator('.supply-row',{hasText:'Grooming wipes'}).getByRole('button',{name:'Update'}).click();
 assert.ok(await page.locator('#cleanForm .care-cat-chip',{hasText:'Bathroom'}).locator('input').isChecked());
 await page.locator('#cleanForm input[name="qty"]').fill('1');
 await page.locator('#cleanForm button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>db.cleaningShopping.filter(x=>x.name==='Grooming wipes'&&!x.checked).length),1);
 await page.locator('#mobileNav button[data-mobile-view="shop"]').click();
 const restock=page.locator('.care-restock-line',{hasText:'Grooming wipes'}).first();
 await restock.locator('input.check').check();
 assert.equal(await page.evaluate(()=>db.cleaningShopping.find(x=>x.name==='Grooming wipes')?.checked),true);
 assert.ok(await page.evaluate(()=>Date.parse(db.cleaningShopping.find(x=>x.name==='Grooming wipes')?.checkedAt)>0),'Timestamp set when purchased');
 assert.equal(await page.evaluate(id=>db.cleaningInventory.find(x=>x.essentialId===id).qty,extraId),2);
 await page.locator('.care-restock-line',{hasText:'Grooming wipes'}).first().locator('input.check').uncheck();
 assert.equal(await page.evaluate(id=>db.cleaningInventory.find(x=>x.essentialId===id).qty,extraId),1,'Unchecking reverses credited stock');
 await page.locator('.care-restock-line',{hasText:'Grooming wipes'}).first().locator('input.check').check();

 // Save a real-world trip, which must persist after purchased items expire.
 await page.getByRole('button',{name:/Log shopping trip/}).click();
 await page.locator('#careTripStore').fill('Leroy Merlin');
 await page.locator('#careTripForm input[name="total"]').fill('32.50');
 assert.match(await page.locator('#careTripForm textarea[name="items"]').inputValue(),/Grooming wipes/);
 await page.locator('#careTripForm textarea[name="notes"]').fill('Home Care shopping');
 await page.locator('#careTripForm button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>db.cleaningHistory.length),1);
 assert.equal(await page.evaluate(()=>db.history.length),0,'Home Care trips stay separate from Kitchen history');
 assert.equal(await page.evaluate(()=>cloudPayload().cleaningHistory.length),1,'Home Care trips included in cloud sync');
 const expired=await page.evaluate(()=>{
  const item=db.cleaningShopping.find(x=>x.name==='Grooming wipes');
  item.checkedAt=new Date(Date.now()-CARE_RESTOCK_EXPIRE_MS-60*1000).toISOString();
  save();return purgeExpiredCareRestock();
 });
 assert.equal(expired,1,'Restock removes checked item after two hours');
 assert.equal(await page.evaluate(()=>db.cleaningHistory.length),1,'Expiry does not delete shopping history');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#modeCare').click();
 assert.equal(await page.evaluate(()=>db.cleaningShopping.find(x=>x.name==='Grooming wipes')),undefined,'Expired item stays removed after reload');
 await page.locator('#mobileNav button[data-mobile-view="budget"]').click();
 assert.match(await page.locator('#main').innerText(),/Leroy Merlin/);
 assert.equal(await page.evaluate(()=>careMonthSpent()),32.5);
 await page.locator('.care-budget-toolbar input[type="number"]').fill('100');
 await page.locator('.care-budget-toolbar input[type="number"]').dispatchEvent('change');
 assert.equal(await page.evaluate(()=>careMonthBudget()),100);
 await page.locator('#mobileNav button[data-mobile-view="history"]').click();
 assert.equal(await page.locator('.care-trip-card').count(),1);
 await page.getByRole('button',{name:/Log shopping trip/}).click();
 await page.locator('#careTripStore').fill('Carrefour');
 await page.locator('#careTripForm input[name="total"]').fill('9.99');
 await page.locator('#careTripForm textarea[name="items"]').fill('Kitchen towels');
 await page.locator('#careTripForm button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>Number(careMonthSpent().toFixed(2))),42.49,'Multiple stores sum correctly');
 await page.locator('.care-trip-card',{hasText:'Leroy Merlin'}).getByRole('button',{name:'Edit trip'}).click();
 await page.locator('#careTripStore').fill('IKEA');
 await page.locator('#careTripForm input[name="total"]').fill('35');
 await page.locator('#careTripForm button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>Number(careMonthSpent().toFixed(2))),44.99,'Editing adjusts budget');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('.care-trip-card',{hasText:'Carrefour'}).getByRole('button',{name:'Delete'}).click();
 assert.equal(await page.evaluate(()=>db.cleaningHistory.length),1);
 assert.equal(await page.evaluate(()=>careMonthSpent()),35);
 await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
 assert.equal(await page.locator('.essential-main b',{hasText:'Grooming wipes'}).count(),1);

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
 await testCloudRefreshGuards(browser,origin);
 await testCookingPantryAndLayout(browser,origin);
 assert.deepEqual(errors,[],'Browser JavaScript exceptions');
 console.log('PASS: Home Care multi-categories, timed restock removal, separate spending history/budget, icons and existing features');
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
  await page.evaluate(()=>{syncNow('manual')});
  await dialog.waitFor({timeout:15000});
  await dialog.getByRole('button',{name:/Use cloud data/}).click();
  await page.waitForFunction(()=>db.meals.some(m=>m.id==='remote1')&&!db.meals.some(m=>m.id==='local2'),{timeout:15000});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(RECOVERY_KEY)).payload.meals.some(x=>x.id==='local2')),true,'Recovery snapshot must preserve the local version');
  assert.deepEqual(faults,[],'No JavaScript exceptions in cloud sync');
  console.log('PASS: mocked cloud sync with optimistic updates, conflict cancel and recovery snapshot');
 }finally{await page.close()}
}


async function testCloudRefreshGuards(browser,origin){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const faults=[];
 page.on('pageerror',e=>faults.push(String(e)));
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.abort());
 await page.addInitScript(()=>{
  const user={id:'00000000-0000-4000-8000-000000000002',email:'refresh@example.com'};
  const copy=value=>JSON.parse(JSON.stringify(value));
  const state={
   get row(){try{return JSON.parse(localStorage.getItem('__refreshMockRemote')||'null')}catch(e){return null}},
   set row(value){localStorage.setItem('__refreshMockRemote',JSON.stringify(value))}
  };
  window.__refreshCloud=state;
  window.__syncReads=0;
  window.supabase={createClient(){
   return {
    auth:{
     getSession:async()=>({data:{session:{user}},error:null}),
     onAuthStateChange(callback){
      setTimeout(()=>{
       callback('INITIAL_SESSION',{user});
       callback('SIGNED_IN',{user});
       callback('TOKEN_REFRESHED',{user});
      },5);
      return {data:{subscription:{unsubscribe(){}}}};
     }
    },
    from(){
     let operation=null,write=null,filters={};
     const builder={
      select(){return builder},
      eq(k,v){filters[k]=v;return builder},
      is(k,v){filters[k]=v;return builder},
      update(value){operation='update';write=value;return builder},
      insert(value){operation='insert';write=value;return builder},
      async maybeSingle(){window.__syncReads++;return {data:state.row?copy(state.row):null,error:null}},
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
   }
  }};
 });
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudStatusLabel')?.textContent.includes('Cloud synced'));
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__syncReads),1,'Initial auth callback and getSession must not double-sync');
  assert.ok(await page.evaluate(()=>readCloudBaseline('00000000-0000-4000-8000-000000000002')),'Successful cloud baseline is stored per account');
  assert.equal(await page.getByRole('dialog',{name:/Choose which data to keep/}).isVisible(),false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudStatusLabel')?.textContent.includes('Cloud synced'));
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__syncReads),1,'Refresh must only start one cloud read');
  assert.equal(await page.getByRole('dialog',{name:/Choose which data to keep/}).isVisible(),false,'Identical saved data must never prompt on refresh');
  // Two installations may generate different random IDs for the same built-in
  // ingredient and essential records. This is not a real data conflict.
  const sameDataDifferentIds=await page.evaluate(()=>{
   const remote=window.__refreshCloud.row;
   const replacements=new Map();
   for(const item of [...remote.payload.ingredients.filter(x=>!x.custom),...remote.payload.cleaningEssentials]){
    const replacement='remote-default-'+item.id;
    replacements.set(item.id,replacement);
    item.id=replacement;
   }
   const rewrite=x=>{
    if(Array.isArray(x))return x.map(rewrite);
    if(x&&typeof x==='object'){for(const k of Object.keys(x))x[k]=rewrite(x[k]);return x}
    return typeof x==='string'&&replacements.has(x)?replacements.get(x):x;
   };
   rewrite(remote.payload);
   window.__refreshCloud.row=remote;
   return comparableCloudText(remote.payload)===comparableCloudText(cloudPayload());
  });
  assert.equal(sameDataDifferentIds,true,'Random built-in IDs must compare as equivalent');
  const identicalIds=await page.evaluate(()=>Promise.race([syncNow('manual'),new Promise(r=>setTimeout(()=>r('stalled'),1200))]));
  assert.equal(identicalIds,true,'Different default IDs sync without a popup');
  assert.equal(await page.getByRole('dialog',{name:/Choose which data to keep/}).isVisible(),false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudStatusLabel')?.textContent.includes('Cloud synced'));
  assert.equal(await page.getByRole('dialog',{name:/Choose which data to keep/}).isVisible(),false,'Random built-in IDs remain silent on refresh');
  // Updated-at changes are not content changes. Likewise old category schema is equivalent.
  await page.evaluate(()=>{
   let row=window.__refreshCloud.row;
   row.updated_at=new Date(Date.now()+120000).toISOString();
   delete row.payload.cleaningHistory;
   delete row.payload.settings.careCategories;
   delete row.payload.settings.careBudget;
   delete row.payload.settings.careMonthlyBudgets;
   for(const item of row.payload.cleaningEssentials)delete item.categories;
   window.__refreshCloud.row=row;
  });
  const equal=await page.evaluate(()=>Promise.race([syncNow('manual'),new Promise(r=>setTimeout(()=>r('stalled'),1200))]));
  assert.equal(equal,true,'Legacy defaults and timestamp-only changes must compare equal');
  assert.equal(await page.getByRole('dialog',{name:/Choose which data to keep/}).isVisible(),false);
  // Device-only edit should upload without any choice.
  await page.evaluate(()=>{
   db.meals.push({id:'local-only',name:'Local recipe',category:['Dinner'],ingredients:[],steps:[],servings:2});
   save();
  });
  await page.waitForFunction(()=>window.__refreshCloud.row?.payload.meals?.some(m=>m.id==='local-only'));
  assert.equal(await page.getByRole('dialog',{name:/Choose which data to keep/}).isVisible(),false);
  // Cloud-only edit should download automatically with local recovery snapshot.
  await page.evaluate(()=>{
   const row=window.__refreshCloud.row;
   row.payload.meals.push({id:'cloud-only',name:'Cloud recipe',category:['Dinner'],ingredients:[],steps:[],servings:2});
   row.updated_at=new Date(Date.now()+180000).toISOString();
   window.__refreshCloud.row=row;
  });
  const remoteOnly=await page.evaluate(()=>Promise.race([syncNow('manual'),new Promise(r=>setTimeout(()=>r('stalled'),1200))]));
  assert.equal(remoteOnly,true,'Remote-only changes download automatically');
  assert.equal(await page.evaluate(()=>db.meals.some(m=>m.id==='cloud-only')),true);
  assert.equal(await page.getByRole('dialog',{name:/Choose which data to keep/}).isVisible(),false);
  // Two actual concurrent edits should show one choice, not two.
  await page.evaluate(()=>{
   const row=window.__refreshCloud.row;
   row.payload.meals.push({id:'cloud-conflict',name:'Cloud conflict',category:['Dinner'],ingredients:[],steps:[],servings:2});
   row.updated_at=new Date(Date.now()+240000).toISOString();
   window.__refreshCloud.row=row;
   db.meals.push({id:'device-conflict',name:'Device conflict',category:['Dinner'],ingredients:[],steps:[],servings:2});
   save();
  });
  const conflict=page.getByRole('dialog',{name:/Choose which data to keep/});
  await conflict.waitFor({timeout:10000});
  assert.equal(await page.locator('#modtitle').innerText(),'Choose which data to keep');
  await conflict.getByRole('button',{name:/Not now/}).click();
  await page.waitForTimeout(1250);
  assert.equal(await conflict.isVisible(),false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(700);
  assert.equal(await conflict.isVisible(),false,'A dismissed, unchanged conflict must stay dismissed after refresh');
  assert.match(await page.locator('#cloudStatusLabel').innerText(),/pending/i);
  // User-directed Sync now must let them resolve the same conflict.
  await page.evaluate(()=>{void syncNow('manual')});
  await conflict.waitFor({timeout:10000});
  await conflict.getByRole('button',{name:/Use cloud data/}).click();
  await page.waitForFunction(()=>db.meals.some(m=>m.id==='cloud-conflict')&&!db.meals.some(m=>m.id==='device-conflict'));
  assert.equal(await page.evaluate(()=>Boolean(readCloudBaseline('00000000-0000-4000-8000-000000000002'))),true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudStatusLabel')?.textContent.includes('Cloud synced'));
  assert.equal(await conflict.isVisible(),false,'After resolving a conflict, refresh must stay silent');
  assert.deepEqual(faults,[],'No browser exceptions during auth events and refresh conflicts');
  console.log('PASS: identical refresh, auth-event dedupe, normalized comparison, unilateral changes and one-time true conflicts');
 }finally{await page.close()}
}


async function testCookingPantryAndLayout(browser,origin){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const faults=[];
 page.on('pageerror',e=>faults.push(String(e)));
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.abort());
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#mobileNav');
  // Create a predictable recipe, a version, pantry batches and out-of-week plans.
  const ids=await page.evaluate(()=>{
   const milk=db.ingredients.find(x=>x.name==='Milk'),cheese=db.ingredients.find(x=>x.name==='Cheese'),salmon=db.ingredients.find(x=>x.name==='Salmon');
   const day=dateKey(weekDays()[0]),oldDate=new Date(weekDays()[0]);
   oldDate.setDate(oldDate.getDate()-14);
   const oldDay=dateKey(oldDate);
   db.meals=[{id:'cook-test-recipe',name:'Creamy pasta',category:['Dinner'],servings:2,ingredients:[{ingredientId:milk.id,qty:1000,unit:'ml'},{ingredientId:cheese.id,qty:500,unit:'g'}],steps:['Cook pasta'],variants:[{id:'fish-test',name:'Salmon variation',removeIds:[cheese.id],ingredientChanges:[{ingredientId:salmon.id,qty:200,unit:'g'}],tags:['Fish']}]}];
   db.inventory=[
    {id:'stock-milk',ingredientId:milk.id,name:milk.name,qty:1.5,unit:'l',category:milk.category,expiry:'2026-11-12'},
    {id:'stock-cheese',ingredientId:cheese.id,name:cheese.name,qty:750,unit:'g',category:cheese.category},
    {id:'stock-salmon',ingredientId:salmon.id,name:salmon.name,qty:100,unit:'g',category:salmon.category}
   ];
   db.plan={[day]:{Dinner:{mealId:'cook-test-recipe',servings:2}},[oldDay]:{Breakfast:{mealId:'cook-test-recipe',servings:2},Lunch:{mealId:'cook-test-recipe',servings:2},Dinner:{mealId:'cook-test-recipe',servings:2}}};
   save();render();
   return {day,oldDay,milk:milk.id,cheese:cheese.id,salmon:salmon.id};
  });
  assert.equal(await page.evaluate(()=>allPlanned().length),4,'Historical plans are still stored');
  assert.equal(await page.evaluate(()=>plannedThisWeek().length),1,'Only current-week meal slots are counted');
  assert.equal(await page.evaluate(()=>Object.values(aggregatePlan()).length),2,'Old weeks excluded from shopping rollup');
  await page.locator('#mobileNav button[data-mobile-view="home"]').click();
  assert.equal(await page.locator('.stat',{hasText:'Planned this week'}).locator('strong').innerText(),'1');
  const inspire=page.locator('.dinner-inspiration-card');
  assert.equal(await inspire.count(),1);
  const heading=await inspire.locator('h2').boundingBox(),cta=await inspire.locator('.inspiration-action').boundingBox();
  assert.ok(cta.y>=heading.y+heading.height-1,'Dinner inspiration CTA should stack beneath heading on mobile');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'Home has no horizontal overflow');

  await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
  assert.equal(await page.locator('#mealGrid .meal-card').count(),1);
  const duplicate=page.locator('.duplicate-icon-button');
  assert.equal(await duplicate.innerText(),'⧉','Duplicate control uses the icon only');
  assert.match(await duplicate.getAttribute('aria-label'),/Duplicate recipe/);
  const card=await page.locator('#mealGrid .meal-card').boundingBox();
  assert.ok(card.width>300,'Recipes use roomy single column on narrow devices');
  await page.locator('.meal-card h3').click();
  await page.getByRole('button',{name:/I cooked this/}).click();
  assert.equal(await page.locator('#cookedMealForm').isVisible(),true,'Unplanned recipe cook confirmation exists');
  assert.match(await page.locator('#cookUsagePreview').innerText(),/Milk/);
  await page.locator('#cookedMealForm button[type="button"]',{hasText:'Cancel'}).click();

  // Planned meal marks done once and deducts inventory with unit conversions.
  await page.locator('#mobileNav button[data-mobile-view="plan"]').click();
  const slot=page.locator('.slot[data-occasion="Dinner"]').first();
  await slot.getByRole('button',{name:/Cooked it/}).click();
  assert.equal(await page.locator('#cookedServings').inputValue(),'2');
  assert.match(await page.locator('#cookUsagePreview').innerText(),/1 L/);
  await page.locator('#cookedMealForm button[type="submit"]').click();
  assert.equal(await page.locator('#modtitle').innerText(),'Meal cooked ✓');
  await page.getByRole('button',{name:'Done'}).click();
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-milk').qty),0.5);
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-cheese').qty),250);
  assert.equal(await page.evaluate(()=>db.cookingHistory.length),1,'Cooking log retains the event');
  assert.equal(await page.evaluate(({day})=>Boolean(db.plan[day].Dinner.cookedAt),ids),true);
  assert.equal(await page.evaluate(({day})=>recordCookedMeal('cook-test-recipe','',2,day,'Dinner'),ids),null,'Planned meal cannot deduct twice');
  assert.equal(await page.evaluate(()=>Object.keys(aggregatePlan()).length),0,'Cooked planned meals are excluded from future shopping rollup');
  assert.match(await slot.innerText(),/Cooked/);

  // +/- pantry updates are immediate and saved, with no negative quantities.
  await page.locator('#mobileNav button[data-mobile-view="kitchen"]').click();
  const milkRow=page.locator('#inventoryList .listline',{hasText:'Milk'}).first();
  await milkRow.getByRole('button',{name:/Increase Milk/}).click();
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-milk').qty),0.6);
  await milkRow.getByRole('button',{name:/Decrease Milk/}).click();
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-milk').qty),0.5);
  assert.equal(await page.evaluate(()=>{db.inventory.find(x=>x.id==='stock-milk').qty=0;save();return adjustPantryQuantity('stock-milk',-1)}),false);
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-milk').qty),0);

  // Unplanned variant: inherit milk, omit cheese, consume available salmon only.
  await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
  await page.locator('.meal-card h3').click();
  await page.locator('.version-pill',{hasText:'Salmon variation'}).click();
  await page.getByRole('button',{name:/I cooked this/}).click();
  assert.match(await page.locator('#cookUsagePreview').innerText(),/Short by/);
  await page.locator('#cookedMealForm button[type="submit"]').click();
  await page.getByRole('button',{name:'Done'}).click();
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-milk').qty),0);
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-salmon').qty),0);
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-cheese').qty),250,'Unplanned fish variation does not deduct excluded cheese');
  assert.equal(await page.evaluate(()=>db.cookingHistory.length),2);
  assert.equal(await page.evaluate(()=>cloudPayload().cookingHistory.length),2,'Cooked history participates in cloud sync');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>db.cookingHistory.length),2,'Cooking history persists on refresh');
  assert.equal(await page.evaluate(()=>db.inventory.find(x=>x.id==='stock-cheese').qty),250);

  // Home Care category chooser stays scrollable with many categories.
  await page.locator('#modeCare').click();
  await page.locator('#mobileNav button[data-mobile-view="meals"]').click();
  await page.evaluate(()=>{for(let i=0;i<28;i++)db.settings.careCategories.push('Extra category '+i);save()});
  await page.getByRole('button',{name:/Add essential/}).click();
  const catBox=page.locator('#essentialForm .care-cat-choices');
  assert.equal(await catBox.evaluate(el=>el.scrollHeight>el.clientHeight),true,'Category chooser scrolls instead of expanding indefinitely');
  assert.equal(await catBox.evaluate(el=>getComputedStyle(el).overflowY),'auto');
  assert.deepEqual(faults,[],'No browser JS exceptions');
  console.log('PASS: weekly slot count, responsive cards, cooked planned/unplanned meals, version deductions, pantry steppers, scrollable categories');
 }finally{await page.close()}
}
