// Jenna Runtime Library
const print = (s) => { console.log(s); return s; };


const maybeResult = { __tag: "Some", _0: { __tag: "Ok", _0: 42 } };
const maybeError = { __tag: "Some", _0: { __tag: "Err", _0: "oops" } };
const nothing = { __tag: "None" };
const unwrapNested = (opt) => (() => { const __match_yhkhkch7p = opt; return (__match_yhkhkch7p.__tag === "Some" && __match_yhkhkch7p._0.__tag === "Ok" && true ? (() => { const value = __match_yhkhkch7p._0._0; return value; })() : (__match_yhkhkch7p.__tag === "Some" && __match_yhkhkch7p._0.__tag === "Err" && true ? (() => { const msg = __match_yhkhkch7p._0._0; return (-1); })() : 0)); })();
const val1 = unwrapNested(maybeResult);
const msg1 = print("unwrapNested(Some(Ok(42))) = 42");
const val2 = unwrapNested(maybeError);
const msg2 = print("unwrapNested(Some(Err(...))) = -1");
const val3 = unwrapNested(nothing);
const msg3 = print("unwrapNested(None) = 0");