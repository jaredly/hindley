
So the basic procedure of Hindley Milner Type Inference is this:
1) we step through the code (the AST), and at each step, we create a type variable for each variable declaration we encounter.
2) And then when a variable is used, we unify the type of that variable with the expected type -- if it's being called as a function,
it should be a function, if it's the first argument to a function, it should be the type of that first argument.
3) The unification gives us a list of substitutions, which we then apply to everything we've seen so far.

And then it all magically works! If unification fails, then we have a type error. If, at the end of the algorithm,
we have any type variables left, then we have a generic function.






When we encounter a function call, we create a type variable for the return value of the function, and unify it with the type of the variable we're assigning it to.
When we encounter an operator, we unify the types of the two operands.
When we encounter a function definition, we create a type variable for the argument, and unify it with the type of the argument when we call the function.












Ok, so here we have the quicksort algorithm, in something that looks like typescript.
It's actually valid typescript, except for the fact that we're missing some annotations that the typscript algorithm requires, but which Hindley Milner can do just fine without.

Now you don't have to understand quicksort, I'm just using this as some code that's relatively small, but still  has some interesting inference going on.

What we're looking at is a "type inference stepping debugger" -- we can step through each "inference stack frame", to really see what's going on.

You can see we have a let statement and an arrow function, but the first thing that happens is we create a type variable for the name `quicksort` -- this is necessary because we're going to be calling quicksort recursively down on line [XYZ]. But we don't know anything about the type of quicksort, so it just gets the type variable `a`.

Now we have an arrow function, and we need to create a type variable for the argument `input`; again, we don't know anything about it yet, but as the algorithm goes along, we'll unify this type variable with whatever type this variable gets *used as*.

And here right away we have `input` being used; getting the `length` of this variable means it must be an `Array`, although we don't know anything about the contents yet, so make the type variable `f`.

This `return` statement gives us our first information about what the return value of the function is; it's whatever `input` is! We still don't know the type of the contents of the array, so we still have the type variable `f` there.

This `pivot` variable ends up being our variable `f` as well; we still don't know what it is.
In fact, we don't get information about the pivot until we get to this `<=` operator down on line [XYZ]. Because this operator requires integers on both sides, that means that both the [ith] element of input and the pivot need to be integers, and we know that both our input array and the output array are arrays of integers.

When we get down to line [x] and line [y], we determine that both `leftArr` and `rightArr` as arrays of integers as well, which works out great when we need to call `quicksort` recursively with each of them.

It's this recursive usage of `quicksort` that first nails down our type variable `a`, and the fact that the result is `...spread` into an array with the integer `pivot` means the return value must be an array of integers. Which, at the end of it all, agrees with our return statement up on line [3].


[that's 2 minutes! not too bad.]


----

Notes:
- need line numbers, for talking to people
