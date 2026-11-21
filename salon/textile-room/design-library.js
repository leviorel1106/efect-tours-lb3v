// Public names, pigments and geometry choices. Indices are stable saved-design IDs.
export const models={
  sofa:[
    ['שזלונג פשתן','#c8b9a2'],['ספה ישרה על רגליים','#86654d'],
    ['ספת קשת בגב עוטף','#c3ac98','arc-sofa'],['ספת במה בגב אגוז פתוח','#c4b49b','platform-sofa']],
  chairs:[
    ['כורסה מרופדת בבוקלה','#d2c4ae'],['כורסה עם משענות עץ','#484742'],
    ['כורסה עגולה על בסיס עץ','#b98a72','shell-chair'],['כורסה בגב חבל קלוע','#b4a78c','woven-chair']],
  table:[
    ['שולחן טרוורטין','#cbbb9d'],['שולחן עץ על רגליים','#b38e63'],['שולחן אבן אובלי מחורץ','#8d7962'],
    ['שולחן חלוק באבן ירקרקה','#646a5b','pebble-table'],['שולחן אגוז על שני לוחות','#815f49','trestle-table']],
  pendant:[['אהיל קלוע','#dbceac'],['אהיל נייר על צלעות דקות','#ecdcc1']],
  cabinetry:[['אלון בידית שקועה','#a58564','slab-wall'],['חזית מסגרת צבועה','#97a08d','frame-wall'],['אגוז בחריטה אנכית','#795c4b','flute-wall']],
  island:[['אי אבן בקצוות מפל','#c4b196','waterfall-island'],['אי נגרות על רגליים','#927257','bench-island'],['אי אובלי מחורץ','#91745a','oval-island']],
  countertop:[['אבן גיר בהירה','#c9bba5'],['בזלת מושחזת','#565b56'],['טרוורטין חום','#ae8d70']],
  stools:[['שרפרף אלון עם משענת','#bcab8d','timber-stool'],['שרפרף ציר על דיסק מתכת','#918571','disc-stool'],['כיסא בר עם גב מרופד','#9e886d','walnut-stool']],
  diningTable:[['שולחן הטיק המקורי','#b18c66'],['שולחן אבן על רגלי גביע','#b9ac96','stone-dining'],['שולחן רפפות עץ ומתכת','#8c765e','slat-dining']],
  diningChairs:[['כיסאות הטיק המקוריים','#cfbea3'],['כיסא אלומיניום בקווים דקים','#b4b8ad','flat-seat'],['כיסא אוכל בגב חבלים','#b7a27c','cord-seat']],
  loungers:[['מיטות השיזוף המקוריות','#d4c7ad'],['מיטות על מסגרת מזחלת','#c3bca6','sling-bed'],['מיטות במה עם כרית גליל','#b2a288','bolster-bed']],
  deck:[['טיק טבעי','#b79775'],['עץ מולבן','#c2b9a5'],['טיק מעושן','#907760']]
};
export const modelList=id=>models[['westChair','eastChair'].includes(id)?'chairs':id];
export const zones={
 salon:{name:'סלון',view:[-2.30,.90,1.6,3.75,1.07],items:['sofa','chairs','westChair','eastChair','table','pendant','throw','rug','walls','shelves','curtains','floor','beams'],
  schemes:[
    ['original','הסלון המקורי',{},{}],
    ['dunes','קו החול',{westChair:1,eastChair:1,table:2,pendant:1},{sofa:'#d5c7ae',westChair:'#777a5b',eastChair:'#777a5b',throw:'#a97e58',walls:'#e4dcd0',shelves:'#d5c9ba',rug:'#b8a489',beams:'#a98260'},1],
    ['arc','גלריה ים־תיכונית',{sofa:2,westChair:2,eastChair:3,table:3,pendant:1},{sofa:'#c5aa98',westChair:'#a57d61',eastChair:'#bbb09a',rug:'#bfae98',shelves:'#d1c2af'},1],
    ['atelier','בית מלאכה',{sofa:3,westChair:3,eastChair:3,table:4},{sofa:'#a1aa94',westChair:'#c5ae8c',eastChair:'#c5ae8c',beams:'#8c715c',rug:'#baaa91'}]
  ],sources:[['Archipelago House · Norm Architects','https://www.pinterest.com/normarchitects/archipelago-house/'],['Rico · Ferm Living','https://fermliving.co.uk/collections/rico-uk']]},
 kitchen:{name:'מטבח',view:[-6.93,.65,-8.63,4.98,1.07],items:['cabinetry','island','countertop','stools','kitchenWalls','kitchenFloor'],
  schemes:[['oak','אלון ואבן גיר',{},{}],['sage','מרווה ובזלת',{cabinetry:1,island:1,countertop:1,stools:1},{island:'#84907e',stools:'#ad8b6d',kitchenWalls:'#d9d7c9'}],['earth','אגוז וטרוורטין',{cabinetry:2,island:2,countertop:2,stools:2},{island:'#8a6c54',stools:'#a88a72',kitchenFloor:'#bfb19e'}]],
  sources:[['PROFILE · Reform × Norm Architects','https://www.pinterest.com/reformcph/profile-by-norm-architects/'],['Can Lis · Ferm Living','https://www.pinterest.com/fermliving/ferm-living-can-lis-collection/']]},
 terrace:{name:'חוץ',view:[-9.40,-6.80,-10.38,-3.27,.96],items:['diningTable','diningChairs','loungers','deck','outdoorKitchen'],
  schemes:[['teak','טיק על הים',{},{}],['mineral','אבן ואלומיניום',{diningTable:1,diningChairs:1,loungers:1,deck:1},{diningChairs:'#a9b3ab',loungers:'#c6c2a6',outdoorKitchen:'#b6b0a1'}],['garden','חבלים וטיק מעושן',{diningTable:2,diningChairs:2,loungers:2,deck:2},{loungers:'#a1a489',diningChairs:'#c3ab80',outdoorKitchen:'#998b74'}]],
  sources:[['FLAT · Mario Ruiz / GANDIABLASCO','https://www.pinterest.com/pin/561683384797135800/'],['FLAT · מבט לשולחן החוץ','https://www.pinterest.com/pin/561683384797154104/']]}
};
export const newItems={
 cabinetry:['חזיתות הארונות','#a58564'],island:['גוף האי','#c4b196'],countertop:['משטחי העבודה','#c9bba5'],stools:['כיסאות הבר','#bcab8d'],
 kitchenWalls:['קירות המטבח','#e5e0d4'],kitchenFloor:['רצפת המטבח','#d2c4ae'],
 diningTable:['שולחן האוכל בפרגולה','#b18c66'],diningChairs:['כיסאות האוכל בחוץ','#cfbea3'],loungers:['מיטות השיזוף על הדק','#d4c7ad'],
 deck:['לוחות הדק','#b79775'],outdoorKitchen:['מטבח החוץ','#bcab93']
};
export const detailsViews={
 cabinetry:[-8.28,5.91,-8.75,7.5,1.2],island:[-7.1,2.05,-8.65,4.25,.85],stools:[-6.84,3.16,-8.0,4.34,.68],
 countertop:[-9.88,5.7,-8.65,4.25,.89],diningTable:[-6.9,-4.78,-10.2,-3.3,.78],
 diningChairs:[-8.26,-5.57,-9.0,-4.1,.52],loungers:[-.43,-6.76,-2.98,-5.60,.34],
 outdoorKitchen:[-12.67,-1.56,-13.55,-3.3,.9],deck:[1.04,-5.75,2.4,-7.0,.05]
};
