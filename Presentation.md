
1) Hello, intro slide

2) A type inference algorithm is this: (left side, no annotations) -> (right side, annotations)
Also gives us type errors, if there's something that can't be reconciled.

3) TypeScript has an inference algorithm, but it's both more and less powerful;
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

4) The basic procedure of Hindley Milner Type Inference is this:

  1) we step through the code (the AST), and at each step, we create a type variable for each declaration we encounter.
  2) And then when a variable is used, we unify the type of that variable with the expected type -- if it's being called as a function, it should be a function, if it's the first argument to a function, it should be the type of that first argument.
  3) The unification gives us a list of substitutions, which we then apply to everything we've seen so far.

  And then it all magically works! If unification fails, then we have a type error. If, at the end of the algorithm, we have any type variables left, then we have a generic function.

5) Let's look at some unification examples:

MATH ALERT if you look at the wikipedia page for Hindley Milner, you'll see these scary math symbols.
Here's what they mean:

6) Ok now let's look at a real piece of code: this is the quicksort algorithm:



----------

Ok, so with 5 minutes, I have like 5 slides?

- An intro slide -- comparing vs the typescript inference algorithm.

a slide "This [algorithm] has been modified from its original version. it has been modified to fit your [typescript]"
I know I'm dating myself with this one. Are there any VHS appreciators in the audience?

- A slide about the math? "demystifying the math"
  -> tying each image into my little animation doohickey

- A slide about unification, with an interactive demo
  -> what are the gnarly types I want to unify?
  ok I want like a couple of demos.
  1: left: a              | right: int
  2: left: array(a)       | right: array(int)
  3: left: (a, bool) => c | right: (int, d) => (m, n)



THE ALGORITHM

Show the syntax
then have a little thing underneath it with the syntax sugar; "ive taken a few liberties with the syntax"
- a.b(c) -> b(a, c)
- a[b]   -> index(a, b)






- A slide about the algorithm, walking through
  some sample function.
  fib doesn't seem powerful enough,
  quicksort seems a little too complex
  - I want to demo ... discovering a function type
  - and discovering the item type of an array
  - ALSOoo maybe demo a unification error?
  - maybeeee let polymorphism.... but probably not?
