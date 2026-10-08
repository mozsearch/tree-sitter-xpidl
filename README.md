# tree-sitter-xpidl

A [tree-sitter](https://tree-sitter.github.io/) grammar for XPIDL, the
interface definition language of Mozilla's XPCOM (`.idl` files listed in
`moz.build` files' `XPIDL_SOURCES`), for [searchfox](https://searchfox.org)'s
history tokenizer.

The authoritative definition of XPIDL is its parser in mozilla-central,
[xpcom/idl-parser/xpidl/xpidl.py](https://searchfox.org/mozilla-central/source/xpcom/idl-parser/xpidl/xpidl.py)
(a [PLY](https://www.dabeaz.com/ply/) lexer and parser), which this grammar
follows (`grammar.js` notes the names of its lexer rules and productions), along
with [xpcom/docs/xpidl.md](https://searchfox.org/mozilla-central/source/xpcom/docs/xpidl.md).

## The syntax tree

- `include`: `#include "nsISupports.idl"`.
- `code_block`: `%{C++ ... %}`, C++ passed through to the generated header
  (`code_text`).
- `interface_definition`: `[scriptable, uuid(...)] interface nsIFoo :
  nsISupports { ... };`, with an `attribute_list`, `name`, `base`, and
  `body` (`interface_body`), or without a body, a forward declaration
  (`interface nsIFoo;`).  Its members:
  - `constant`: `const unsigned long FOO = 1 << 2;` (values are `number`s,
    `identifier`s, and `unary_expression`s, `binary_expression`s, and
    `parenthesized_number`s of them);
  - `cenum`: `cenum Mode : 8 { MODE_A, MODE_B = 4 };` (`cenum_variant`s);
  - `attribute_declaration`: `[infallible] readonly attribute AString name;`;
  - `method`: `void go(in unsigned long aCount, [optional] out nsIFoo aFoo)
    raises (NS_ERROR_FAILURE);` (`parameter_list`, `parameter`s with
    `direction`s, `raises`);
  - `code_block`.
- `typedef`: `typedef unsigned long long PRUint64;`.
- `native`: `[ref] native nsNativeFoo(nsFoo*);`, whose C++ type is a
  `native_type` (anything but parentheses, with at most one parenthesized
  part, ex: `std::function<void(int)>`).
- `webidl`: `webidl Document;`.
- Types: `primitive_type` (xpidl.py's multiple-word types, ex: `unsigned long
  long`), `type_identifier`, and `generic_type` (`Array<nsIFoo>`).
- `comment`: `//` and `/* */` (`/** */` ones are documentation).

## Historical syntax

For parsing files' histories (searchfox's history goes back to 1998), the
grammar also has syntax that older versions of XPIDL had, which xpidl.py
doesn't:
- `dictionary`: `dictionary FooInit : EventInit { DOMString name = "foo"; };`
  (`dictionary_member`s; ~2011-2013, for generated C++ dictionary helpers).
- `preprocessor_line`: C preprocessor lines, which the libIDL-based xpidl
  passed through cpp (ex: `#ifndef nsIFoo_h__`, `#include <olectl.h>`), and
  lines left by the build's preprocessor (ex: `# ***** BEGIN LICENSE BLOCK`),
  as extras.
- `%{` without `C++`, and interface bodies without semicolons after them.

Of the 3648 .idl files ever added to mozilla-central (as first added), those
that are XPIDL parse, except for some of the earliest (ex: the pre-2001 DOM IDL
in dom/public/idl, and parameters without directions).

## Checking it against xpidl.py

`script/compare-with-xpidl-py.sh MOZILLA_CENTRAL` parses a mozilla-central
checkout's XPIDL files with xpidl.py and with this grammar, and diffs one line
per declaration (kind, interface, name, and ex: methods' parameter counts).  On
2026-10-08's mozilla-central (866 files, 14793 declarations), they're
identical, and this grammar parses every file without errors.

(Other `.idl` files in mozilla-central aren't XPIDL: ex: web-platform-tests'
and Khronos' WebIDL, and Microsoft MIDL in other-licenses/ia2.)

## Building

The generated parser (`src/parser.c`, `src/grammar.json`,
`src/node-types.json`, `src/tree_sitter/`) is committed, so the Rust crate
builds without node.  To regenerate it after changing `grammar.js`:

```sh
npm ci --ignore-scripts
# (The CLI's install script downloads its binary.)
(cd node_modules/tree-sitter-cli && node install.js)
npx tree-sitter generate
npx tree-sitter test
cargo test
```
