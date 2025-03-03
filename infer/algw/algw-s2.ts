// Based on https://compiler.jaredforsyth.com/algw-s2

import { Stmt, Expr as JSExpr } from '../../lang/js--types';
import { Src } from '../../lang/parse-dsl';

export type Prim = { type: 'int'; value: number } | { type: 'bool'; value: boolean };
export type Top =
    | { type: 'def'; name: string; body: Expr }
    | { type: 'expr'; expr: Expr }
    | { type: 'deftype'; name: string; args: string[]; constructors: { name: string; args: Type[] }[] }
    | { type: 'typealias'; name: string; args: string[]; alias: Type };
export type Expr =
    | { type: 'prim'; prim: Prim; src: Src }
    | { type: 'var'; name: string; src: Src }
    | { type: 'str'; value: string; src: Src }
    | { type: 'lambda'; args: Pat[]; body: Expr; src: Src }
    | { type: 'app'; target: Expr; args: Expr[]; src: Src }
    | { type: 'let'; vbls: { pat: Pat; init: Expr }[]; body: Expr; src: Src }
    | { type: 'match'; target: Expr; cases: { pat: Pat; body: Expr }[]; src: Src };
export type Pat =
    | { type: 'any'; src: Src }
    | { type: 'var'; name: string; src: Src }
    | { type: 'con'; name: string; args: Pat[]; src: Src }
    | { type: 'str'; value: string; src: Src }
    | { type: 'prim'; prim: Prim; src: Src };
export type Type = { type: 'var'; name: string } | { type: 'app'; target: Type; arg: Type } | { type: 'con'; name: string };

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

type Scheme = { vars: string[]; body: Type };

type Tenv = {
    scope: Record<string, Scheme>;
    constructors: Record<string, { free: string[]; args: Type[]; result: Type }>;
    types: Record<string, { free: number; constructors: string[] }>;
    aliases: Record<string, { args: string[]; body: Type }>;
};

const merge = (...ones: string[][]) => {
    const seen: Record<string, true> = {};
    return ones.flat().filter((t) => (seen[t] ? false : (seen[t] = true)));
    // one.forEach(s => seen[s] = true)
    // return one.concat(two.filter(t => seen[t] ? false : (seen[t] = true)))
};

const typeFree = (type: Type): string[] => {
    switch (type.type) {
        case 'var':
            return [type.name];
        case 'con':
            return [];
        case 'app':
            return merge(typeFree(type.target), typeFree(type.arg));
    }
};

const schemeFree = (scheme: Scheme) => typeFree(scheme.body).filter((t) => !scheme.vars.includes(t));

const tenvFree = (tenv: Tenv) => merge(...Object.values(tenv.scope).map(schemeFree));

type Subst = Record<string, Type>;

const typeApply = (subst: Subst, type: Type): Type => {
    switch (type.type) {
        case 'var':
            return subst[type.name] ?? type;
        case 'app':
            return { type: 'app', target: typeApply(subst, type.target), arg: typeApply(subst, type.arg) };
        default:
            return type;
    }
};

const mapWithout = <T>(map: Record<string, T>, names: string[]): Record<string, T> => {
    const res: Record<string, T> = {};
    Object.keys(map).forEach((k) => {
        if (!names.includes(k)) {
            res[k] = map[k];
        }
    });
    return res;
};

const schemeApply = (subst: Subst, scheme: Scheme): Scheme => {
    return { vars: scheme.vars, body: typeApply(mapWithout(subst, scheme.vars), scheme.body) };
};

const tenvApply = (subst: Subst, tenv: Tenv): Tenv => {
    return { ...tenv, scope: scopeApply(subst, tenv.scope) };
};
const scopeApply = (subst: Subst, scope: Tenv['scope']) => {
    const res: Tenv['scope'] = {};
    Object.keys(scope).forEach((k) => {
        res[k] = schemeApply(subst, scope[k]);
    });
    return res;
};

const mapMap = <T>(f: (arg: T) => T, map: Record<string, T>): Record<string, T> => {
    const res: Record<string, T> = {};
    Object.keys(map).forEach((k) => {
        res[k] = f(map[k]);
    });
    return res;
};

const composeSubst = (newSubst: Subst, oldSubst: Subst) => {
    return {
        ...mapMap((t) => typeApply(newSubst, t), oldSubst),
        ...newSubst,
    };
};

const generalize = (tenv: Tenv, t: Type): Scheme => {
    const free = tenvFree(tenv);
    return {
        vars: typeFree(t).filter((n) => !free.includes(n)),
        body: t,
    };
};

type State = { nextId: number; subst: Subst };

let globalState: State = { nextId: 0, subst: {} };

const newTypeVar = (name: string): Type => {
    return { type: 'var', name: `${name}:${globalState.nextId++}` };
};

const makeSubstForFree = (vars: string[]) => {
    const mapping: Subst = {};
    vars.forEach((id) => {
        mapping[id] = newTypeVar(id);
    });
    return mapping;
};

