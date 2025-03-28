import { composeSubst, Expr, makeSubstForFree, merge, newTypeVar, Pat, Subst, tfn, Type, typeApply, typeFree, typeToString } from '../algw/algw-s2';

export type Scheme = { vars: string[]; constraint: Constraint; body: Type };

export type Tenv = {
    scope: Record<string, Scheme>;
    constructors: Record<string, { free: string[]; args: Type[]; result: Type }>;
    types: Record<string, { free: number; constructors: string[] }>;
    aliases: Record<string, { args: string[]; body: Type }>;
};

export const scopeApply = (subst: Subst, scope: Tenv['scope']) => {
    const res: Tenv['scope'] = {};
    Object.keys(scope).forEach((k) => {
        res[k] = schemeApply(subst, scope[k]);
    });
    return res;
};

type Constraint =
    | null
    /* Unify one type with another */
    | { type: 'eq'; left: Type; right: Type }
    /* Solve the left, apply the substitution to the right and then solve that */
    | { type: 'and'; left: Constraint; right: Constraint }
    /* Declare some favirables that are 'free in the environment' of the body */
    | { type: 'exists'; vbls: string[]; body: Constraint }
    /* Declare a variable in scope */
    | { type: 'def'; name: string; scheme: Scheme; body: Constraint }
    | { type: 'instance'; name: string; body: Type };

const indent = (text: string) => '  ' + text.split('\n').join(`\n  `);

export const constraintToString = (c: Constraint): string => {
    if (!c) return 'null';
    switch (c.type) {
        case 'eq':
            return `(\n  ${indent(typeToString(c.left))}\n    =\n  ${indent(typeToString(c.right))})`;
        case 'and':
            return `${constraintToString(c.left)}\n&\n${constraintToString(c.right)}`;
        case 'exists':
            return `E(${c.vbls.join(',')} -> \n${indent(constraintToString(c.body))})`;
        case 'def':
            return `let ${c.name} =${c.scheme.vars.length ? ` [${c.scheme.vars.join(',')}]` : ''} {${constraintToString(
                c.scheme.constraint,
            )}} ${typeToString(c.scheme.body)}\nIN\n${indent(constraintToString(c.body))}`;
        case 'instance':
            return `inst(${c.name}) == ${typeToString(c.body)}`;
    }
};

const ands = (constrs: Constraint[]): Constraint => {
    if (!constrs.length) return null;
    let res = constrs[0];
    for (let i = 1; i < constrs.length; i++) {
        res = { type: 'and', left: res, right: constrs[i] };
    }
    return res;
};

const schemeApply = (subst: Subst, scheme: Scheme): Scheme => ({
    ...scheme,
    constraint: constraintApply(subst, scheme.constraint),
    body: typeApply(subst, scheme.body),
});

const constraintApply = (subst: Subst, constraint: Constraint): Constraint => {
    if (!constraint) return constraint;
    switch (constraint.type) {
        case 'eq':
            return { ...constraint, left: typeApply(subst, constraint.left), right: typeApply(subst, constraint.right) };
        case 'and':
            return { ...constraint, left: constraintApply(subst, constraint.left), right: constraintApply(subst, constraint.right) };
        case 'exists':
            return { ...constraint, body: constraintApply(subst, constraint.body) };
        case 'def':
            return { ...constraint, scheme: schemeApply(subst, constraint.scheme), body: constraintApply(subst, constraint.body) };
        case 'instance':
            return { ...constraint, body: typeApply(subst, constraint.body) };
    }
};

export const instantiate = (scheme: Scheme) => {
    // console.log('isntantiate', scheme);
    const subst = makeSubstForFree(scheme.vars);
    return typeApply(subst, scheme.body);
};

const unzip3 = <A, B, C>(lst: [A, B, C][]): [A[], B[], C[]] => {
    return [lst.map((l) => l[0]), lst.map((l) => l[1]), lst.map((l) => l[2])];
};

