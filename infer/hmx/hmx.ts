import { composeSubst, Expr, makeSubstForFree, merge, newTypeVar, Pat, Subst, tfn, Type, typeApply, typeFree } from '../algw/algw-s2';

type Scheme = { vars: string[]; constraint: Constraint; body: Type };

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
    | { type: 'bool'; value: boolean }
    | { type: 'app'; name: string; args: Type[] }
    | { type: 'and'; left: Constraint; right: Constraint }
    | { type: 'exists'; vbls: string[]; body: Constraint }
    | { type: 'def'; name: string; scheme: Scheme; body: Constraint }
    | { type: 'instance'; name: string; body: Type };

const ands = (constrs: Constraint[]): Constraint => {
    if (!constrs.length) return { type: 'bool', value: true };
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
    switch (constraint.type) {
        case 'app':
            return { ...constraint, args: constraint.args.map((arg) => typeApply(subst, arg)) };
        case 'and':
            return { ...constraint, left: constraintApply(subst, constraint.left), right: constraintApply(subst, constraint.right) };
        case 'exists':
            return { ...constraint, body: constraintApply(subst, constraint.body) };
        case 'def':
            return { ...constraint, scheme: schemeApply(subst, constraint.scheme), body: constraintApply(subst, constraint.body) };
        case 'instance':
        case 'bool':
            return constraint;
    }
};

export const instantiate = (scheme: Scheme) => {
    const subst = makeSubstForFree(scheme.vars);
    return typeApply(subst, scheme.body);
};

const inferPatArgs = (tenv: Tenv, subst: Subst, args: Pat[], types: Type[]) => {
    return args.map((arg, i) => inferPat(tenv, arg, typeApply(subst, types[i])));
};

const inferPat = (tenv: Tenv, pat: Pat, type: Type): [Constraint, string[], Subst] => {
    switch (pat.type) {
        case 'any':
            return [{ type: 'bool', value: true }, [], {}];
        case 'var':
            return [{ type: 'instance', name: pat.name, body: type }, [], { [pat.name]: type }];
        case 'prim':
            return [{ type: 'app', name: '=', args: [{ type: 'con', name: pat.prim.type }, type] }, [], {}];
        case 'str':
            return [{ type: 'app', name: '=', args: [{ type: 'con', name: 'string' }, type] }, [], {}];
        case 'con':
            const got = tenv.constructors[pat.name];
            if (!got) throw new Error(`unknown constructor: ${pat.name}`);
            const vbls = got.free.map((id) => newTypeVar(id));
            const subst: Subst = {};
            vbls.forEach((vbl, i) => (subst[got.free[i]] = vbl));
            const argCon = inferPatArgs(tenv, subst, pat.args, got.args);
            const constr = argCon.map((a) => a[0]);
            const cvbls = argCon.map((a) => a[1]);
            const scopes = argCon.map((a) => a[2]);
            const scope: Subst = {};
            scopes.forEach((one) => {
                Object.assign(scope, one);
            });
            return [
                { type: 'and', left: { type: 'app', name: '=', args: [typeApply(subst, got.result), type] }, right: ands(constr) },
                [vbls.map((v) => v.name), ...cvbls].flat(),
                scope,
            ];
    }
};

const withScope = (inner: Constraint, scope: Subst) => {
    Object.entries(scope).forEach(([name, type]) => {
        inner = {
            type: 'def',
            name,
            scheme: {
                vars: [],
                constraint: { type: 'bool', value: true },
                body: type,
            },
            body: inner,
        };
    });
    return inner;
};

