import { test, expect } from 'bun:test';
import { js, lex } from '../../lang/lexer';
import { fromMap } from '../../lang/nodes';
import { parser } from '../../lang/algw-s2';
import { inferExpr, resetState, Scheme, Tenv, tfns, Type, typeToString } from './algw-s2';

const tests: [string, string][] = [
    [`10`, `int`],
    [`{let x = 10;x}`, 'int'],
    [`(1,2)`, '(int, int)'],
    [`{let (a,b) = (2,3);a}`, 'int'],
    [`(x) => {let (a,b) = x;a}`, `((a:1, b:2)) => a:1`],
    [`{let id = (x) => x;(id(2),id(true))}`, `(int, bool)`],
    [`{let a = 2;let a = true;a}`, 'bool'],
    [`"hi"`, 'string'],
    [`(x) => {let (a,_) = x;a(2)}`, '(((int) => result:5, b:2)) => result:5'],
];

const builtinEnv: Tenv = {
    aliases: {},
    types: {},
    constructors: {},
    scope: {},
};
const concrete = (body: Type): Scheme => ({ vars: [], body });
const generic = (vars: string[], body: Type): Scheme => ({ vars, body });
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
// builtinEnv.scope['[]'] =

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
        const res = inferExpr(builtinEnv, parsed.result);
        expect(typeToString(res)).toEqual(output);
        // expect(parsed.result).toEqual('');
    });
});
