// Based on https://compiler.jaredforsyth.com/algw-s2

import { Src } from '../../lang/parse-dsl';

export const builtinEnv = () => {
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
    builtinEnv.scope['length'] = generic(['k'], tfn(tapp(tcon('array'), k), tint));
    builtinEnv.scope['index'] = generic(['k'], tfns([tapp(tcon('array'), k), tint], tint));
    builtinEnv.scope['push'] = generic(['k'], tfns([tapp(tcon('array'), k), k], tcon('void')));
    builtinEnv.scope['concat'] = generic(['k'], tfns([tapp(tcon('array'), k), tapp(tcon('array'), k)], tapp(tcon('array'), k)));
    builtinEnv.scope['[]'] = generic(['k'], tapp(tcon('array'), k));
    builtinEnv.scope['::'] = generic(['k'], tfns([k, tapp(tcon('array'), k)], tapp(tcon('array'), k)));
    builtinEnv.scope['void'] = concrete({ type: 'con', name: 'void' });
    builtinEnv.scope['+'] = concrete(tfns([tint, tint], tint));
    builtinEnv.scope['+='] = concrete(tfns([tint, tint], tint));
    builtinEnv.scope['-'] = concrete(tfns([tint, tint], tint));
    builtinEnv.scope['>'] = concrete(tfns([tint, tint], tbool));
    builtinEnv.scope['<'] = concrete(tfns([tint, tint], tbool));
    builtinEnv.scope['<='] = concrete(tfns([tint, tint], tbool));
    builtinEnv.scope['='] = generic(['k'], tfns([k, k], tint));
    builtinEnv.scope[','] = generic(['a', 'b'], tfns([a, b], tapp(tapp(tcon(','), a), b)));
    builtinEnv.constructors[','] = { free: ['a', 'b'], args: [a, b], result: tapp(tapp(tcon(','), a), b) };
    return builtinEnv;
};

export type Prim = { type: 'int'; value: number } | { type: 'bool'; value: boolean };
// export type Top =
//     | { type: 'def'; name: string; body: Expr }
//     | { type: 'expr'; expr: Expr }
//     | { type: 'deftype'; name: string; args: string[]; constructors: { name: string; args: Type[] }[] }
//     | { type: 'typealias'; name: string; args: string[]; alias: Type };

export type Block = { type: 'block'; stmts: Stmt[]; src: Src };

export type Stmt =
    | { type: 'for'; init: Stmt; cond: Expr; update: Expr; body: Block; src: Src }
    | { type: 'let'; pat: Pat; init: Expr; src: Src }
    | { type: 'expr'; expr: Expr; src: Src }
    | { type: 'return'; value?: Expr; src: Src };

export type Spread<T> = { type: 'spread'; inner: T; src: Src };
export type Expr =
    | Block
    | { type: 'if'; cond: Expr; yes: Block; no?: Expr; src: Src }
    | { type: 'match'; target: Expr; cases: { pat: Pat; body: Expr }[]; src: Src }
    // | { type: 'array'; items: (Expr | Spread<Expr>)[]; src: Src }
    | { type: 'prim'; prim: Prim; src: Src }
    | { type: 'var'; name: string; src: Src }
    | { type: 'str'; value: string; src: Src }
    | { type: 'lambda'; args: Pat[]; body: Expr; src: Src }
    | { type: 'app'; target: Expr; args: Expr[]; src: Src };
export type Pat =
    | { type: 'any'; src: Src }
    | { type: 'var'; name: string; src: Src }
    | { type: 'con'; name: string; args: Pat[]; src: Src }
    | { type: 'str'; value: string; src: Src }
    | { type: 'prim'; prim: Prim; src: Src };
export type Type = { type: 'var'; name: string } | { type: 'app'; target: Type; arg: Type } | { type: 'con'; name: string };

export const typeToString = (t: Type): string => {
    switch (t.type) {
        case 'var':
            return t.name;
        case 'app':
            const args: Type[] = [t.arg];
            let target = t.target;
            while (target.type === 'app') {
                args.unshift(target.arg);
                target = target.target;
            }
            if (target.type === 'con' && target.name === ',') {
                return `(${args.map(typeToString).join(', ')})`;
            }
            if (target.type === 'con' && target.name === '->' && args.length === 2) {
                return `(${typeToString(args[0])}) => ${typeToString(args[1])}`;
            }
            return `${typeToString(target)}(${args.map(typeToString).join(', ')})`;
        case 'con':
            return t.name;
    }
};

