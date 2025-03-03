// import { Node } from '../../../../src/types/cst';
// import { Type } from './types-w';

/*

I doooonnt think this works.



*/

import { Expr, Type } from './lambda-calculus';
//// inference

type Scheme = {
    vbls: string[];
    body: Type;
};

type Env = {
    scope: { [vblName: string]: Scheme };
    counter: { num: number };
};

type Subst = { [typeVbl: string]: Type };
const emptySubst: Subst = {};

const instantiate = (scheme: Scheme): Type => {
    return scheme.body;
};
const apply = (subst: Subst, t: Type): Type => {
    return t;
};

const newTV = (env: Env) => `v${env.counter.num++}`;

export const w_unify = (one: Type, two: Type): Subst => {
    return emptySubst;
};

export const w_infer = (
    expr: Expr,
    env: Env,
): {
    type: Type;
    subst: Subst;
} => {
    switch (expr.type) {
        case 'concrete':
            return { type: { type: 'concrete', name: expr.typeName }, subst: emptySubst };
        case 'var': {
            const got = env.scope[expr.name];
            if (!got) throw new Error('use of undeclared variable: ' + expr.name);
            return { type: instantiate(got), subst: {} };
        }
        case 'arrow':
            const argName = expr.arg;
            const vn = newTV(env);
            const at = { type: 'var', name: vn } as const;
            const cenv: Env = {
                ...env,
                scope: {
                    ...env.scope,
                    [argName]: {
                        vbls: [],
                        body: at,
                    },
                },
            };
            const inner = w_infer(expr.body, cenv);
            const argType = apply(inner.subst, at);
            return {
                type: {
                    type: 'fn',
                    arg: argType,
                    body: inner.type,
                },
                subst: inner.subst,
            };
        case 'call': {
            const fn = expr.target;
            const arg = expr.arg;

            const returnType: Type = { type: 'var', name: newTV(env) };
            const { type: type1, subst: sub1 } = w_infer(fn, env);
            const env1: Env = applyEnv(env, sub1);

            const { subst: sub2, type: type2 } = w_infer(arg, env1);
            const type1_sub = apply(sub2, type1);

            const type3: Type = {
                type: 'fn',
                arg: type2,
                body: returnType,
            };
            const sub3: Subst = w_unify(type1_sub, type3);
            const sub = { ...sub1, ...sub2, ...sub3 };
            const res = apply(sub3, returnType);
            return { type: res, subst: sub };
        }
        case 'let':
            const vname = expr.name;
            const init = expr.value;
            const body = expr.body;

            const { subst: sub1, type: type1 } = w_infer(init, env);
            const e2 = applyEnv(env, sub1);
            const e3: Env = {
                ...env,
                scope: {
                    ...env.scope,
                    [vname]: {
                        body: type1,
                        vbls: [],
                    },
                },
            };
            const e4 = applyEnv(e3, sub1);
            const { subst: sub2, type: type2 } = w_infer(body, e4);

            return { type: type2, subst: { ...sub1, ...sub2 } };
    }
};

function applyEnv(env: Env, sub1: Subst): Env {
    return {
        ...env,
        scope: Object.fromEntries(Object.entries(env.scope).map(([k, v]) => [k, { ...v, body: apply(sub1, v.body) }])),
    };
}
