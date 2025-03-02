import { test, expect } from 'bun:test';
import { js, lex } from './lexer';

test('lex', () => {
    const res = lex(js, 'hello+folks');
    expect(res).toEqual(10);
});
