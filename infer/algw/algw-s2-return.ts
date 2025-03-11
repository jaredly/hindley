// Based on https://compiler.jaredforsyth.com/algw-s2

import equal from 'fast-deep-equal';
import { Src } from '../../lang/parse-dsl';
import { interleave } from '../../demo/interleave';

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
    builtinEnv.scope['length'] = generic(['k'], tfn(tapp(tcon('Array'), k), tint));
    builtinEnv.scope['index'] = generic(['k'], tfns([tapp(tcon('Array'), k), tint], k));
    builtinEnv.scope['push'] = generic(['k'], tfns([tapp(tcon('Array'), k), k], tcon('void')));
    builtinEnv.scope['concat'] = generic(['k'], tfns([tapp(tcon('Array'), k), tapp(tcon('Array'), k)], tapp(tcon('Array'), k)));
    builtinEnv.scope['[]'] = generic(['k'], tapp(tcon('Array'), k));
    builtinEnv.scope['::'] = generic(['k'], tfns([k, tapp(tcon('Array'), k)], tapp(tcon('Array'), k)));
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
    // | { type: 'Array'; items: (Expr | Spread<Expr>)[]; src: Src }
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

export const gtypeApply = (type: Type): Type => {
    return typeApply(globalState.subst, type);
};
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

const hole = (active?: boolean): StackText => ({ type: 'hole', active });
const kwd = (kwd: string): StackText => ({ type: 'kwd', kwd });
const typ = (typ: Type): StackText => ({ type: 'type', typ });
export type StackText = { type: 'hole'; active?: boolean } | { type: 'kwd'; kwd: string } | { type: 'type'; typ: Type } | string;

export type StackValue = StackText[];

const stackPush = (src: Src, ...value: StackText[]) => globalState.events.push({ src, type: 'stack-push', value });
const stackReplace = (src: Src, ...value: StackText[]) => {
    globalState.events.push({ type: 'stack-pop' });
    globalState.events.push({ src, type: 'stack-push', value });
};
const stackPop = () => globalState.events.push({ type: 'stack-pop' });
const stackBreak = (title: string) => globalState.events.push({ type: 'stack-break', title });

export type Event =
    | { type: 'unify'; one: Type; two: Type; subst: Subst; src: Src; oneName: string; twoName: string; message?: string }
    | { type: 'scope'; scope: Tenv['scope'] }
    | { type: 'infer'; src: Src; value: Type }
    | { type: 'new-var'; name: string }
    | { type: 'stack-break'; title: string }
    | { type: 'stack-push'; value: StackValue; src: Src }
    | { type: 'stack-pop' };

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
    // globalState.events.push({ type: 'new-var', name });
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

