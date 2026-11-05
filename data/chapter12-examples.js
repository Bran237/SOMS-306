// Optional worked textbook examples from the supplied Chapter 12 screenshots.
// These are not an assigned homework list. Statements are organized for study;
// links retain the original wording, tables, diagrams, and printed solutions.
const sourceLink = n => `<a href="./assets/ch12/source-${String(n).padStart(2,'0')}.png" target="_blank" rel="noopener">Source ${n}</a>`;
const table = (heads,rows) => `<div class="scroll"><table><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const part = (l,ask,f,rows,ans,note='') => ({l,ask,f,rows,ans,...(note?{note}:{})});
const example = (n,title,q,given,parts,sources) => ({
 id:`ch12-example-${String(n).padStart(2,'0')}`,title:`Example ${n}: ${title}`,tag:'Optional textbook example',
 q:`<p>${q}</p><p class="hint">Organized from textbook Example ${n}. Original screenshots: ${sources.map(sourceLink).join(' · ')}.</p>`,
 given,parts,sourcePages:sources,
});
export const CH12_EXAMPLES = [
 example(1,'Determining A, B, and C designations',
  'Classify the 10 inventory items using annual dollar usage. The source table labels annual demand and dollar value in hundreds (00). Rank the values before choosing classes.' + table(['Item','Annual demand (00)','Unit cost','Annual dollar value (00)'],[[1,25,'$360','9,000'],[2,10,'$70','700'],[3,24,'$500','12,000'],[4,15,'$100','1,500'],[5,7,'$70','490'],[6,10,'$1,000','10,000'],[7,2,'$210','420'],[8,10,'$4,000','40,000'],[9,80,'$10','800'],[10,5,'$200','1,000']]),
  'Annual dollar-value total = 75,910 in the source table’s units.',[
   part('a','Rank and classify the items','Annual dollar usage = annual demand × unit price',[
    ['Descending item order','8, 3, 6, 1, 4, 10, 9, 2, 5, 7'],['Class A: item 8','10% of items; 40,000 / 75,910 ≈ 52.7% of annual value'],['Class B: items 3, 6, 1','30% of items; 31,000 / 75,910 ≈ 40.8% of annual value'],['Class C: items 4, 10, 9, 2, 5, 7','60% of items; 4,910 / 75,910 ≈ 6.5% of annual value'],
   ],['Classification','A: 8; B: 3, 6, 1; C: 4, 10, 9, 2, 5, 7'],'These are the source example’s cutoffs. General textbook percentages are guides, not mandatory quotas.'),
  ],[11,12]),
 example(2,'Computing and using the EOQ',
  'A tire distributor expects annual sales of 9,600 tires. Holding cost is $16 per tire per year, ordering cost is $75, and the firm operates 288 days a year. Find EOQ, orders per year, cycle time, and annual holding plus ordering cost.',
  'D = 9,600/year; H = $16/unit/year; S = $75/order; 288 workdays/year.',[
   part('a','Economic order quantity','Q* = √(2DS/H)',[['Substitute','√(2 × 9,600 × 75 / 16) = √90,000']],['EOQ','300 tires']),
   part('b','Orders per year','D/Q',[['Divide annual demand by order size','9,600 / 300 = 32']],['Frequency','32 orders per year']),
   part('c','Order cycle in workdays','(Q/D) × workdays/year',[['Convert the fraction of a year','(300/9,600) × 288 = 9']],['Cycle','9 workdays']),
   part('d','Annual holding and ordering cost','TC = (Q/2)H + (D/Q)S',[['Holding','(300/2) × $16 = $2,400'],['Ordering','(9,600/300) × $75 = $2,400'],['Add','$2,400 + $2,400 = $4,800']],['Annual relevant cost','$4,800']),
  ],[17,18]),
 example(3,'EOQ when holding cost is a percentage',
  'Piddling Manufacturing purchases 3,600 security cameras a year at $180 each. Ordering cost is $50 and annual holding cost is 20% of price. Find the economical quantity and annual holding plus ordering cost.',
  'D = 3,600/year; P = $180; S = $50; H = 0.20P.',[
   part('a','Convert H and compute EOQ','H = iP; Q* = √(2DS/H)',[['Holding cost per camera','0.20 × $180 = $36/year'],['EOQ','√(2 × 3,600 × 50 / 36) = 100']],['EOQ','100 cameras']),
   part('b','Annual relevant cost','TC = (Q/2)H + (D/Q)S',[['Holding','50 × $36 = $1,800'],['Ordering','36 × $50 = $1,800']],['Annual relevant cost','$3,600']),
  ],[18]),
 example(4,'Computing the production lot quantity',
  'A toy manufacturer needs 48,000 wheels annually, produces 800 wheels per day, operates 240 days a year, and incurs holding cost $1 per wheel per year and setup cost $45. Find the economical run, annual cost, cycle time, and production run time.',
  'D = 48,000/year; p = 800/day; u = 48,000/240 = 200/day; H = $1; S = $45.',[
   part('a','Optimal run size','Qp = √[(2DS/H) × p/(p − u)]',[['Substitute','√[(2 × 48,000 × 45 / 1) × 800/600] = 2,400']],['Run size','2,400 wheels']),
   part('b','Maximum stock and annual cost','Imax = Qp(1 − u/p); TC = (Imax/2)H + (D/Qp)S',[['Maximum inventory','2,400(1 − 200/800) = 1,800'],['Holding','900 × $1 = $900'],['Setup','(48,000/2,400) × $45 = $900']],['Annual relevant cost','$1,800']),
   part('c','Cycle time','Qp/u',[['Divide','2,400/200 = 12']],['Cycle','12 workdays']),
   part('d','Run time','Qp/p',[['Divide','2,400/800 = 3']],['Run time','3 workdays']),
  ],[20,21]),
 example(5,'Quantity discounts with constant holding cost',
  'A hospital uses 816 cases of cleanser per year. Ordering costs are $12 and holding costs are $4 per case per year. Prices are $20 for 1–49 cases, $18 for 50–79, $17 for 80–99, and $16 for 100 or more. Find the best order quantity and total annual cost.',
  'D = 816/year; S = $12; H = $4 independent of unit price.',[
   part('a','Find and compare feasible candidates','Q* = √(2DS/H); TC = (Q/2)H + (D/Q)S + PD',[['Common EOQ','√(2 × 816 × 12 / 4) ≈ 69.97 → 70 cases at $18'],['70 cases at $18','140 + 139.89 + 14,688 ≈ $14,968/year'],['80 cases at $17','160 + 122.40 + 13,872 ≈ $14,154/year'],['100 cases at $16','200 + 97.92 + 13,056 ≈ $13,354/year']],['Best choice','100 cases per order; approximately $13,354 per year'],'Costs above are rounded to the nearest dollar as in the source. Purchase cost must be included.'),
  ],[23,24]),
 example(6,'Quantity discounts with holding proportional to price',
  'Surge Electric needs 4,000 switches per year. Prices are $0.90 for 1–499, $0.85 for 500–999, and $0.80 for 1,000 or more. An order costs $30, and annual carrying cost is 40% of price. Find the minimum-cost order.',
  'D = 4,000/year; S = $30; H = 0.40P.',[
   part('a','Find a feasible EOQ and compare lower-price breaks','Q* = √(2DS/H); TC = (Q/2)H + (D/Q)S + PD',[['At P = $0.80, H = $0.32','EOQ ≈ 866; infeasible for a price requiring at least 1,000'],['At P = $0.85, H = $0.34','EOQ ≈ 840; feasible in 500–999'],['Q = 840 at $0.85','142.80 + 142.86 + 3,400 ≈ $3,686/year'],['Q = 1,000 at $0.80','160 + 120 + 3,200 = $3,480/year']],['Best choice','1,000 switches; $3,480 per year']),
  ],[24,25]),
 example(7,'ROP with constant usage and lead time',
  'Tingly takes two vitamins a day. Delivery occurs three days after an order. At what remaining quantity should he reorder?',
  'd = 2 tablets/day; LT = 3 days.',[
   part('a','Reorder point','ROP = d × LT',[['Multiply usage by lead time','2 × 3 = 6']],['Reorder when','6 tablets remain']),
  ],[26]),
 example(8,'ROP with known lead-time demand distribution',
  'Sand demand during lead time is normal with mean 50 tons and standard deviation 5 tons. The manager accepts no more than a 3% stockout risk. Find z, safety stock, and ROP.',
  'Mean lead-time demand = 50 tons; σdLT = 5 tons; service level = 0.97.',[
   part('a','Normal z value','P(Z ≤ z) = 0.97',[['Use the source normal table','z ≈ 1.88']],['z','1.88']),
   part('b','Safety stock','SS = zσdLT',[['Multiply','1.88 × 5 = 9.40']],['Safety stock','9.40 tons']),
   part('c','Reorder point','ROP = Mean lead-time demand + SS',[['Add','50 + 9.40 = 59.40']],['ROP','59.40 tons']),
  ],[28]),
 example(9,'ROP with variable demand',
  'A restaurant uses 50 jars of sauce per week on average, with weekly standard deviation 3 jars. Lead time is a constant two weeks and accepted stockout risk is 10%. Select the model, find z, and compute the ROP.',
  'd̄ = 50/week; σd = 3/week; LT = 2 weeks; service level = 0.90.',[
   part('a','Model and z','ROP = d̄LT + zσd√LT',[['Identify variability','Demand varies; lead time is constant'],['Table value for 90% service','z = 1.28']],['Model','Variable demand, constant lead time']),
   part('b','Reorder point','ROP = d̄LT + zσd√LT',[['Expected lead-time demand','50 × 2 = 100 jars'],['Safety stock','1.28 × 3 × √2 ≈ 5.43 jars'],['Round up discrete inventory','100 + 5.43 = 105.43 → 106']],['ROP','106 jars']),
  ],[29]),
 example(10,'Order quantity for fixed-interval review',
  'Find the order size with daily demand 30 units, daily standard deviation 3 units, review interval seven days, lead time two days, 71 units on hand, and desired service level 99%.',
  'd̄ = 30/day; σd = 3/day; OI = 7; LT = 2; A = 71; z = 2.33.',[
   part('a','Amount to order','Q = d̄(OI + LT) + zσd√(OI + LT) − A',[['Protection period','7 + 2 = 9 days'],['Expected demand','30 × 9 = 270 units'],['Safety stock','2.33 × 3 × √9 = 20.97 units'],['Subtract stock on hand','270 + 20.97 − 71 = 219.97']],['Order','220 units']),
  ],[32]),
 example(11,'Stockout risk for fixed-interval review',
  'Given lead time four days, order interval 12 days, daily mean demand 10 units, daily standard deviation two units, stock on hand 43, and order quantity 171, determine risk at the end of the initial lead time and at the end of the longer protection interval.',
  'LT = 4; OI = 12; d̄ = 10/day; σd = 2/day; A = 43; Q = 171.',[
   part('a','Initial lead-time risk','43 = 10(4) + z(2)√4',[['Solve','z = (43 − 40)/4 = 0.75'],['Use normal cumulative probability','Φ(0.75) = 0.7734'],['Take the complement','1 − 0.7734 = 0.2266']],['Initial risk','22.66%']),
   part('b','Protection-interval risk','171 = 10(4 + 12) + z(2)√(4 + 12) − 43',[['Simplify','171 = 160 + 8z − 43'],['Solve the displayed equation','z = (171 − 117)/8 = 6.75'],['Normal upper-tail probability','1 − Φ(6.75) is approximately zero at table precision']],['Later risk','Negligible (z = 6.75)'],'Source arithmetic discrepancy: the screenshot prints z = 16.75. The displayed inputs yield 6.75. The original screenshot remains unchanged; both values imply negligible tail risk, not mathematically zero probability.'),
  ],[33]),
 example(12,'Single-period stocking with uniform demand',
  'Weekly cider demand is uniform from 300 to 500 liters. Cindy pays $0.80 per liter and sells it for $3.20; leftovers have no salvage value. Find the optimal stock and its stockout risk.',
  'Demand U(300,500); price $3.20; cost $0.80; salvage $0.',[
   part('a','Costs and critical ratio','Cs = Revenue − Cost; Ce = Cost − Salvage; SL = Cs/(Cs + Ce)',[['Shortage cost','$3.20 − $0.80 = $2.40/liter'],['Excess cost','$0.80 − $0 = $0.80/liter'],['Target probability','2.40/(2.40 + 0.80) = 0.75']],['Target service','75%']),
   part('b','Stocking level and risk','S* = a + SL(b − a)',[['Stocking level','300 + 0.75(500 − 300) = 450 liters'],['Risk','1 − 0.75 = 0.25']],['Optimum','450 liters; 25% stockout risk']),
  ],[35]),
 example(13,'Single-period stocking with normal demand',
  'Demand for an apple-cherry blend is normal with mean 200 liters per week and standard deviation 10 liters. Shortage cost is $2.40 per liter and excess cost $0.80. Find the optimal stock.',
  'Mean = 200; σ = 10; Cs = $2.40; Ce = $0.80.',[
   part('a','Target and stocking quantity','SL = Cs/(Cs + Ce); S* = Mean + zσ',[['Critical ratio','2.40/3.20 = 0.75'],['Use the source’s table rounding','z = 0.67'],['Stocking level','200 + 0.67 × 10 = 206.7']],['Source-rounded optimum','206.7 liters'],'Using the exact 75th normal percentile gives about 206.745 liters; the source uses the table-rounded z = 0.67.'),
  ],[35]),
 example(14,'Single-period stocking with discrete demand',
  'For hydraulic-press spares, shortage cost is $4,200 per unit, a spare costs $800, and salvage value is zero. Historical demand is 0, 1, 2, or 3 spares with probabilities 0.20, 0.40, 0.30, and 0.10. Find the stocking level.' + table(['Demand','Probability','Cumulative'],[[0,'.20','.20'],[1,'.40','.60'],[2,'.30','.90'],[3,'.10','1.00']]),
  'Cs = $4,200; Ce = $800; cumulative demand probabilities 0.20, 0.60, 0.90, 1.00.',[
   part('a','Choose a feasible stock level','SL = Cs/(Cs + Ce)',[['Target','4,200/(4,200 + 800) = 0.84'],['One spare','P(D ≤ 1) = 0.60 < 0.84'],['Two spares','P(D ≤ 2) = 0.90 ≥ 0.84']],['Stock','2 spares'],'The achieved service is 90%, exceeding the 84% target; do not interpolate to a fractional spare.'),
  ],[36]),
];

export const CH12_EXAMPLE_LINKS = {
 '12.7':[1], '12.8':[2,3], '12.9':[4], '12.10':[5,6], '12.11':[7,8,9], '12.12':[10,11], '12.13':[12,13,14],
};
