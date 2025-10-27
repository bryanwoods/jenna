// Jenna Runtime Library
const print = (s) => { console.log(s); return s; };


const makeAdder = (x) => (y) => (x + y);
const add5 = makeAdder(5);
const result = add5(10);
const output = print("5 + 10 = 15");
const twice = (f, x) => f(f(x));
const addOne = (n) => (n + 1);
const result2 = twice(addOne, 5);
const output2 = print("twice(addOne, 5) = 7");