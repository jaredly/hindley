






more powerful, because it supports a bunch of really complex types, and less
powerful because it requires you to annotate a bunch of things in order for the algorithm
to work, whereas Hindley Milner can infer everything.

Table of comparison:

- TypeScript requires you to annotate an empty array
- TypeScript requires you to annotate the arguments of every function,
  and the return types of some functions
- TypeScript has "untagged unions", e.g. (string | number), whereas
  Hindley Milner requires tagged unions, e.g. { type: "string", value: string } | { type: "number", value: number }

| More powerful     | Less powerful |
|-------------------|---------------|
| untagged unions   | requires annotations on:
| (string | number) | - fn args
| (Person | null)   | - some fn return types
|-------------------| - some variable declarations
| Interfaces
| Classes
| It's turing complete...
| [DOOM in TS]
|-------------------|---------------|
| 27kloc of checker | 200loc        |
