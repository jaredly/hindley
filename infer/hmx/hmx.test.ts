import { test, expect } from 'bun:test';
import { js, lex } from '../../lang/lexer';
import { fromMap } from '../../lang/nodes';
import { parser } from '../../lang/algw-s2';
import { solve, inferExpr, Scheme, Tenv, constraintToString } from './hmx';
import { newTypeVar, resetState, tfns, Type, typeApply, typeToString } from '../algw/algw-s2';

const builtinEnv: Tenv = {
    aliases: {},
    types: {},
    constructors: {},
    scope: {},
};
const concrete = (body: Type): Scheme => ({ vars: [], constraint: null, body });
const generic = (vars: string[], body: Type): Scheme => ({ vars, constraint: null, body });
const tint: Type = { type: 'con', name: 'int' };
const tbool: Type = { type: 'con', name: 'bool' };
const k: Type = { type: 'var', name: 'k' };
const a: Type = { type: 'var', name: 'a' };
const b: Type = { type: 'var', name: 'b' };
const tapp = (target: Type, arg: Type): Type => ({ type: 'app', arg, target });
const tcon = (name: string): Type => ({ type: 'con', name });
builtinEnv.scope['null'] = concrete({ type: 'con', name: 'null' });
builtinEnv.scope['true'] = concrete({ type: 'con', name: 'bool' });
builtinEnv.scope['false'] = concrete({ type: 'con', name: 'bool' });
builtinEnv.scope['+'] = concrete(tfns([tint, tint], tint));
builtinEnv.scope['-'] = concrete(tfns([tint, tint], tint));
builtinEnv.scope['>'] = concrete(tfns([tint, tint], tbool));
builtinEnv.scope['<'] = concrete(tfns([tint, tint], tint));
builtinEnv.scope['='] = generic(['k'], tfns([k, k], tint));
builtinEnv.scope[','] = generic(['a', 'b'], tfns([a, b], tapp(tapp(tcon(','), a), b)));
builtinEnv.constructors[','] = { free: ['a', 'b'], args: [a, b], result: tapp(tapp(tcon(','), a), b) };

const tests: [string, string][] = [
    [`10`, `int`],
    [`{let x = 10; x}`, 'int'],
    [`(1, 2)`, '(int, int)'],
    [`{let (a, b) = (2, 3); a}`, 'int'],
    [`(x) => {let (a, b) = x; a}`, `((fn-body:2, free-b:5)) => fn-body:2`],
    // BROKEN
    [`{let a = 2; let a = true; a}`, 'bool'],
    [`"hi"`, 'string'],
    [`(x) => {let (a, _) = x; a(2)}`, '(((int) => fn-body:2, free-b:5)) => fn-body:2'],
    [
        `switch (true) {:
          true: 1
          false:3
        :}`,
        'int',
    ],
    [`{let id = (x) => x; (id(2), id(true))}`, `(int, bool)`],
    [`(x) => x`, `(fn-body:2) => fn-body:2`],
    [`{let id = (x) => x; id(true)}`, `bool`],
    ['(a, b) => (a, b)', '(fn-arg:6) => (fn-arg:5) => (fn-arg:6, fn-arg:5)'],
    ['((a, b)) => a + 2', '((int, free-b:4)) => int'],
];

tests.forEach(([input, output]) => {
    test(input, () => {
        const cst = lex(js, input);
        // console.log(JSON.stringify(cst, null, 2));
        const node = fromMap(cst.roots[0], cst.nodes, (idx) => idx);
        // console.log(JSON.stringify(node, null, 2));
        const parsed = parser.parse(node);
        if (!parsed.result) throw new Error(`not parsed ${input}`);
        // console.log(parsed.result);
        resetState();
        const vbl = newTypeVar('result');
        const res = inferExpr(builtinEnv, parsed.result, vbl);
        // console.log(constraintToString(res));
        const subst = solve(builtinEnv, res, {}, []);
        const t = typeApply(subst, vbl);
        // console.log();
        // console.log('t', typeToString(t));
        // console.log(vbl.name);
        // console.log(
        //     Object.entries(subst)
        //         .map(([name, type]) => `${name}: ${typeToString(type)}`)
        //         .join('\n'),
        // );
        expect(typeToString(t)).toEqual(output);
        // expect(parsed.result).toEqual('');
    });
});