const inferExpr = (tenv: Tenv, expr: Expr, type: Type): Constraint => {
    switch (expr.type) {
        case 'prim':
            return { type: 'app', name: '=', args: [{ type: 'con', name: expr.prim.type }, type] };
        case 'var':
            return { type: 'instance', name: expr.name, body: type };
        case 'str':
            return { type: 'app', name: '=', args: [{ type: 'con', name: 'string' }, type] };
        case 'lambda':
            if (expr.args.length > 1) {
                const [one, ...rest] = expr.args;
                return inferExpr(tenv, { ...expr, args: [one], body: { ...expr, args: rest } }, type);
            }
            const arg = expr.args[0];
            if (arg.type === 'var') {
                const x1 = newTypeVar(arg.name);
                const x2 = newTypeVar('lambda-body');
                const body = inferExpr(tenv, expr.body, x2);
                return {
                    type: 'exists',
                    vbls: [x1.name, x2.name],
                    body: ands([
                        { type: 'def', name: arg.name, scheme: { vars: [], constraint: { type: 'bool', value: true }, body: x1 }, body },
                        { type: 'app', name: '=', args: [tfn(x1, x2), type] },
                    ]),
                };
            }
            const targ = newTypeVar('fn-arg');
            const tres = newTypeVar('fn-body');
            const [pat, vbls, scope] = inferPat(tenv, arg, targ);
            const body = inferExpr(tenv, expr.body, tres);
            return {
                type: 'exists',
                vbls: [targ.name, tres.name, ...vbls],
                body: ands([withScope(ands([pat, body]), scope), { type: 'app', name: '=', args: [tfn(targ, tres), type] }]),
            };
        case 'let': {
            if (expr.vbls.length > 1) {
                const [one, ...rest] = expr.vbls;
                return inferExpr(tenv, { ...expr, vbls: [one], body: { ...expr, vbls: rest } }, type);
            }
            const [{ pat, init }] = expr.vbls;
            if (pat.type === 'var') {
                const x = newTypeVar(pat.name);
                const tinit = inferExpr(tenv, init, x);
                const body = inferExpr(tenv, expr.body, type);
                return { type: 'def', name: pat.name, scheme: { vars: [x.name], constraint: tinit, body: x }, body };
            }
            const tinit = newTypeVar('let-init');
            const [cpat, vbls, scope] = inferPat(tenv, pat, tinit);
            const cinit = inferExpr(tenv, init, tinit);
            const cbody = inferExpr(tenv, expr.body, type);
            return {
                type: 'exists',
                vbls: [tinit.name, ...vbls],
                body: ands([cinit, withScope(ands([cpat, cbody]), scope)]),
            };
        }
        case 'app': {
            if (expr.args.length > 1) {
                const [one, ...rest] = expr.args;
                return inferExpr(tenv, { ...expr, target: { ...expr, args: [one] }, args: rest }, type);
            }
            const x = newTypeVar('fn-arg');
            const target = inferExpr(tenv, expr.target, tfn(x, type));
            const arg = inferExpr(tenv, expr.args[0], x);
            return { type: 'exists', vbls: [x.name], body: ands([target, arg]) };
        }
        case 'match': {
            const ttarget = newTypeVar('match-target');
            const tres = newTypeVar('match-result');
            const ctarget = inferExpr(tenv, expr.target, ttarget);
            const ccons = expr.cases.map(({ pat, body }): Constraint => {
                const [patCon, vbls, scope] = inferPat(tenv, pat, ttarget);
                const expCon = inferExpr(tenv, expr, tres);
                return { type: 'exists', vbls: vbls, body: withScope(ands([patCon, expCon]), scope) };
            });
            return {
                type: 'exists',
                vbls: [ttarget.name, tres.name],
                body: ands([{ type: 'app', name: '=', args: [tres, type] }, ctarget, ...ccons]),
            };
        }
    }
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

export const unify = (one: Type, two: Type): Subst => {
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
        const target = unify(one.target, two.target);
        const arg = unify(typeApply(target, one.arg), typeApply(target, two.arg));
        return composeSubst(arg, target);
    }
    throw new Error(`incompatible types ${JSON.stringify(one)} : ${JSON.stringify(two)}`);
};

export const solve = (tenv: Tenv, constraint: Constraint, scope: Tenv['scope'], free: string[]): Subst => {
    switch (constraint.type) {
        case 'bool':
            if (constraint.value) return {};
            throw new Error(`got a false`);
        case 'and': {
            const one = solve(tenv, constraint.left, scope, free);
            const two = solve(tenv, constraintApply(one, constraint.right), scopeApply(one, scope), free);
            return composeSubst(two, one);
        }
        case 'app':
            if (constraint.name === '=' && constraint.args.length === 2) {
                return unify(constraint.args[0], constraint.args[1]);
            }
            throw new Error(`unknown applicaiton`);
        case 'exists':
            return solve(tenv, constraint.body, scope, merge(free, constraint.vbls));
        case 'instance': {
            let got = scope[constraint.name] ?? tenv.scope[constraint.name];
            if (!got) throw new Error(`unbound variable: ${constraint.name}`);
            return unify(instantiate(got), constraint.body);
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
                        constraint: { type: 'bool', value: true },
                        body: nt,
                    },
                },
                free,
            );
            return composeSubst(res, subst);
        }
    }
};