const typeEqual = (one: Type, two: Type): boolean => {
    if (one.type !== two.type) return false;

    switch (one.type) {
        case 'var':
            if (two.type !== 'var') return false;
            return one.name === two.name;
        case 'app':
            if (two.type !== 'app') return false;
            return typeEqual(one.target, two.target) && typeEqual(one.arg, two.arg);
        case 'con':
            if (two.type !== 'con') return false;
            return one.name === two.name;
        default:
            return false;
    }
};

export type Scheme = { vars: string[]; body: Type };

export type Tenv = {
    scope: Record<string, Scheme>;
    constructors: Record<string, { free: string[]; args: Type[]; result: Type }>;
    types: Record<string, { free: number; constructors: string[] }>;
    aliases: Record<string, { args: string[]; body: Type }>;
};

export const merge = (...ones: string[][]) => {
    const seen: Record<string, true> = {};
    return ones.flat().filter((t) => (seen[t] ? false : (seen[t] = true)));
    // one.forEach(s => seen[s] = true)
    // return one.concat(two.filter(t => seen[t] ? false : (seen[t] = true)))
};

export const typeFree = (type: Type): string[] => {
    switch (type.type) {
        case 'var':
            return [type.name];
        case 'con':
            return [];
        case 'app':
            return merge(typeFree(type.target), typeFree(type.arg));
    }
};

export const schemeFree = (scheme: Scheme) => typeFree(scheme.body).filter((t) => !scheme.vars.includes(t));

export const tenvFree = (tenv: Tenv) => merge(...Object.values(tenv.scope).map(schemeFree));

export type Subst = Record<string, Type>;

export const typeApply = (subst: Subst, type: Type): Type => {
    switch (type.type) {
        case 'var':
            return subst[type.name] ?? type;
        case 'app':
            return { type: 'app', target: typeApply(subst, type.target), arg: typeApply(subst, type.arg) };
        default:
            return type;
    }
};

export const mapWithout = <T>(map: Record<string, T>, names: string[]): Record<string, T> => {
    const res: Record<string, T> = {};
    Object.keys(map).forEach((k) => {
        if (!names.includes(k)) {
            res[k] = map[k];
        }
    });
    return res;
};

export const schemeApply = (subst: Subst, scheme: Scheme): Scheme => {
    return { vars: scheme.vars, body: typeApply(mapWithout(subst, scheme.vars), scheme.body) };
};

export const tenvApply = (subst: Subst, tenv: Tenv): Tenv => {
    return { ...tenv, scope: scopeApply(subst, tenv.scope) };
};
export const scopeApply = (subst: Subst, scope: Tenv['scope']) => {
    const res: Tenv['scope'] = {};
    Object.keys(scope).forEach((k) => {
        res[k] = schemeApply(subst, scope[k]);
    });
    return res;
};

export const mapMap = <T>(f: (arg: T) => T, map: Record<string, T>): Record<string, T> => {
    const res: Record<string, T> = {};
    Object.keys(map).forEach((k) => {
        res[k] = f(map[k]);
    });
    return res;
};

export const composeSubst = (newSubst: Subst, oldSubst: Subst) => {
    Object.keys(newSubst).forEach((k) => {
        if (oldSubst[k]) {
            console.log(newSubst, oldSubst);
            throw new Error(`overwriting substitution, should not happen`);
        }
    });
    return {
        ...mapMap((t) => typeApply(newSubst, t), oldSubst),
        ...newSubst,
    };
};

export const generalize = (tenv: Tenv, t: Type): Scheme => {
    const free = tenvFree(tenv);
    return {
        vars: typeFree(t).filter((n) => !free.includes(n)),
        body: t,
    };
};

type State = { nextId: number; subst: Subst };

let globalState: State = { nextId: 0, subst: {} };
export const resetState = () => {
    globalState.nextId = 0;
    globalState.subst = {};
};

export const newTypeVar = (name: string): Extract<Type, { type: 'var' }> => {
    // console.log('bew type var', name);
    // console.log(new Error().stack!.split('\n').slice(1, 3).join('\n'));
    return { type: 'var', name: `${name}:${globalState.nextId++}` };
};

export const makeSubstForFree = (vars: string[]) => {
    const mapping: Subst = {};
    vars.forEach((id) => {
        mapping[id] = newTypeVar(id);
    });
    return mapping;
};

export const instantiate = (scheme: Scheme) => {
    const subst = makeSubstForFree(scheme.vars);
    return typeApply(subst, scheme.body);
};

