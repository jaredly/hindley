import { Block, Expr, Stmt } from './js--types';
import { Src } from './parse-dsl';

type sourced = string | { code: sourced; src: Src } | sourced[];

type SourceMap = { start: number; end: number; src: Src }[];
export const sourcedToString = (sourced: sourced, at: number, map: SourceMap): string => {
    if (typeof sourced === 'string') {
        return sourced;
    }
    if (Array.isArray(sourced)) {
        return sourced
            .map((s) => {
                const inner = sourcedToString(s, at, map);
                at += inner.length;
                return inner;
            })
            .join('');
    }
    const inner = sourcedToString(sourced.code, at, map);
    map.push({ start: at, end: at + inner.length, src: sourced.src });
    return inner;
};

export const compileStmt = (stmt: Stmt): sourced => {
    switch (stmt.type) {
        case 'block':
            return compileBlock(stmt);
        case 'if':
            return {
                code: ['if (', compileExpr(stmt.cond), ') ', compileBlock(stmt.yes), stmt.no ? [' else ', compileBlock(stmt.no)] : []],
                src: stmt.src,
            };
        case 'return':
            return { code: ['return ', stmt.value ? compileExpr(stmt.value) : ''], src: stmt.src };
        case 'throw':
            return { code: ['throw ', compileExpr(stmt.value)], src: stmt.src };
        case 'let':
            return { code: ['let ', { code: stmt.name.text, src: { left: stmt.name.loc } }, ' = ', compileExpr(stmt.value)], src: stmt.src };
        case 'for':
            return {
                code: ['for (', compileStmt(stmt.init), '; ', compileExpr(stmt.cond), '; ', compileExpr(stmt.update), ') ', compileBlock(stmt.body)],
                src: stmt.src,
            };
        case 'expr':
            return compileExpr(stmt.expr);
        case 'show':
            throw new Error(`what show`);
    }
};

export const compileBlock = (block: Block): sourced => ({ src: block.src, code: ['{\n', block.contents.map((s) => [compileStmt(s), ';\n']), '}'] });

export const compileExpr = (expr: Expr): sourced => {
    switch (expr.type) {
        case 'number':
            return { code: expr.value + '', src: expr.src };
        case 'object':
            return {
                code: ['{', expr.items.map(({ name, value }) => [{ code: name.text, src: { left: name.loc } }, ':', compileExpr(value)]), '}'],
                src: expr.src,
            };
        case 'var':
            return { code: expr.name, src: expr.src };
        case 'text':
            return {
                code: [
                    '"',
                    expr.spans.map((span) => (span.type === 'text' ? span.text : span.type === 'embed' ? ['${', compileExpr(span.item), '}'] : '')),
                    '"',
                ],
                src: expr.src,
            };
        case 'array':
            return { code: ['[', expr.items.map(compileExpr), ']'], src: expr.src };
        case 'call':
            return { code: [maybeWrap(expr.target), '(', expr.args.map((arg) => [compileExpr(arg), ',']), ')'], src: expr.src };
        case 'attribute':
            return { code: [maybeWrap(expr.target), '.', { code: expr.attribute.text, src: { left: expr.attribute.loc } }], src: expr.src };
        case 'index':
            return { code: [maybeWrap(expr.target), '[', compileExpr(expr.index), ']'], src: expr.src };
        case 'arrow':
            return {
                code: [
                    '(',
                    expr.args.map((arg) => [{ code: arg.text, src: { left: arg.loc } }, ', ']),
                    ') => ',
                    expr.body.type === 'block' ? compileBlock(expr.body) : compileExpr(expr.body),
                ],
                src: expr.src,
            };
        case 'new':
            return { code: ['new ', maybeWrap(expr.inner)], src: expr.src };
        case 'bop':
            return { code: [maybeWrap(expr.left), ' ' + expr.op + ' ', maybeWrap(expr.right)], src: expr.src };
    }
};

const maybeWrap = (expr: Expr) => (expr.type === 'bop' || expr.type === 'arrow' ? ['(', compileExpr(expr), ')'] : compileExpr(expr));
