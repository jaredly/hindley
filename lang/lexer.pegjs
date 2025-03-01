
Node = Collection / Id / Text

Id = [a-zA-Z0-9]+

Text = "\"" [^"]+ "\""

TextSpan = "${" Node "}"
