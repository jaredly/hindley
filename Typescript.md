
Typescript vs Hindley Milner

How much is inferred?

return values (mostly)     | everything
local variables (mostly)   |
---------------------------+-----------

Is there subtyping?

yes | no
----+---

How "safe"?

(any types abound) | 100% no type errors possible
(make illegal states unrepresentable)
-------------------+-----------------------------

Algebraic Data Types?

kinda (tagged unions) | enums, (named) tuples
----------------------+----------------------

Pattern matching?

not really | yes thanks
-----------+-----------







-

Things typescript doesn't infer:

let x = []; // whatt
