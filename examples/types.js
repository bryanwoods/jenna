// Jenna Runtime Library
const print = (s) => { console.log(s); return s; };


const x = { __tag: "Some", _0: 42 };
const y = { __tag: "None" };
const result = { __tag: "Ok", _0: "success" };
const unwrap = (opt) => (() => { const __match_swbdtbwic = opt; return (__match_swbdtbwic.__tag === "Some" && true ? (() => { const value = __match_swbdtbwic._0; return value; })() : 0); })();
const value = unwrap(x);