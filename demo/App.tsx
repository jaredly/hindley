import React from 'react';
import { js, lex } from '../lang/lexer';
import { fromMap } from '../lang/nodes';
import { parser } from '../lang/algw-s2';
import { builtinEnv, inferExpr, resetState, typeToString } from '../infer/algw/algw-s2';

const env = builtinEnv();
const text = `(x) => {let (a, _) = x; a(2)}`;
const cst = lex(js, text);
// console.log(JSON.stringify(cst, null, 2));
const node = fromMap(cst.roots[0], cst.nodes, (idx) => ({ id: '', idx }));
// console.log(JSON.stringify(node, null, 2));
const parsed = parser.parse(node);
if (!parsed.result) throw new Error(`not parsed ${text}`);
// console.log(parsed.result);
resetState();
const res = inferExpr(env, parsed.result);

export const App = () => {
    return (
        <div>
            Hello
            {typeToString(res)}
        </div>
    );
};
