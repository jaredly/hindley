import { test, expect } from 'bun:test';
import { js, lex } from './lexer';
import { fromMap, fromRec, shape } from './nodes';
import { parser } from './js--';
import { compileStmt, sourcedToString } from './js--compile';

const inputs = [
    `one + two`,
    `new Awe`,
    `(one,two,three) => one + two`,
    `(one,two,three) => new Awe`,
    `let three = ok`,
    `() => {let x = 10}`,
    `let three = one + two`,
    `let what = (one,two,three) => one + two`,
];
inputs.forEach((source) => {
    test('parse ' + source, () => {
        const res = lex(js, source);
        const rec = fromMap(res.root, res.nodes, (l) => ({ id: '', idx: l }));
        const parsed = parser.parse(rec, undefined);
        expect(parsed.result).toBeTruthy();
    });
});

test('evall', () => {
    const res = lex(js, 'let x = (a,b) => {let y = 2\nreturn y * (a + b)}');
    const rec = fromMap(res.root, res.nodes, (l) => ({ id: '', idx: l }));
    const parsed = parser.parse(rec, undefined);
    expect(parsed.result).toBeTruthy();
    const sourced = compileStmt(parsed.result);
    expect(sourcedToString(sourced, 0, [])).toEqual(`let x = (a, b, ) => {
let y = 2;
return y * (a + b);
}`);
});
