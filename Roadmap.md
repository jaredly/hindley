

How to make HMX make more sense?

- [x] the `bool` constraint is dumb
- [x] app should just be eq


# For the walkthrough

- first: highlight each ~node in sequence to indicate that we're doing a single pass
- then: at each step, have each node highlighted with what its currently evaluated type is (color coded maybe for int vs bool vs tuple vs function)
- on the righthand side, have the substitution list visible
  - when a new thing is added to the substitution list, highlight everything that changes in the current substitution list, as well as everything that changes in the evaluated types.
    - maybe show changes in "inferred type for a node" with a tooltip?


# Full Algw local

- [x] algw-s2 ported to ts
- [x] most of parsing is great
- [x] lexer needs to handle tables
- [x] parser needs to do switch and tables
- [ ] ifs?
- [ ] typedefs?

- [ ] exhaustiveness checkings


So,
I could have a ... 'implicit state arg' thats just a silent addition to every function definition.
...
orrrr we could say, it only applies to toplevel functions.
so if you're doing inner functions, they access the 'state' of the outer function?
would that be weird?

so there would be a 'getstate' primitive, and a 'setstate' primitive.
and it would be threaded through.

hm in order to be ~quite safe, or rather in order to eliminate 'action at a distance', I would need to do some kind of linearity thing.

```js
const incer = () => {
  return () => setState(getState() + 1)
}

const inc = withState(0, incer())

const a = inc()
const b = inc()
```

Ok so the "inner lambdas use the outer state" is feeling like very bad news.

THEREFORE:

all functions have an extra first parameter, and return an extra value.

It can be a straight macro modification to the parse dealio. type inference doesn't have to change I'm pretty sure

toplevel items have implicit `state` of type `unit`.

that would be very interesting to program in.

#

Lexer
- [x] ids
- [x] basic lists
- [x] basic strings with embeds
Maybe not
- [ ] tables
- [ ] rich text
- [ ] jsx


Ok, now that lexing is done...
...we need to make the basic js-- parser, right?

- [x] lex it up
- [x] parse to js--
- [x] eval js--
- [ ] ... make nontrivial programs in js--? like ... a parser?
  not sure how I feel about that, if we're in a world without ide amenities.
  I'd want to make like an AST inspector or something, right?
  hmm.
  ok ultimately I want to implement HM(x) or Algorithm W in js, or js--, or js++.

  ok new, less bootstrappy plan:
  - let's make js++
    - ADTs
    - very nice pattern matching
    - and maybe macros too?
  - then we implement HM in that.
  annnd maybe we do it in the j3 IDE?
  hm.

  ok new new plan.
  first we implement algorithm w and maybe j and also HM(x).
  then we evaluate what we need in order to tell the story.









basic lex idea:

parent.children, has IDs and also blanks.
If the last one is a blank, that means it's a placeholder spot.
if it's not a blank, you need to smoosh.

yeah that seems like a winning strategy


----

thinking about .... getting a basic language working.
is that useful? necessary? interesting?
...
should I do a lexer?

I could just bundle up the keyHandlers from j3.



---- notes from keep ----

Decoding the mathematical format, here's what it looks like in typescript
Getting some intuition about how the algorithm comes together.
Maybe doing a naive thing and showing where it breaks down?
Here are all languages that have this as the basis; koka, elm, roc, gleam


Compare typescript
More powerful but less safe

- how much inferred? (Some return values, some local variables)/(Everything)
- is there subtyping? (Yes/no)
- is there an "any" type
- algebraic data types
- rich pattern matching


One thing that makes these papers hard to understand is they often make substitutions to make the math cleaner, but the code more confusing. Instead of a function type, they do multiple type application.

Typescript implementation loc
Vs this one
