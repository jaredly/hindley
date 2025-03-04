
# Full Algw local

- [x] algw-s2 ported to ts
- [x] most of parsing is great
- [ ] lexer needs to handle tables
- [ ] parser needs to do switch and tables


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
