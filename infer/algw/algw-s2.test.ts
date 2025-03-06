import { test, expect } from 'bun:test';
import { js, lex } from '../../lang/lexer';
import { fromMap } from '../../lang/nodes';
import { parser } from '../../lang/algw-s2';
import { builtinEnv, inferExpr, resetState, Scheme, Tenv, tfns, Type, typeToString } from './algw-s2';

const tests: [string, string][] = [
    [`10`, `int`],
    [`{let x = 10; x}`, 'int'],
    [`(1, 2)`, '(int, int)'],
    [`{let (a, b) = (2, 3); a}`, 'int'],
    [`(x) => {let (a, b) = x; a}`, `((a:1, b:2)) => a:1`],
    [`{let id = (x) => x; (id(2), id(true))}`, `(int, bool)`],
    [`{let a = 2; let a = true; a}`, 'bool'],
    [`"hi"`, 'string'],
    [`(x) => {let (a, _) = x; a(2)}`, '(((int) => result:5, b:2)) => result:5'],
    [
        `switch (true) {:
          true: 1
          false:3
        :}`,
        'int',
    ],
    [
        `(arr) => {
    let x = arr.length;
    arr
}`,
        '(array(k:2)) => array(k:2)',
    ],
];

const env = builtinEnv();

tests.forEach(([input, output]) => {
    test(input, () => {
        const cst = lex(js, input);
        // console.log(JSON.stringify(cst, null, 2));
        const node = fromMap(cst.roots[0], cst.nodes, (idx) => ({ id: '', idx }));
        // console.log(JSON.stringify(node, null, 2));
        const parsed = parser.parse(node);
        if (!parsed.result) throw new Error(`not parsed ${input}`);
        // console.log(parsed.result);
        resetState();
        const res = inferExpr(env, parsed.result);
        expect(typeToString(res)).toEqual(output);
        // expect(parsed.result).toEqual('');
    });
});
