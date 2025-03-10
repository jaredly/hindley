// Based on https://compiler.jaredforsyth.com/algw-s2

import equal from 'fast-deep-equal';
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
    const tapp = (target: Type, ...args: Type[]): Type => ({ type: 'app', args, target });
    const tcon = (name: string): Type => ({ type: 'con', name });
    builtinEnv.scope['null'] = concrete({ type: 'con', name: 'null' });
    builtinEnv.scope['true'] = concrete({ type: 'con', name: 'bool' });
    builtinEnv.scope['false'] = concrete({ type: 'con', name: 'bool' });
    builtinEnv.scope['length'] = generic(['k'], tfn(tapp(tcon('array'), k), tint));
    builtinEnv.scope['index'] = generic(['k'], tfns([tapp(tcon('array'), k), tint], k));
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
    builtinEnv.scope[','] = generic(['a', 'b'], tfns([a, b], tapp(tcon(','), a, b)));
    builtinEnv.constructors[','] = { free: ['a', 'b'], args: [a, b], result: tapp(tcon(','), a, b) };
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
export type Type =
    | { type: 'var'; name: string }
    | { type: 'fn'; args: Type[]; result: Type }
    | { type: 'app'; target: Type; args: Type[] }
    | { type: 'con'; name: string };

export const typeToString = (t: Type): string => {
    switch (t.type) {
        case 'var':
            return t.name;
        case 'app':
            if (t.target.type === 'con' && t.target.name === ',') {
                return `(${t.args.map((a) => typeToString(a)).join(', ')})`;
            }
            return `${typeToString(t.target)}(${t.args.map((a) => typeToString(a)).join(', ')})`;
        case 'con':
            return t.name;
        case 'fn':
            return `(${t.args.map(typeToString)}) => ${typeToString(t.result)}`;
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
            return (
                typeEqual(one.target, two.target) && one.args.length === two.args.length && one.args.every((arg, i) => typeEqual(arg, two.args[i]))
            );
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
            return type.args.reduce((result, arg) => merge(result, typeFree(arg)), typeFree(type.target));
        case 'fn':
            return type.args.reduce((result, arg) => merge(result, typeFree(arg)), typeFree(type.result));
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
            return { type: 'app', target: typeApply(subst, type.target), args: type.args.map((arg) => typeApply(subst, arg)) };
        case 'fn':
            return { ...type, result: typeApply(subst, type.result), args: type.args.map((arg) => typeApply(subst, arg)) };
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

export type Event =
    | { type: 'unify'; one: Type; two: Type; subst: Subst }
    | { type: 'scope'; scope: Tenv['scope'] }
    | { type: 'infer'; src: Src; value: Type }
    | { type: 'new-var'; name: string };

type State = { nextId: number; subst: Subst; events: Event[]; tvarMeta: Record<string, TvarMeta>; latestScope?: Tenv['scope'] };

type TvarMeta =
    | { type: 'free'; prev: string }
    | { type: 'return-any'; src: Src }
    | {
          type: 'pat-var';
          name: string;
          src: Src;
      }
    | { type: 'lambda-return'; src: Src }
    | { type: 'apply-result'; src: Src }
    | { type: 'pat-any'; src: Src };

let globalState: State = { nextId: 0, subst: {}, events: [], tvarMeta: {} };
export const resetState = () => {
    globalState = { nextId: 0, subst: {}, events: [], tvarMeta: {} };
};
export const getGlobalState = () => globalState;

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const makeName = (n: number) => {
    let res = '';
    while (n >= alphabet.length) {
        res = alphabet[n % alphabet.length] + res;
        n = Math.floor(n / alphabet.length);
    }
    res = alphabet[n] + res;
    return res;
};

export const newTypeVar = (meta: TvarMeta): Extract<Type, { type: 'var' }> => {
    const name = makeName(globalState.nextId++);
    globalState.events.push({ type: 'new-var', name });
    globalState.tvarMeta[name] = meta;
    return { type: 'var', name };
};

export const makeSubstForFree = (vars: string[]) => {
    const mapping: Subst = {};
    vars.forEach((id) => {
        mapping[id] = newTypeVar({ type: 'free', prev: id });
    });
    return mapping;
};

export const instantiate = (scheme: Scheme) => {
    const subst = makeSubstForFree(scheme.vars);
    return typeApply(subst, scheme.body);
};

export const varBind = (name: string, type: Type) => {
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

export const unify = (one: Type, two: Type) => {
    one = typeApply(globalState.subst, one);
    two = typeApply(globalState.subst, two);
    const subst = unifyInner(one, two);
    globalState.events.push({ type: 'unify', one, two, subst });
    globalState.subst = composeSubst(subst, globalState.subst);
};

export const unifyInner = (one: Type, two: Type): Subst => {
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
    if (one.type === 'fn' && two.type === 'fn') {
        if (one.args.length !== two.args.length) {
            console.log(typeToString(one));
            console.log(typeToString(two));
            throw new Error(`number of args is different: ${one.args.length} vs ${two.args.length}`);
        }
        let subst = unifyInner(one.result, two.result);
        for (let i = 0; i < one.args.length; i++) {
            subst = composeSubst(unifyInner(typeApply(subst, one.args[i]), typeApply(subst, two.args[i])), subst);
        }
        return subst;
    }
    if (one.type === 'app' && two.type === 'app') {
        if (one.args.length !== two.args.length) {
            throw new Error(`number of args is different`);
        }
        let subst = unifyInner(one.target, two.target);
        for (let i = 0; i < one.args.length; i++) {
            subst = composeSubst(unifyInner(typeApply(subst, one.args[i]), typeApply(subst, two.args[i])), subst);
        }
        return subst;
    }
    throw new Error(`incompatible types \n${JSON.stringify(one)}\n${JSON.stringify(two)}`);
};

export const inferExpr = (tenv: Tenv, expr: Expr, asStmt: boolean) => {
    if (!globalState.latestScope || !equal(scopeApply(globalState.subst, globalState.latestScope), scopeApply(globalState.subst, tenv.scope))) {
        globalState.latestScope = tenv.scope;
        globalState.events.push({ type: 'scope', scope: tenv.scope });
    }
    // console.log('infer expr', expr);
    // const old = globalState.subst;
    // globalState.subst = {};
    const type = inferExprInner(tenv, expr, asStmt);
    if (type.value && !asStmt) {
        globalState.events.push({ type: 'infer', src: expr.src, value: type.value });
    }
    // globalState.subst = composeSubst(globalState.subst, old);
    return type;
};

export const tfn = (arg: Type, body: Type): Type => ({ type: 'fn', args: [arg], result: body });
// ({ type: 'app', target: { type: 'app', target: { type: 'con', name: '->' }, arg }, arg: body });
export const tfns = (args: Type[], body: Type): Type => ({ type: 'fn', args, result: body });
// args.reduceRight((res, arg) => tfn(arg, res), body);

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

export const inferStmt = (tenv: Tenv, stmt: Stmt): { value: Type; partial?: boolean; scope?: Tenv['scope'] } => {
    switch (stmt.type) {
        case 'return': {
            const value = newTypeVar({ type: 'return-any', src: stmt.src });
            if (!tenv.scope['return']) {
                throw new Error(`cant return, we are not in a lambda`);
            }
            if (!stmt.value) {
                unify(tenv.scope['return'].body, { type: 'con', name: 'void' });
                return { value };
            }
            const inner = inferExpr(tenv, stmt.value, false);
            unify(tenv.scope['return'].body, inner.value);
            return { value };
        }
        case 'let': {
            const { pat, init } = stmt;
            if (pat.type === 'var') {
                const pv = newTypeVar({ type: 'pat-var', name: pat.name, src: pat.src });
                globalState.events.push({ type: 'infer', src: pat.src, value: pv });
                const self = tenvWithScope(tenv, { [pat.name]: { body: pv, vars: [] } });
                const valueType = inferExpr(self, init, false);
                unify(typeApply(globalState.subst, pv), valueType.value);
                const appliedEnv = tenvApply(globalState.subst, tenv);
                // globalState.events.push({ type: 'infer', src: pat.src, value: valueType.value });
                return {
                    partial: true,
                    scope: { [pat.name]: init.type === 'lambda' ? generalize(appliedEnv, valueType.value) : { vars: [], body: valueType.value } },
                    value: { type: 'con', name: 'void' },
                };
            }
            let [type, scope] = inferPattern(tenv, pat);
            const valueType = inferExpr(tenv, init, false);
            unify(type, valueType.value);
            scope = scopeApply(globalState.subst, scope);
            return { scope: scope, value: { type: 'con', name: 'void' } };
        }
        case 'expr':
            const value = inferExpr(tenv, stmt.expr, true);
            return { partial: value.partial, value: value.value };
        case 'for': {
            const letter = inferStmt(tenv, stmt.init);
            const bound = letter.scope ? tenvWithScope(tenvApply(globalState.subst, tenv), letter.scope) : tenv;
            const upter = inferExpr(bound, stmt.cond, false);
            unify(upter.value ?? { type: 'con', name: 'void' }, { type: 'con', name: 'bool' });
            const okk = inferExpr(bound, stmt.update, true);
            const body = inferExpr(bound, stmt.body, true);

            return { partial: body.partial, value: { type: 'con', name: 'void' } };
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

export const inferExprInner = (tenv: Tenv, expr: Expr, asStmt: boolean): { partial?: boolean; value: Type } => {
    switch (expr.type) {
        case 'prim':
            return { value: { type: 'con', name: expr.prim.type } };
        case 'var':
            const got = tenv.scope[expr.name];
            if (!got) throw new Error(`variable not found in scope ${expr.name}`);
            return { value: instantiate(got) };
        case 'str':
            return { value: { type: 'con', name: 'string' } };
        case 'lambda': {
            if (!expr.args.length) {
                throw new Error(`cant have an empty lambda sry`);
            }
            const returnVar = newTypeVar({ type: 'lambda-return', src: expr.src });
            let scope: Tenv['scope'] = { ['return']: { vars: [], body: returnVar } };
            let args: Type[] = [];
            expr.args.forEach((pat) => {
                let [argType, patScope] = inferPattern(tenv, pat);
                patScope = scopeApply(globalState.subst, patScope);
                args.push(argType);
                Object.assign(scope, patScope);
                globalState.events.push({ type: 'infer', src: pat.src, value: argType });
            });
            let boundEnv = { ...tenv, scope: { ...tenv.scope, ...scope } };

            const bodyType = inferExpr(boundEnv, expr.body, false);
            unify(bodyType.value, typeApply(globalState.subst, returnVar));
            return {
                value: tfns(
                    args.map((arg) => typeApply(globalState.subst, arg)),
                    typeApply(globalState.subst, bodyType.value),
                    // bodyType.value ?? bodyType.return ?? { type: 'con', name: 'void' },
                ),
            };
        }

        case 'app': {
            // console.log(`app`, expr.args.length);
            // if (expr.args.length === 1) {
            const resultVar = newTypeVar({ type: 'apply-result', src: expr.src });
            globalState.events.push({ type: 'infer', src: expr.src, value: resultVar });
            let targetType = inferExpr(tenv, expr.target, false);
            const argTenv = tenvApply(globalState.subst, tenv);

            const args = expr.args.map((arg) => {
                return inferExpr(argTenv, arg, false).value!;
            });
            const argType = inferExpr(argTenv, expr.args[0], false);

            // STOPSHIP: handle returns
            // if (argType.return && targetType.return) {
            //     unify(argType.return, targetType.return);
            // }
            // STOPSHIP handle no value
            // if (!argType.value || !targetType.value) {
            //     return { value: null, return: argType.return ?? targetType.return };
            // }

            // console.log(expr.target, targetType.value);
            // console.log('args', expr.args);
            unify(typeApply(globalState.subst, targetType.value!), tfns(args, resultVar));
            return { value: typeApply(globalState.subst, resultVar) };
            // }
            // if (!expr.args.length) return inferExpr(tenv, expr.target, asStmt);
            // const [one, ...rest] = expr.args;
            // return inferExpr(
            //     tenv,
            //     {
            //         type: 'app',
            //         target: { type: 'app', target: expr.target, args: [one], src: expr.src },
            //         args: rest,
            //         src: expr.src,
            //     },
            //     asStmt,
            // );
        }

        case 'if': {
            const cond = inferExpr(tenv, expr.cond, false);
            unify(cond.value, { type: 'con', name: 'bool' });

            const one = inferExpr(tenv, expr.yes, true);
            const two = expr.no ? inferExpr(tenv, expr.no, true) : undefined;
            const twov = two ? two.value : { type: 'con' as const, name: 'void' };
            if (!asStmt && one.value && twov) {
                unify(one.value, twov);
            }
            return { value: one.value };
        }
        case 'block': {
            if (!expr.stmts.length) {
                return { value: { type: 'con', name: 'void' } };
            }
            let scope = {};
            let value: Type | null = null;
            let partial: undefined | boolean = undefined;
            for (let inner of expr.stmts) {
                const applied = tenvApply(globalState.subst, tenv);
                const res = inferStmt({ ...applied, scope: { ...applied.scope, ...scope } }, inner);
                if (res.scope) {
                    Object.assign(scope, res.scope);
                }
                value = res.value;
            }
            if (!value) throw new Error('how did we get here');
            return {
                partial,
                value: typeApply(globalState.subst, value),
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
            return [newTypeVar({ type: 'pat-any', src: pat.src }), {}];
        case 'var': {
            const v = newTypeVar({ type: 'pat-var', name: pat.name, src: pat.src });
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
