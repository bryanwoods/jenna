// Jenna Runtime Library
const print = (s) => { console.log(s); return s; };


const testDiv = (x, n) => (x - ((x / n) * n));
const result1 = testDiv(7, 3);
const result2 = testDiv(15, 3);
const test1 = ((result1 == 1) ? print("testDiv(7, 3) = 1") : print("testDiv(7, 3) != 1"));
const test2 = ((result1 == 0) ? print("testDiv(7, 3) = 0") : print("testDiv(7, 3) != 0"));
const test3 = ((result2 == 0) ? print("testDiv(15, 3) = 0") : print("testDiv(15, 3) != 0"));