export const addSubst = (name: string, type: Type) => {
    globalState.subst = composeSubst({ [name]: type }, globalState.subst);
};

export const varBind = (name: string, type: Type) => {
    if (type.type === 'var') {
        if (type.name === name) {
            return;
        }
        addSubst(name, type);
        return;
    }
    if (typeFree(type).includes(name)) {
        throw new Error(`Cycle found while unifying type with type variable: ${name}`);
    }
    addSubst(name, type);
};

export const unify = (one: Type, two: Type) => {
    if (one.type === 'var') {
        return varBind(one.name, two);
    }
    if (two.type === 'var') {
        return varBind(two.name, one);
    }
    if (one.type === 'con' && two.type === 'con') {
        if (one.name === two.name) return;
        throw new Error(`Incompatible concrete types: ${one.name} vs ${two.name}`);
    }
    if (one.type === 'app' && two.type === 'app') {
        unify(one.target, two.target);
        unify(typeApply(globalState.subst, one.arg), typeApply(globalState.subst, two.arg));
        return;
    }
    throw new Error(`incompatible types ${JSON.stringify(one)} : ${JSON.stringify(two)}`);
};

export const inferExpr = (tenv: Tenv, expr: Expr, asStmt: boolean) => {
    // const old = globalState.subst;
    // globalState.subst = {};
    const type = inferExprInner(tenv, expr, asStmt);
    // globalState.subst = composeSubst(globalState.subst, old);
    return type;
};

export const tfn = (arg: Type, body: Type): Type => ({ type: 'app', target: { type: 'app', target: { type: 'con', name: '->' }, arg }, arg: body });
export const tfns = (args: Type[], body: Type): Type => args.reduceRight((res, arg) => tfn(arg, res), body);

const tenvWithScope = (tenv: Tenv, scope: Tenv['scope']): Tenv => ({
    ...tenv,
    scope: { ...tenv.scope, ...scope },
});

const unifyReturns = (ts: (Type | null | undefined)[]) => {
    const real = ts.filter((t) => t != null);
    if (real.length < 2) return;
    for (let i = 1; i < real.length; i++) {
        unify(real[0], real[i]);
    }
    return typeApply(globalState.subst, real[0]);
};

export const inferStmt = (
    tenv: Tenv,
    stmt: Stmt,
): { return: Type | null | undefined; value: Type | null; partial?: boolean; scope?: Tenv['scope'] } => {
    switch (stmt.type) {
        case 'return': {
            if (!stmt.value) {
                return { return: { type: 'con', name: 'void' }, value: null };
            }
            const value = inferExpr(tenv, stmt.value, false);
            if (value.value && value.return) {
                unify(value.value, value.return);
            }
            return { return: value.value ?? value.return, value: null };
        }
        case 'let': {
            const { pat, init } = stmt;
            if (pat.type === 'var') {
                const pv = newTypeVar(pat.name);
                const self = tenvWithScope(tenv, { [pat.name]: { body: pv, vars: [] } });
                const valueType = inferExpr(self, init, false);
                if (!valueType.value) {
                    return { return: valueType.return, partial: valueType.partial, value: null };
                }
                unify(typeApply(globalState.subst, pv), valueType.value);
                const appliedEnv = tenvApply(globalState.subst, tenv);
                return {
                    return: valueType.return,
                    partial: true,
                    scope: { [pat.name]: generalize(appliedEnv, valueType.value) },
                    value: { type: 'con', name: 'void' },
                };
            }
            let [type, scope] = inferPattern(tenv, pat);
            const valueType = inferExpr(tenv, init, false);
            if (!valueType.value) {
                return { return: valueType.return, partial: valueType.partial, value: null };
            }
            unify(type, valueType.value);
            scope = scopeApply(globalState.subst, scope);
            return { return: null, scope: scope, value: { type: 'con', name: 'void' } };
        }
        case 'expr':
            const value = inferExpr(tenv, stmt.expr, false);
            return { return: value.return, partial: value.partial, value: value.value };
        case 'for': {
            const letter = inferStmt(tenv, stmt.init);
            const bound = letter.scope ? tenvWithScope(tenvApply(globalState.subst, tenv), letter.scope) : tenv;
            const upter = inferExpr(bound, stmt.cond, false);
            unify(upter.value ?? { type: 'con', name: 'void' }, { type: 'con', name: 'bool' });
            const okk = inferExpr(bound, stmt.update, true);
            const body = inferExpr(bound, stmt.body, true);
            const ret = unifyReturns([letter.return, okk.return, body.return]);

            return { return: ret, partial: body.partial, value: { type: 'con', name: 'void' } };
        }
        // case 'match':
        //     throw new Error('not right now');
        // case 'match': {
        //     let targetType = inferExpr(tenv, stmt.target);
        //     let resultType: Type = newTypeVar('match result');
        //     let midTarget = targetType;

        //     let returnt: Type|null = null;

        //     for (let kase of stmt.cases) {
        //         let [type, scope] = inferPattern(tenv, kase.pat);
        //         unify(type, midTarget);
        //         scope = scopeApply(globalState.subst, scope);
        //         const innerTenv = { ...tenv, scope: { ...tenv.scope, ...scope } }
        //         if (kase.body.type === 'block') {
        //             const result = inferStmt(innerTenv, kase.body);
        //             if (result.return && !result.all) {
        //                 throw new Error(`block doesnt return consistently. add a return at the end?`)
        //             }
        //             argType = typeApply(globalState.subst, argType);
        //             return tfn(argType, result.return ?? {type: 'con', name: 'void'});
        //         }
        //         const bodyType = inferExpr(innerTenv, kase.body);
        //         unify(typeApply(globalState.subst, resultType), bodyType);
        //         midTarget = typeApply(globalState.subst, midTarget);
        //         resultType = typeApply(globalState.subst, resultType);
        //     }
        //     // TODO: check exhaustiveness
        //     // checkExhaustiveness(tenv, typeApply(globalState.subst, targetType), stmt.cases.map(k => k.pat))
        //     return resultType;
        // }
        default:
            throw new Error(`nope ${(stmt as any).type}`);
    }
};