export const unify = (one: Type, two: Type, src: Src, oneName: string, twoName: string, message?: string) => {
    one = typeApply(globalState.subst, one);
    two = typeApply(globalState.subst, two);
    const subst = unifyInner(one, two);
    globalState.events.push({ type: 'unify', one, two, subst, src, oneName, twoName, message });
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

export const inferExpr = (tenv: Tenv, expr: Expr) => {
    if (!globalState.latestScope || !equal(scopeApply(globalState.subst, globalState.latestScope), scopeApply(globalState.subst, tenv.scope))) {
        globalState.latestScope = tenv.scope;
        globalState.events.push({ type: 'scope', scope: tenv.scope });
    }
    // console.log('infer expr', expr);
    // const old = globalState.subst;
    // globalState.subst = {};
    const type = inferExprInner(tenv, expr);
    globalState.events.push({ type: 'infer', src: expr.src, value: type });
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

export const inferStmt = (tenv: Tenv, stmt: Stmt): { value: Type; scope?: Tenv['scope'] } => {
    switch (stmt.type) {
        case 'return': {
            const value = newTypeVar({ type: 'return-any', src: stmt.src });
            if (!tenv.scope['return']) {
                throw new Error(`cant return, we are not in a lambda`);
            }
            if (!stmt.value) {
                unify(tenv.scope['return'].body, { type: 'con', name: 'void' }, stmt.src, 'lambda return type', 'empty return');
                return { value };
            }
            const inner = inferExpr(tenv, stmt.value);
            unify(tenv.scope['return'].body, inner, stmt.src, 'lambda return type', 'return value');
            return { value };
        }
        case 'let': {
            const { pat, init, src } = stmt;
            stackPush(src, kwd('let'), ' ', hole(), ' = ', hole());
            stackBreak("'let' statement");
            if (pat.type === 'var') {
                stackReplace(src, kwd('let'), ' ', hole(true), ' = ', hole());
                const pv = newTypeVar({ type: 'pat-var', name: pat.name, src: pat.src });
                stackPush(pat.src, pat.name, ' -> ', typ(pv));
                stackBreak(`create a type variable for the name '${pat.name}'`);
                stackPop();
                stackReplace(src, kwd('let'), ' ', typ(pv), ' = ', hole());
                globalState.events.push({ type: 'infer', src: pat.src, value: pv });
                stackBreak(`create a type variable for the name '${pat.name}'`);
                stackReplace(src, kwd('let'), ' ', typ(pv), ' = ', hole(true));
                // globalState.events.push({ type: 'stack-push', value: { type: 'let', pat: pv } });
                const self = tenvWithScope(tenv, { [pat.name]: { body: pv, vars: [] } });
                const valueType = inferExpr(self, init);
                // stackReplace(src, typ(pv), ' -> ', typ(valueType));
                // stackBreak();
                unify(typeApply(globalState.subst, pv), valueType, stmt.src, `variable for '${pat.name}'`, `inferred type of value`);
                const appliedEnv = tenvApply(globalState.subst, tenv);
                stackPop();
                // globalState.events.push({ type: 'stack-pop' });
                // globalState.events.push({ type: 'infer', src: pat.src, value: valueType });
                return {
                    scope: { [pat.name]: init.type === 'lambda' ? generalize(appliedEnv, valueType) : { vars: [], body: valueType } },
                    value: { type: 'con', name: 'void' },
                };
            }
            console.error('not handling yet');
            let [type, scope] = inferPattern(tenv, pat);
            // globalState.events.push({ type: 'stack-push', value: { type: 'let', pat: type } });
            const valueType = inferExpr(tenvWithScope(tenv, scope), init);
            unify(typeApply(globalState.subst, type), valueType, stmt.src, `pattern type`, `inferred type of value`);
            scope = scopeApply(globalState.subst, scope);
            // globalState.events.push({ type: 'stack-pop' });
            stackPop();
            return { scope: scope, value: { type: 'con', name: 'void' } };
        }
        case 'expr':
            const value = inferExpr(tenv, stmt.expr);
            return { value: value };
        case 'for': {
            console.error('not stacking yet');
            const letter = inferStmt(tenv, stmt.init);
            const bound = letter.scope ? tenvWithScope(tenvApply(globalState.subst, tenv), letter.scope) : tenv;
            const upter = inferExpr(bound, stmt.cond);
            unify(upter, { type: 'con', name: 'bool' }, stmt.src, 'for loop condition', 'must be bool');
            const okk = inferExpr(bound, stmt.update);
            const body = inferExpr(bound, stmt.body);

            return { value: { type: 'con', name: 'void' } };
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

const commas = (v: StackText[]) => interleave(v, () => ', ');

export const inferExprInner = (tenv: Tenv, expr: Expr): Type => {
    switch (expr.type) {
        case 'prim':
            const t: Type = { type: 'con', name: expr.prim.type };
            stackPush(expr.src, kwd(expr.prim.value + ''), ' -> ', typ(t));
            stackBreak(`primitive constant`);
            stackPop();
            return t;
        case 'var':
            const got = tenv.scope[expr.name];
            if (!got) throw new Error(`variable not found in scope ${expr.name}`);
            if (got.vars.length) {
                stackPush(expr.src, kwd(expr.name), ' -> ', '<', ...got.vars.map((name) => typ({ type: 'var', name })), '>', typ(got.body));
            } else {
                stackPush(expr.src, kwd(expr.name), ' -> ', typ(got.body));
            }
            stackBreak('variable lookup');
            const inst = instantiate(got);
            if (got.vars.length) {
                stackReplace(expr.src, kwd(expr.name), ' -> ', typ(inst));
                stackBreak('create new variables for the type parameters');
            }
            stackPop();
            return inst;
        case 'str':
            stackPush(expr.src, kwd(JSON.stringify(expr.value)), ' -> ', typ({ type: 'con', name: 'string' }));
            stackBreak(`primitive constant`);
            stackPop();
            return { type: 'con', name: 'string' };
        case 'lambda': {
            if (!expr.args.length) {
                throw new Error(`cant have an empty lambda sry`);
            }
            const src = expr.src;
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
            stackPush(src, '(', ...commas(args.map(typ)), '): ', typ(returnVar), ' => ', hole());
            stackBreak('arrow function');
            stackReplace(src, '(', ...commas(args.map(typ)), '): ', typ(returnVar), ' => ', hole(true));

            const bodyType = inferExpr(boundEnv, expr.body);

            // This is unifying the inferred type of the lambda body
            // (which should be hoverable) with any `return` forms
            // we encountered.
            // IF `returnVar` has no substs, or IF bodyType is a
            // substless vbl, we can do this ~quietly.
            unify(bodyType, typeApply(globalState.subst, returnVar), expr.src, `inferred body type`, `lambda return type`);

            stackReplace(src, '(', ...commas(args.map(typ)), '): ', typ(returnVar), ' => ', typ(typeApply(globalState.subst, returnVar)));
            stackBreak('arrow function');
            stackPop();
            return tfns(
                args.map((arg) => typeApply(globalState.subst, arg)),
                typeApply(globalState.subst, returnVar),
                // bodyType.value ?? bodyType.return ?? { type: 'con', name: 'void' },
            );
        }

        case 'app': {
            // console.log(`app`, expr.args.length);
            // if (expr.args.length === 1) {
            const resultVar = newTypeVar({ type: 'apply-result', src: expr.src });
            globalState.events.push({ type: 'infer', src: expr.src, value: resultVar });
            const src = expr.src;

            stackPush(src, hole(), '(', ...commas(expr.args.map(() => hole())), ') -> ', typ(resultVar));
            stackBreak('function call');
            stackReplace(src, hole(true), '(', ...commas(expr.args.map(() => hole())), ') -> ', typ(resultVar));

            let targetType = inferExpr(tenv, expr.target);

            stackReplace(src, typ(typeApply(globalState.subst, targetType)), '(', ...commas(expr.args.map(() => hole())), ') -> ', typ(resultVar));
            stackBreak('function call');

            const argTenv = tenvApply(globalState.subst, tenv);

            const holes: StackText[] = [];
            for (let i = 0; i < expr.args.length; i++) {
                holes.push(hole());
            }

            let args: Type[] = [];
            for (let i = 0; i < expr.args.length; i++) {
                const mid = commas(args.map(typ).concat([hole(true), ...holes.slice(i + 1)]));
                stackReplace(src, typ(typeApply(globalState.subst, targetType)), '(', ...mid, ') -> ', typ(resultVar));
                const arg = expr.args[i];
                const got = inferExpr(argTenv, arg);
                args.push(got);
                const mid2 = commas(args.map(typ).concat(holes.slice(i + 1)));
                stackReplace(src, typ(typeApply(globalState.subst, targetType)), '(', ...mid2, ') -> ', typ(resultVar));
                stackBreak('argument #' + (i + 1));
            }

            // console.log(expr.target, targetType.value);
            // console.log('args', expr.args);
            unify(
                typeApply(globalState.subst, targetType),
                tfns(args, resultVar),
                expr.src,
                `function being called`,
                `arguments and result variable`,
            );
            stackPop();
            return typeApply(globalState.subst, resultVar);
            // }
            // if (!expr.args.length) return inferExpr(tenv, expr.target, );
            // const [one, ...rest] = expr.args;
            // return inferExpr(
            //     tenv,
            //     {
            //         type: 'app',
            //         target: { type: 'app', target: expr.target, args: [one], src: expr.src },
            //         args: rest,
            //         src: expr.src,
            //     },
            // );
        }

        case 'if': {
            const src = expr.src;
            // TODO: handle else
            stackPush(src, kwd('if'), '(', hole(), ') {', hole(), '}', ...(expr.no ? ['else {', hole(), ')'] : []));
            stackBreak('if conditional');
            stackReplace(src, kwd('if'), '(', hole(true), ') {', hole(), '}', ...(expr.no ? ['else {', hole(), ')'] : []));
            const cond = inferExpr(tenv, expr.cond);
            unify(cond, { type: 'con', name: 'bool' }, expr.cond.src, 'if condition', 'must be bool');
            stackReplace(
                src,
                kwd('if'),
                '(',
                typ(typeApply(globalState.subst, cond)),
                ') {',
                hole(),
                '}',
                ...(expr.no ? ['else {', hole(), ')'] : []),
            );
            stackBreak('if conditional');

            stackReplace(
                src,
                kwd('if'),
                '(',
                typ(typeApply(globalState.subst, cond)),
                ') {',
                hole(true),
                '}',
                ...(expr.no ? ['else {', hole(), ')'] : []),
            );
            const one = inferExpr(tenv, expr.yes);
            stackReplace(
                src,
                kwd('if'),
                '(',
                typ(typeApply(globalState.subst, cond)),
                ') {',
                typ(gtypeApply(one)),
                '}',
                ...(expr.no ? ['else {', hole(), ')'] : []),
            );
            stackBreak('if conditional');

            const two = expr.no ? inferExpr(tenv, expr.no) : undefined;
            const twov = two ? two : { type: 'con' as const, name: 'void' };
            unify(one, twov, expr.src, 'yes branch', 'else branch');

            stackPop();
            return one;
        }
        case 'block': {
            if (!expr.stmts.length) {
                return { type: 'con', name: 'void' };
            }
            let scope = {};
            let value: Type | null = null;
            for (let inner of expr.stmts) {
                const applied = tenvApply(globalState.subst, tenv);
                const res = inferStmt({ ...applied, scope: { ...applied.scope, ...scope } }, inner);
                if (res.scope) {
                    Object.assign(scope, res.scope);
                }
                value = res.value;
            }
            if (!value) throw new Error('how did we get here');
            return typeApply(globalState.subst, value);
        }
        // case 'Array': {
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
            globalState.events.push({ type: 'infer', src: pat.src, value: v });
            stackPush(pat.src, kwd(pat.name), ' -> ', typ(v));
            stackBreak(`Create type variable for declaration '${pat.name}'`);
            stackPop();
            return [v, { [pat.name]: { vars: [], body: v } }];
        }
        case 'con': {
            let [cargs, cres] = instantiateTcon(tenv, pat.name);

            if (cargs.length !== pat.args.length) throw new Error(`wrong number of arguments to type constructor ${pat.name}`);

            const scope: Tenv['scope'] = {};

            stackPush(pat.src, kwd(pat.name), ' -> ', typ({ type: 'fn', args: cargs, result: cres }));
            stackBreak('Type constructor lookup');

            for (let i = 0; i < pat.args.length; i++) {
                let sub = inferPattern(tenv, pat.args[i]);
                unify(cargs[i], sub[0], pat.src, `pattern type`, `type constructor arg ${i + 1}`);
                Object.assign(scope, sub[1]);
            }

            // const subPatterns = pat.args.map((arg) => inferPattern(tenv, arg));
            // const argTypes = subPatterns.map((s) => s[0]);
            // const scopes = subPatterns.map((s) => s[1]);
            // argTypes.forEach((arg, i) => unify(cargs[i], arg, pat.src, `pattern type`, `type constructor arg ${i + 1}`));
            cres = typeApply(globalState.subst, cres);
            // const scope = scopes.reduce((a, b) => ({ ...a, ...b }));
            stackPop();
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