const inferPat = (tenv: Tenv, pat: Pat, type: Type): [Constraint, string[], Subst] => {
    switch (pat.type) {
        case 'any':
            return [null, [], {}];
        case 'var':
            return [{ type: 'instance', name: pat.name, body: type }, [], { [pat.name]: type }];
        case 'prim':
            return [{ type: 'eq', left: { type: 'con', name: pat.prim.type }, right: type }, [], {}];
        case 'str':
            return [{ type: 'eq', left: { type: 'con', name: 'string' }, right: type }, [], {}];
        case 'con':
            const got = tenv.constructors[pat.name];
            if (!got) throw new Error(`unknown constructor: ${pat.name}`);
            const vbls = got.free.map((id) => newTypeVar('free-' + id));
            const subst: Subst = {};
            vbls.forEach((vbl, i) => (subst[got.free[i]] = vbl));
            const [constr, cvbls, scopes] = unzip3(pat.args.map((arg, i) => inferPat(tenv, arg, typeApply(subst, got.args[i]))));
            return [
                { type: 'and', left: { type: 'eq', left: typeApply(subst, got.result), right: type }, right: ands(constr) },
                [vbls.map((v) => v.name), ...cvbls].flat(),
                scopes.reduce((a, b) => (Object.assign(a, b), a), {}),
            ];
    }
};

const withScope = (inner: Constraint, scope: Subst) => {
    Object.entries(scope).forEach(([name, type]) => {
        inner = { type: 'def', name, scheme: { vars: [], constraint: null, body: type }, body: inner };
    });
    return inner;
};

export const inferExpr = (tenv: Tenv, expr: Expr, type: Type): Constraint => {
    switch (expr.type) {
        case 'prim':
            return { type: 'eq', left: { type: 'con', name: expr.prim.type }, right: type };
        case 'var':
            return { type: 'instance', name: expr.name, body: type };
        case 'str':
            return { type: 'eq', left: { type: 'con', name: 'string' }, right: type };
        case 'if':
            throw new Error('not yet');
        case 'lambda':
            let body = expr.body;
            const [arg, ...rest] = expr.args;
            if (expr.args.length > 1) {
                body = { ...expr, args: rest };
            }
            if (arg.type === 'var') {
                const x1 = newTypeVar('arg-' + arg.name);
                const x2 = newTypeVar('fn-body');
                const ibody = inferExpr(tenv, body, x2);
                return {
                    type: 'exists',
                    vbls: [x1.name, x2.name],
                    body: ands([
                        { type: 'def', name: arg.name, scheme: { vars: [], constraint: null, body: x1 }, body: ibody },
                        { type: 'eq', left: tfn(x1, x2), right: type },
                    ]),
                };
            }
            const targ = newTypeVar('fn-arg');
            const tres = newTypeVar('fn-body');
            const [pat, vbls, scope] = inferPat(tenv, arg, targ);
            const ibody = inferExpr(tenv, body, tres);
            return {
                type: 'exists',
                vbls: [targ.name, tres.name, ...vbls],
                body: ands([withScope(ands([pat, ibody]), scope), { type: 'eq', left: tfn(targ, tres), right: type }]),
            };
        case 'let': {
            const [{ pat, init }, ...rest] = expr.vbls;
            let body = expr.body;
            if (rest.length) {
                body = { ...expr, vbls: rest };
            }
            if (pat.type === 'var') {
                const x = newTypeVar('pat-' + pat.name);
                const tinit = inferExpr(tenv, init, x);
                const ibody = inferExpr(tenv, body, type);
                return { type: 'def', name: pat.name, scheme: { vars: [x.name], constraint: tinit, body: x }, body: ibody };
            }
            const tinit = newTypeVar('let-init');
            const [cpat, vbls, scope] = inferPat(tenv, pat, tinit);
            const cinit = inferExpr(tenv, init, tinit);
            const cbody = inferExpr(tenv, body, type);
            return {
                type: 'exists',
                vbls: [tinit.name, ...vbls],
                body: ands([cinit, withScope(ands([cpat, cbody]), scope)]),
            };
        }
        case 'app': {
            const one = expr.args[expr.args.length - 1];
            let target = expr.target;
            if (expr.args.length > 1) {
                target = { ...expr, args: expr.args.slice(0, -1) };
            }
            const x = newTypeVar('fn-arg');
            const itarget = inferExpr(tenv, target, tfn(x, type));
            const arg = inferExpr(tenv, one, x);
            return { type: 'exists', vbls: [x.name], body: ands([itarget, arg]) };
        }
        case 'match': {
            const ttarget = newTypeVar('match-target');
            const tres = newTypeVar('match-result');
            const ctarget = inferExpr(tenv, expr.target, ttarget);
            const ccons = expr.cases.map(({ pat, body }): Constraint => {
                const [patCon, vbls, scope] = inferPat(tenv, pat, ttarget);
                const expCon = inferExpr(tenv, body, tres);
                return { type: 'exists', vbls: vbls, body: withScope(ands([patCon, expCon]), scope) };
            });
            return {
                type: 'exists',
                vbls: [ttarget.name, tres.name],
                body: ands([{ type: 'eq', left: tres, right: type }, ctarget, ...ccons]),
            };
        }
    }
    throw new Error('lol');
};