export const inferExprInner = (tenv: Tenv, expr: Expr, asStmt: boolean): { return?: Type; partial?: boolean; value: Type | null } => {
    switch (expr.type) {
        case 'prim':
            return { value: { type: 'con', name: expr.prim.type } };
        case 'var':
            const got = tenv.scope[expr.name];
            if (!got) throw new Error(`variable not found in scope ${expr.name}`);
            return { value: instantiate(got) };
        case 'str':
            return { value: { type: 'con', name: 'string' } };
        case 'lambda':
            if (!expr.args.length) {
                throw new Error(`cant have an empty lambda sry`);
            }
            if (expr.args.length === 1) {
                let argType: Type, boundEnv: Tenv;
                if (expr.args[0].type === 'var') {
                    argType = newTypeVar(expr.args[0].name);
                    boundEnv = { ...tenv, scope: { ...tenv.scope, [expr.args[0].name]: { vars: [], body: argType } } };
                } else {
                    let scope;
                    [argType, scope] = inferPattern(tenv, expr.args[0]);
                    scope = scopeApply(globalState.subst, scope);
                    boundEnv = { ...tenv, scope: { ...tenv.scope, ...scope } };
                }

                const bodyType = inferExpr(boundEnv, expr.body, false);
                if (bodyType.value && bodyType.return) {
                    unify(bodyType.value, bodyType.return);
                }
                argType = typeApply(globalState.subst, argType);
                return { value: tfn(argType, bodyType.value ?? bodyType.return ?? { type: 'con', name: 'void' }) };
            }
            const [one, ...rest] = expr.args;
            return inferExpr(
                tenv,
                {
                    type: 'lambda',
                    args: [one],
                    body: { type: 'lambda', args: rest, body: expr.body, src: expr.src },
                    src: expr.src,
                },
                asStmt,
            );

        case 'app': {
            if (expr.args.length === 1) {
                const resultVar = newTypeVar('result');
                let targetType = inferExpr(tenv, expr.target, false);
                const argTenv = tenvApply(globalState.subst, tenv);
                const argType = inferExpr(argTenv, expr.args[0], false);

                if (argType.return && targetType.return) {
                    unify(argType.return, targetType.return);
                }
                if (!argType.value || !targetType.value) {
                    return { value: null, return: argType.return ?? targetType.return };
                }

                unify(typeApply(globalState.subst, targetType.value), tfn(argType.value, resultVar));
                return { value: typeApply(globalState.subst, resultVar), return: argType.return ?? targetType.return };
            }
            if (!expr.args.length) return inferExpr(tenv, expr.target, asStmt);
            const [one, ...rest] = expr.args;
            return inferExpr(
                tenv,
                {
                    type: 'app',
                    target: { type: 'app', target: expr.target, args: [one], src: expr.src },
                    args: rest,
                    src: expr.src,
                },
                asStmt,
            );
        }

        case 'if': {
            const cond = inferExpr(tenv, expr.cond, false);
            if (!cond.value) {
                return { value: null, return: cond.return };
            }
            unify(cond.value, { type: 'con', name: 'bool' });

            const one = inferExpr(tenv, expr.yes, true);
            const two = expr.no ? inferExpr(tenv, expr.no, true) : undefined;
            if (one.return && two?.return) {
                // console.log('both have a return', one.return, two.return);
                unify(one.return, two.return);
            } else {
                // console.log('not both have rteturn');
            }
            const twov = two ? two.value : { type: 'con' as const, name: 'void' };
            if (!asStmt && one.value && twov) {
                unify(one.value, twov);
            }
            return { return: one.return, partial: !one.return || one.partial || !two?.return || two.partial, value: one.value };
        }
        case 'block': {
            if (!expr.stmts.length) {
                return { value: { type: 'con', name: 'void' } };
            }
            let result: Type | undefined = undefined;
            let scope = {};
            let value: Type | null = null;
            let partial: undefined | boolean = undefined;
            for (let inner of expr.stmts) {
                const applied = tenvApply(globalState.subst, tenv);
                const res = inferStmt({ ...applied, scope: { ...applied.scope, ...scope } }, inner);
                if (res.return) {
                    if (result != null) {
                        unify(res.return, result);
                    } else {
                        result = res.return;
                    }
                }
                partial = !res.return || res.partial;
                if (res.scope) {
                    Object.assign(scope, res.scope);
                }
                value = res.value;
            }
            return {
                return: result ? typeApply(globalState.subst, result) : undefined,
                partial,
                value: value ? typeApply(globalState.subst, value) : null,
            };
        }
        // case 'array': {
        //     // expr.items
        // }

        // case 'let': {
        //     if (expr.vbls.length === 0) throw new Error('no bindings in let');
        //     if (expr.vbls.length > 1) {
        //         const [one, ...more] = expr.vbls;
        //         return inferExpr(tenv, {
        //             type: 'let',
        //             vbls: [one],
        //             body: { type: 'let', vbls: more, body: expr.body, src: expr.src },
        //             src: expr.src,
        //         });
        //     }
        //     const { pat, init } = expr.vbls[0];
        //     if (pat.type === 'var') {
        //         const valueType = inferExpr(tenv, init);
        //         const appliedEnv = tenvApply(globalState.subst, tenv);
        //         const boundEnv = { ...tenv, scope: { ...tenv.scope, [pat.name]: generalize(appliedEnv, valueType) } };
        //         if (expr.body.type === 'var' && expr.body.name === 'null') {
        //             return typeApply(globalState.subst, valueType);
        //         }
        //         return inferExpr(boundEnv, expr.body);
        //     }
        //     let [type, scope] = inferPattern(tenv, pat);
        //     const valueType = inferExpr(tenv, init);
        //     unify(type, valueType);
        //     scope = scopeApply(globalState.subst, scope);
        //     const boundEnv = { ...tenv, scope: { ...tenv.scope, ...scope } };
        //     const bodyType = inferExpr(boundEnv, expr.body);
        //     return bodyType;
        // }
    }
    throw new Error('Unknown expr type: ' + (expr as any).type);
};

