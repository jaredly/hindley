/**
 * Lex text into the CST
 */

import { ListKind, NodeID, RecNodeT } from './nodes';

export const lisp = {
    punct: [';', '.', '@', '=#+'],
    space: '',
    sep: ' \n',
    tableCol: ' :',
    tableRow: '\n',
    tableNew: ':',
} satisfies Config;

export const js = {
    // punct: [],
    // so js's default is just 'everything for itself'
    // tight: [...'~`!@#$%^&*_+-=\\./?:'],
    // punct: '~`!@#$%^&*_+-=\\./?:',
    punct: ['.', '/', '~`!@#$%^&*+-=\\/?:><'],
    space: ' ',
    sep: ',;\n',
    tableCol: ',:',
    tableRow: ';\n',
    tableNew: ':',
    xml: true,
} satisfies Config;

export type Config = {
    punct: string[];
    space: string;
    sep: string;
    xml?: boolean;
    tableCol: string;
    tableRow: string;
    tableNew: string;
};

type Pos = { start: number; end: number };

export type Kind = number | 'space' | 'sep' | 'string'; // | 'bar';

export const textKind = (grem: string, config: Config): Kind => {
    if (grem === '"') return 'string';
    if (config.sep.includes(grem)) return 'sep';
    if (config.space.includes(grem)) return 'space';
    return charClass(grem, config);
};

export const charClass = (grem: string, config: Config): number => {
    for (let i = 0; i < config.punct.length; i++) {
        if (config.punct[i].includes(grem)) {
            return i + 1;
        }
    }
    return 0; // 0 is the class for text
};

export const lex = (config: Config, input: string, i: number, dest: RecNodeT<Pos>[]) => {
    if (i >= input.length) return;

    const char = input[i];

    const wrap = wrapKind(char);
    if (wrap) {
        const loc: Pos = { start: i, end: i };
        const lst: RecNodeT<Pos> = { type: 'list', kind: wrap, children: [], loc };
        // ugh
    }

    const kind = textKind(char, config);

    switch (kind) {
        case 'string':
    }
};

export const wrapKind = (key: string): ListKind<any> | void => {
    switch (key) {
        case '(':
            return 'round';
        case '{':
            return 'curly';
        case '[':
            return 'square';
        // case '<':
        //     return 'angle';
    }
};

export const closerKind = (key: string): ListKind<any> | void => {
    switch (key) {
        case ')':
            return 'round';
        case '}':
            return 'curly';
        case ']':
            return 'square';
        // case '<':
        //     return 'angle';
    }
};

// export const keyUpdate = (state: TestState, key: string, mods: Mods, visual?: Visual, config: Config = js): KeyAction[] | void => {
//     } else if (wrapKind(key)) {
//         return handleWrap(state, key);
//     } else if (closerKind(key)) {
//         return handleClose(state, key);
//     } else {
//         // TODO ctrl-enter, need to pipe it in
//         return handleKey(state, key, config, mods);
//     }
// };
