
Ok, so here we have the quicksort algorithm, in something that looks like typescript.
It's actually valid typescript, except for the fact that we're missing some annotations that the typscript algorithm requires, but which Hindley Milner can do just fine without.

Now you don't have to understand quicksort, I'm just using this as some code that's relatively small, but still  has some interesting inference going on.

Here we have a "type inference stepping debugger" -- we can step through each "inference stack frame", to really see what's going on.

You can see we have a let statement and an arrow function, but the first thing that happens is we create a type variable for the name `quicksort` -- this is necessary because we're going to be calling quicksort recursively down on line [XYZ]. But we don't know anything about the type of quicksort, so it just gets the type variable `a`.

Now we have an arrow function, and we need to create a type variable for the argument `arr`; again, we don't know anything about it yet, but as the algorithm goes along, we'll unify this type variable with whatever type this variable gets *used as*.

And here right away we have `arr` being used; getting the `length` of this variable means it must be an `Array`, although we don't know anything about the context. No matter, we have another type variable for that.

This `return` statement gives us our first information about what the return value of the function is; it's whatever `arr` is! We still don't know the type of the contents of the array, so we still have the type variable `f` there.

This `pivot` variable ends up being our variable `f` as well; we still don't know what it is.
In fact, we don't get information about the pivot until we get to this `<=` operator down on line [XYZ]. Because this operator requires integers on both sides, that means that both the [ith] element of arr and the pivot need to be integers, and we know that both our input array and the output array are arrays of integers.

When we get down to line [x] and line [y], we determine that both `leftArr` and `rightArr` as arrays of integers as well, which works out great when we need to call `quicksort` recursively with each of them.

It's this recursive usage of `quicksort` that first nails down our type variable `a`, and the fact that the result is `...spread` into an array with the integer `pivot` means the return value must be an array of integers. Which, at the end of it all, agrees with our return statement up on line [3].



----

Notes:
- need line numbers, for talking to people
