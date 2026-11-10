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

 assert.deepEqual(errors,[],'Browser JavaScript exceptions');
 console.log('PASS: mobile navigation, planner, recipe editing, unit formatting, searches, backups, desktop layout');
}finally{
 await browser.close();
}
