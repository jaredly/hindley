import { Id, Loc, TextSpan } from './nodes';
import { Src } from './parse-dsl';

export type Expr =
    | { type: 'number'; value: number; src: Src }
    | { type: 'var'; name: string; src: Src }
    | { type: 'text'; spans: TextSpan<Expr>[]; src: Src }
    | { type: 'array'; items: Expr[]; src: Src }
    | { type: 'object'; items: { name: Id<Loc>; value: Expr }[]; src: Src }
    | { type: 'call'; target: Expr; args: Expr[]; src: Src }
    | { type: 'attribute'; target: Expr; attribute: Id<Loc>; src: Src }
    | { type: 'index'; target: Expr; index: Expr; src: Src }
    | { type: 'arrow'; args: Id<Loc>[]; body: Expr | Block; src: Src }
    | { type: 'new'; inner: Expr; src: Src }
    | { type: 'bop'; left: Expr; op: string; right: Expr; src: Src };

export type Block = { type: 'block'; contents: Stmt[]; src: Src };
export type Stmt =
    | Block
    | { type: 'if'; cond: Expr; yes: Block; no: null | Block; src: Src }
    | { type: 'return'; value: Expr | null; src: Src }
    | { type: 'throw'; value: Expr; src: Src }
    | { type: 'let'; name: Id<Loc>; value: Expr; src: Src }
    | { type: 'for'; init: Stmt; cond: Expr; update: Expr; src: Src; body: Block }
    | { type: 'expr'; expr: Expr; src: Src }
    // just fow show
    | { type: 'show' };

export const kwds = ['for', 'return', 'new', 'await', 'throw', 'if', 'case', 'else', 'let', 'const', '=', '..', '.', 'fn'];
export const binops = ['<', '>', '<=', '>=', '!=', '==', '+', '-', '*', '/', '^', '%', '=', '+=', '-=', '|=', '/=', '*='];