const instantiate = (scheme: Scheme) => {
    const subst = makeSubstForFree(scheme.vars);
    return typeApply(subst, scheme.body);
};

const addSubst = (subst: Subst) => {
    globalState.subst = composeSubst(subst, globalState.subst);
};

const varBind = (name: string, type: Type) => {
    if (type.type === 'var') {
        if (type.name === name) {
            return;
        }
        addSubst({ [name]: type });
        return;
    }
    if (typeFree(type).includes(name)) {
        throw new Error(`Cycle found while unifying type with type variable: ${name}`);
    }
    addSubst({ [name]: type });
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

export const inferExpr = (tenv: Tenv, expr: Expr) => {
    const old = globalState.subst;
    globalState.subst = {};
    const type = inferExprInner(tenv, expr);
    globalState.subst = composeSubst(globalState.subst, old);
    return type;
};

const tfn = (arg: Type, body: Type): Type => ({ type: 'app', target: { type: 'app', target: { type: 'con', name: '->' }, arg }, arg: body });
const tfns = (args: Type[], body: Type): Type => args.reduceRight((res, arg) => tfn(arg, res), body);

const inferExprInner = (tenv: Tenv, expr: Expr): Type => {
    switch (expr.type) {
        case 'prim':
            return { type: 'con', name: expr.prim.type };
        case 'var':
            const got = tenv.scope[expr.name];
            if (!got) throw new Error(`variable not found in scope ${expr.name}`);
            return instantiate(got);
        case 'str':
            return { type: 'con', name: 'string' };
        case 'lambda':
            if (expr.args.length === 1) {
                if (expr.args[0].type === 'var') {
                    let argType = newTypeVar(expr.args[0].name);
                    const boundEnv: Tenv = { ...tenv, scope: { ...tenv.scope, [expr.args[0].name]: { vars: [], body: argType } } };
                    const bodyType = inferExpr(boundEnv, expr.body);
                    argType = typeApply(globalState.subst, argType);
                    return tfn(argType, bodyType);
                }
                let [argType, scope] = inferPattern(tenv, expr.args[0]);
                scope = scopeApply(globalState.subst, scope);
                const boundEnv = { ...tenv, scope: { ...tenv.scope, ...scope } };
                const bodyType = inferExpr(boundEnv, expr.body);
                argType = typeApply(globalState.subst, argType);
                return tfn(argType, bodyType);
            }
            const [one, ...rest] = expr.args;
            return inferExpr(tenv, {
                type: 'lambda',
                args: [one],
                body: { type: 'lambda', args: rest, body: expr.body, src: expr.src },
                src: expr.src,
            });
        case 'app': {
            if (expr.args.length === 1) {
                const resultVar = newTypeVar('result');
                let targetType = inferExpr(tenv, expr.target);
                const argTenv = tenvApply(globalState.subst, tenv);
                const argType = inferExpr(argTenv, expr.args[0]);
                targetType = typeApply(globalState.subst, targetType);
                unify(targetType, tfn(argType, resultVar));
                return typeApply(globalState.subst, resultVar);
            }
            if (!expr.args.length) return inferExpr(tenv, expr.target);
            const [one, ...rest] = expr.args;
            return inferExpr(tenv, {
                type: 'app',
                target: { type: 'app', target: expr.target, args: [one], src: expr.src },
                args: rest,
                src: expr.src,
            });
        }
        case 'let': {
            if (expr.vbls.length === 1) throw new Error('no bindings in let');
            if (expr.vbls.length > 1) {
                const [one, ...more] = expr.vbls;
                return inferExpr(tenv, {
                    type: 'let',
                    vbls: [one],
                    body: { type: 'let', vbls: more, body: expr.body, src: expr.src },
                    src: expr.src,
                });
            }
            const { pat, init } = expr.vbls[0];
            if (pat.type === 'var') {
                const valueType = inferExpr(tenv, init);
                const appliedEnv = tenvApply(globalState.subst, tenv);
                const scheme = generalize(appliedEnv, valueType);
                const boundEnv = { ...tenv, scope: { ...tenv.scope, [pat.name]: scheme } };
                return inferExpr(boundEnv, expr.body);
            }
            let [type, scope] = inferPattern(tenv, pat);
            const valueType = inferExpr(tenv, init);
            unify(type, valueType);
            scope = scopeApply(globalState.subst, scope);
            const boundEnv = { ...tenv, scope: { ...tenv.scope, ...scope } };
            const bodyType = inferExpr(boundEnv, expr.body);
            return bodyType;
        }
        case 'match':
            throw new Error('not yet folks');
    }
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
    if (!con) throw new Error(`unknown type constructor`);
    const subst = makeSubstForFree(con.free);
    return [con.args.map((arg) => typeApply(subst, arg)), typeApply(subst, con.result)];
};
