
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
