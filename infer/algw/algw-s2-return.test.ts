import { test, expect } from 'bun:test';
import { js, lex } from '../../lang/lexer';
import { fromMap } from '../../lang/nodes';
import { parser } from '../../lang/algw-s2-return';
import { builtinEnv, inferExpr, inferStmt, resetState, Scheme, Tenv, tfns, Type, typeToString } from './algw-s2-return';

const tests: ([string, string] | [string, string, true])[] = [
    [`10`, `int`],
    [`{let x = 10; x}`, 'int'],
    [`(1, 2)`, '(int, int)'],
    [`{let (a, b) = (2, 3); a}`, 'int'],
    [`(x) => {let (a, b) = x; a}`, `((b, c)) => b`],
    [`{let id = (x) => x; (id(2), id(true))}`, `(int, bool)`],
    [`{let a = 2; let a = true; a}`, 'bool'],
    [`"hi"`, 'string'],
    [`(x) => {let (a, _) = x; a(2)}`, '(((int) => f, c)) => f'],
    [
        `(arr) => {
        if (arr.length <= 1) {
            return 10;
        }
        return 5;
    }`,
        '(array(d)) => int',
    ],
    ['[1,2]', 'array(int)'],
    [
        `(a) => {
        if (true) {
            return [a]
        } else {
            return [1]
         }
        }`,
        '(int) => array(int)',
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
        '(array(int)) => array(int)',
    ],
    // [
    //     `switch (true) {:
    //       true: 1
    //       false:3
    //     :}`,
    //     'int',
    // ],
    [`(arr) => arr.length`, '(array(c)) => int'],
    [`(arr) => {return arr.length}`, '(array(c)) => int'],
    [`(arr) => {let x = arr[arr.length - 1]; return arr}`, '(array(g)) => array(g)'],
    [`for (let i = 0;i < 5;i += 1) {return i}`, 'void'],
    // [`(a) => {for (let i = 0;i < 5;i += 1) {return i}}`, 'int'],
    [`[...[], 10, ...[5]]`, 'array(int)'],
    [`{let ok = [];ok.push(1);ok}`, 'array(int)'],
    [`{let ok = [];if (true) {ok.push(1)};ok}`, 'array(int)'],
    [`{let ok = [];for (ok;true;ok) {ok.push(1)};ok}`, 'array(int)'],
    [`[].push(1)`, 'void'],
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
        const res = inferStmt(env, parsed.result);
        expect(res.value ? typeToString(res.value) : null).toEqual(output);
        // expect(parsed.result).toEqual('');
    });
});
