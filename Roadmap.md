
iffff valueNull, what if I just make a variable for it?

- [ ] instead of tracking a /return/, just have a `return` in scope.


# Hm sidebar

- [ ] highlight the thing we just inferred for the `infer` event.
- [x] I need a "unify" event, folks.
      so NOT actually a "subst" event, that'll be .. a subset of it? Because I want to
      collect all of the substs coming from a given unification.
- [ ] honestly I want highlights for every event.
      for example, the unify event, I want to highlight thing things the types are coming from.

- [x] remove vnames, have type variables have pedigree
- [ ] types need a .src
- [ ] the "variables" list should, on hover, highlight all the places where the variable is being used?
  and maybe have a popover of the inferred types for each expression?
- [ ] due to macro-ing, a given span could have a number of expressions associated with it.
  I should give expressions unique IDs, so I can know what is a "duplicate" span declaration...
  or I can just accept that there aren't going to be duplicates? but I do need a way to associate
  a given thing with the right thing.


# Instead of SUBST

just show:
- types with type variables, and all declared variables. (from scopeee)
- the latest subst
- now, animate it!

- [x] ALSO report the latest event, like what just got inferred.


#

Ok, so let's make `return` work!
How do we do it?

it only is relevant in a block
anddddd

lol ok.
so
this is complicated.
IF an `if` is being used as an `expr`, then the `values` of the arms need to match.
BUT if it's being used as a stmt, then they don't.

#

ok, so
I want to do a border wrap around nodes, and collections of nodes.
And I also want to do a tooltip, or maybe have a thing underneath it? not sure yet.


#

Ok now let's do a visualization.

- I've loaded up 'merge sort' into js-- in the j3 playground
- but actually I probably want to make custom UI for the stuff here.

#

Ok, let's talk about multiple static dispatch.
the way koka does it is totally unacceptable.
It can't figure out
```koka
fun i/ok(x) { x + 2 }
fun s/ok(x) { x ++ "hi" }
fun please(x) {
  ok(x) + 2
}
```

even though HM inference is all about being able to incorporate info from the whole thing at once,
not needing hints to be delivered in a "certain order".

First idea:
- if you run into an identifier that is ambiguous, just make a new type variable, and add it to a map for bookeeping.
  after inferring the whole term, check that map, and then do resolution with all of the information you've gathered.
  weakness: this still has the capacity to "fail" with a "this is ambiugous" message.

Enhancement:
- if you end up with ambiguity: add an implicit parameter to the function. yay it's like typeclasses, kinda.
  if there are multiple, what do we do? idk.
  also, implicit parameters means we need non-currying, right? I'm pretty sure that's what it means.

Enhancement:
- just so it's not totally wild west, what if we require that multi-dispatch-ers be declared?

```
multi length <a>(self: a) -> int

multi + <a>(left: a, right: a) -> a

multi str <a>(self: a) -> string

multi fmt <a>(self: a, f: Formatter) -> Result<(), Error>

multi index <self, idx, output>(self: self, idx: idx) -> output

multi default <self>() -> self

let arr/index: <v>(self: array<v>, idx: number): v -> ...
```

I need to figure out if ... arr/index will unify with index ... under normal rules.
seems like maybe it ought to?


howww do I feel about /grouping/ multis?
hmm. it does seem like a good idea.

```
multi algebra <a>{
  + (a, a) -> a
  - (a, a) -> a
}
multi monad <a * -> *>{
  pure <m>(value: m) -> a<m>
  map <m, n>(value: a<m>, f: m -> n) -> a<n>
}
```

Ok, so: for int vs float literals...
we'd do the same thing, right?
assign type variables to each, and let them resolve how they will...
and then at the end, if there are any unbound, we bind them to `int` as the default.
we'd want to do that before we do the `multi` resolution.





#

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