export const varBind = (name: string, type: Type): Subst => {
    if (type.type === 'var') {
        if (type.name === name) {
            return {};
        }
        return { [name]: type };
    }
    if (typeFree(type).includes(name)) {
        throw new Error(`Cycle found while unifying type with type variable: ${name}`);
    }
    return { [name]: type };
};

export const unify = (from: string, one: Type, two: Type): Subst => {
    // console.log(`unify(${from}) ${typeToString(one)} == ${typeToString(two)}`);
    const res = unify_(one, two);
    // console.log(
    //     Object.entries(res)
    //         .map(([name, type]) => `  ${name} -> ${typeToString(type)}`)
    //         .join('\n'),
    // );
    // console.log();
    return res;
};

export const unify_ = (one: Type, two: Type): Subst => {
    if (one.type === 'var') {
        return varBind(one.name, two);
    }
    if (two.type === 'var') {
        return varBind(two.name, one);
    }
    if (one.type === 'con' && two.type === 'con') {
        if (one.name === two.name) return {};
        throw new Error(`Incompatible concrete types: ${one.name} vs ${two.name}`);
    }
    if (one.type === 'app' && two.type === 'app') {
        const target = unify_(one.target, two.target);
        const arg = unify_(typeApply(target, one.arg), typeApply(target, two.arg));
        return composeSubst(arg, target);
    }
    throw new Error(`incompatible types ${JSON.stringify(one)} : ${JSON.stringify(two)}`);
};

const validateSubst = (subst: Subst) => {
    const keys = Object.keys(subst);
    keys.forEach((k) => {
        const f = typeFree(subst[k]);
        f.forEach((n) => {
            if (keys.includes(n)) {
                throw new Error(`subst in a bad place; something on the left exists on the right. ${n}`);
            }
        });
    });
    return subst;
};

export const solve = (tenv: Tenv, constraint: Constraint, scope: Tenv['scope'], free: string[]): Subst => {
    if (!constraint) return {};
    switch (constraint.type) {
        case 'and': {
            const one = solve(tenv, constraint.left, scope, free);
            const two = solve(tenv, constraintApply(one, constraint.right), scopeApply(one, scope), free);
            return validateSubst(composeSubst(two, one));
        }
        case 'eq':
            return validateSubst(unify('eq', constraint.left, constraint.right));
        case 'exists':
            return solve(tenv, constraint.body, scope, merge(free, constraint.vbls));
        case 'instance': {
            let got = scope[constraint.name] ?? tenv.scope[constraint.name];
            if (!got) throw new Error(`unbound variable: ${constraint.name}`);
            const igot = instantiate(got);
            return validateSubst(unify('inst', igot, constraint.body));
        }
        case 'def': {
            const cns = constraint.scheme.constraint;
            const t = constraint.scheme.body;
            const subst = solve(tenv, cns, scope, free);
            const nt = typeApply(subst, t);
            const res = solve(
                tenv,
                constraintApply(subst, constraint.body),
                {
                    ...scopeApply(subst, scope),
                    [constraint.name]: {
                        vars: typeFree(nt).filter((t) => !free.includes(t)),
                        constraint: null,
                        body: nt,
                    },
                },
                free,
            );
            return validateSubst(composeSubst(res, subst));
        }
    }
};
