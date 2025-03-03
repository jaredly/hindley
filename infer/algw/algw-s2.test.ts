import { test, expect } from 'bun:test';
import { js, lex } from '../../lang/lexer';
import { fromMap } from '../../lang/nodes';
import { parser } from '../../lang/js--';

const tests: [string, string][] = [
    [`10`, `int`],
    [`hi`, 'Variable not found hi'],
    [`{let x = 10;x}`, 'int'],
    [`pair(1,2)`, 'pair'],
    [`(x) => {let pair(a,b) = x;a}`, `(pair(a:1,b:2)) => a:1`],
    [`{let id = (x) => x;pair(id(2),id(true))}`, `pair(int,bool)`],
];

tests.forEach(([input, output]) => {
    test(input, () => {
        const cst = lex(js, input);
        const node = fromMap(cst.roots[0], cst.nodes, (idx) => ({ id: '', idx }));
        const parsed = parser.parse(node);
        expect(parsed.result).toEqual('');
    });
});
