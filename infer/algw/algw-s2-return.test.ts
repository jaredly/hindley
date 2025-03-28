import { test, expect } from 'bun:test';
import { js, lex } from '../../lang/lexer';
import { fromMap } from '../../lang/nodes';
import { parser } from '../../lang/algw-s2-return';
import { builtinEnv, inferExpr, inferStmt, resetState, Scheme, Tenv, tfns, typeToString } from './algw-s2-return';
import { Type } from './Type';

const tests: ([string, string] | [string, string, true])[] = [
    [`10`, `int`],
    [`{let x = 10; x}`, 'int'],
    [`(1, 2)`, '(int, int)'],
    [`{let (a, b) = (2, 3); a}`, 'int'],
    [`(x) => {let (a, b) = x; a}`, `((a, f)) => a`],
    [`{let id = (x) => x; (id(2), id(true))}`, `(int, bool)`],
    [`{let a = 2; let a = true; a}`, 'bool'],
    [`"hi"`, 'string'],
    [`(x) => {let (a, _) = x; a(2)}`, '(((int) => a, f)) => a'],
    [
        `(arr) => {
        if (arr.length <= 1) {
            return 10;
        }
        return 5;
    }`,
        '(Array(e)) => int',
    ],
    ['[1,2]', 'Array(int)'],
    [
        `(a) => {
        if (true) {
            return [a]
        } else {
            return [1]
         }
        }`,
        '(int) => Array(int)',
    ],
    [
        `{
            let quicksort = (arr) => {
                if (arr.length <= 1) {
                    return arr;
                }
                let pivot = arr[arr.length - 1];
                let leftArr = [];
                let rightArr = [];
                return [1,2];
            };
            quicksort
        }`,
        '(Array(int)) => Array(int)',
    ],
    // [
    //     `switch (true) {:
    //       true: 1
    //       false:3
    //     :}`,
    //     'int',
    // ],
    [`(arr) => arr.length`, '(Array(d)) => int'],
    [`(arr) => {return arr.length}`, '(Array(e)) => int'],
    [`(arr) => {let x = arr[arr.length - 1]; return arr}`, '(Array(h)) => Array(h)'],
    [`for (let i = 0;i < 5;i += 1) {i}`, 'void'],
    // [`(a) => {for (let i = 0;i < 5;i += 1) {return i}}`, 'int'],
    [`[...[], 10, ...[5]]`, 'Array(int)'],
    [`{let ok = [];ok.push(1);ok}`, 'Array(int)'],
    [`{let ok = [];if (true) {ok.push(1)};ok}`, 'Array(int)'],
    [`{let ok = [];for (ok;true;ok) {ok.push(1)};ok}`, 'Array(int)'],
    [`[].push(1)`, 'void'],
    [`(a) => {if (a) {return 1}}`, 'Incompatible concrete types: void vs int'],
    // ['0 += 1', 'int'],
];

const env = builtinEnv();

tests.forEach(([input, output, only]) => {
    (only ? test.only : test)(input, () => {
        const cst = lex(js, input);
        // console.log(JSON.stringify(cst, null, 2));
        const node = fromMap(cst.roots[0], cst.nodes, (idx) => idx);
        // console.log(JSON.stringify(node, null, 2));
        const parsed = parser.parse(node);
        if (!parsed.result) throw new Error(`not parsed ${input}`);
        Object.entries(parsed.ctx.meta).forEach(([id, meta]) => {
            if (meta.kind === 'unparsed') {
                throw new Error(`unparsed ${id}`);
            }
        });
        // console.log(parsed.result);
        resetState();
        // console.log(parsed.result);
        let found;
        try {
            const res = inferStmt(env, parsed.result).value;
            found = res ? typeToString(res) : '';
        } catch (err) {
            found = (err as Error).message;
        }
        expect(found).toEqual(output);
        // expect(parsed.result).toEqual('');
    });
});