const inferPattern = (tenv: Tenv, pat: Pat): [Type, Tenv['scope']] => {
    switch (pat.type) {
        case 'any':
            return [newTypeVar('any'), {}];
        case 'var': {
            const v = newTypeVar(pat.name);
            return [v, { [pat.name]: { vars: [], body: v } }];
        }
        case 'con': {
            let [cargs, cres] = instantiateTcon(tenv, pat.name);
            const subPatterns = pat.args.map((arg) => inferPattern(tenv, arg));
            const argTypes = subPatterns.map((s) => s[0]);
            const scopes = subPatterns.map((s) => s[1]);
            argTypes.forEach((arg, i) => unify(arg, cargs[i]));
            cres = typeApply(globalState.subst, cres);
            const scope = scopes.reduce((a, b) => ({ ...a, ...b }));
            return [cres, scope];
        }

        case 'str':
            return [{ type: 'con', name: 'string' }, {}];
        case 'prim':
            return [{ type: 'con', name: pat.prim.type }, {}];
    }
};

const instantiateTcon = (tenv: Tenv, name: string): [Type[], Type] => {
    const con = tenv.constructors[name];
    if (!con) throw new Error(`unknown type constructor: ${name}`);
    const subst = makeSubstForFree(con.free);
    return [con.args.map((arg) => typeApply(subst, arg)), typeApply(subst, con.result)];
};
