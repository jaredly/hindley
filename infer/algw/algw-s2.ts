// Based on https://compiler.jaredforsyth.com/algw-s2

type Prim = { type: 'int'; value: number } | { type: 'bool'; value: boolean };
type Top =
    | { type: 'def'; name: string; body: Expr }
    | { type: 'expr'; expr: Expr }
    | { type: 'deftype'; name: string; args: string[]; constructors: { name: string; args: Type[] }[] }
    | { type: 'typealias'; name: string; args: string[]; alias: Type };
type Expr =
    | { type: 'prim'; prim: Prim }
    | { type: 'var'; name: string }
    | { type: 'str'; value: string }
    | { type: 'lambda'; args: Pat[]; body: Expr }
    | { type: 'app'; target: Expr; args: Expr[] }
    | { type: 'let'; vbls: { pat: Pat; init: Expr }[]; body: Expr }
    | { type: 'match'; target: Expr; cases: { pat: Pat; body: Expr }[] };
type Pat =
    | { type: 'any' }
    | { type: 'var'; name: string }
    | { type: 'con'; name: string; args: Pat[] }
    | { type: 'str'; value: string }
    | { type: 'prim'; prim: Prim };
type Type = { type: 'var'; name: string } | { type: 'app'; target: Type; arg: Type } | { type: 'con'; name: string };

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

const unify = (one: Type, two: Type) => {
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
