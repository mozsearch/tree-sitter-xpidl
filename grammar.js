/**
 * XPIDL, Mozilla's XPCOM interface definition language, after the
 * authoritative parser, xpcom/idl-parser/xpidl/xpidl.py in mozilla-central
 * (its `IDLParser`'s lexer and productions, whose names are noted below), and
 * xpcom/docs/xpidl.md, plus syntax which older versions of XPIDL had (noted as
 * historical), for parsing files' histories.  See the README.
 */

const PREC = {
  OR: 1,
  SHIFT: 2,
  ADD: 3,
  MULTIPLY: 4,
  UNARY: 5,
};

module.exports = grammar({
  name: 'xpidl',

  extras: $ => [/\s/, $.comment, $.preprocessor_line],

  word: $ => $.identifier,

  rules: {
    // `idlfile`, `productions`
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.code_block,
      $.include,
      $.interface_definition,
      $.typedef,
      $.native,
      $.webidl,
      $.dictionary,
    ),

    // `t_INCLUDE`: `#include "nsISupports.idl"`.  (xpidl.py rejects other
    // directives.)
    include: $ => seq('#include', field('path', $.string_literal)),
    string_literal: _ => /"[^"\n]*"/,

    // `t_LCDATA`: C++ passed through to the generated header.
    // (Historically, the `C++` was optional.  The delimiters are aliased, so
    // that they're in trees: unnamed `token(...)`s aren't.)
    code_block: $ => seq(
      alias(token(seq('%{', optional(seq(/[ \t]*/, 'C++')))), '%{'),
      optional($.code_text),
      alias(token(seq('%}', optional(seq(/[ \t]*/, 'C++')))), '%}'),
    ),
    // (Everything up to the `%}`.)
    code_text: _ => token(prec(-1, /([^%]|%[^}])+/)),

    // `typedef`
    typedef: $ => seq(
      optional($.attribute_list),
      'typedef',
      field('type', $._type),
      field('name', $.identifier),
      ';',
    ),

    // `native`: `native nsNativeFoo(nsFoo*);`, whose C++ type is
    // `t_nativeid_NATIVEID`: anything but parentheses up to the `)`, with at
    // most one parenthesized part (ex: `std::function<void(int)>`).
    native: $ => seq(
      optional($.attribute_list),
      'native',
      field('name', $.identifier),
      '(',
      field('type', $.native_type),
      ')',
      ';',
    ),
    native_type: _ => /[^()\n]+(\([^()\n]+\)[^()\n]+)?/,

    // `webidl`: `webidl Document;`
    webidl: $ => seq('webidl', field('name', $.identifier), ';'),

    // `attributes`, `attlist`, `attribute`, `attributeval`: `[scriptable,
    // uuid(...)]`, `[array, size_is(aCount)]`.  (Their names can be `const`.)
    attribute_list: $ => seq('[', commaSep1($.attribute), ']'),
    attribute: $ => seq(
      field('name', choice($.identifier, alias('const', $.identifier))),
      optional(seq('(', field('value', choice($.identifier, $.uuid)), ')')),
    ),
    // `t_IID`
    uuid: _ => /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/,

    // `interface`, `ifacebase`, `ifacebody`: without a body, a forward
    // declaration.
    interface_definition: $ => seq(
      optional($.attribute_list),
      'interface',
      field('name', $.identifier),
      optional(seq(':', field('base', $.identifier))),
      // (Historically, a body didn't need a semicolon after it.)
      choice(seq(field('body', $.interface_body), optional(';')), ';'),
    ),
    interface_body: $ => seq('{', repeat($._member), '}'),

    // `members`, `member`
    _member: $ => choice(
      $.code_block,
      $.constant,
      $.cenum,
      $.attribute_declaration,
      $.method,
    ),

    constant: $ => seq(
      'const',
      field('type', $._type),
      field('name', $.identifier),
      '=',
      field('value', $._number),
      ';',
    ),

    // `cenum Foo : 8 { A, B = 2 };` (`variants` can end with a comma.)
    cenum: $ => seq(
      'cenum',
      field('name', $.identifier),
      ':',
      field('size', $.number),
      '{',
      optional(seq(commaSep1($.cenum_variant), optional(','))),
      '}',
      ';',
    ),
    cenum_variant: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('value', $._number))),
    ),

    // `optreadonly ATTRIBUTE`
    attribute_declaration: $ => seq(
      optional($.attribute_list),
      optional('readonly'),
      'attribute',
      field('type', $._type),
      field('name', $.identifier),
      ';',
    ),

    method: $ => seq(
      optional($.attribute_list),
      field('type', $._type),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional($.raises),
      ';',
    ),
    parameter_list: $ => seq('(', commaSep($.parameter), ')'),
    // `param`, `paramtype`
    parameter: $ => seq(
      optional($.attribute_list),
      field('direction', choice('in', 'out', 'inout')),
      field('type', $._type),
      field('name', $.identifier),
    ),
    raises: $ => seq('raises', '(', commaSep1($.identifier), ')'),

    // `type`, `typelist`: `nsIFoo`, `unsigned long`, `Array<nsIFoo>`.
    _type: $ => choice($.primitive_type, $._type_identifier, $.generic_type),
    // (`t_IDENTIFIER`'s multiple-word types.)
    primitive_type: _ => token(prec(1, choice(
      'unsigned long long',
      'unsigned short',
      'unsigned long',
      'long long',
    ))),
    _type_identifier: $ => alias($.identifier, $.type_identifier),
    generic_type: $ => seq(
      field('name', $._type_identifier),
      '<',
      commaSep1($._type),
      '>',
    ),

    // `number`
    _number: $ => choice(
      $.number,
      $.identifier,
      $.parenthesized_number,
      $.unary_expression,
      $.binary_expression,
    ),
    // `t_NUMBER`, `t_HEXNUM`
    number: _ => token(choice(/\d+/, /0x[a-fA-F0-9]+/)),
    parenthesized_number: $ => seq('(', $._number, ')'),
    unary_expression: $ => prec(PREC.UNARY, seq('-', $._number)),
    binary_expression: $ => choice(
      ...[
        ['|', PREC.OR],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
      ].map(([operator, precedence]) => prec.left(precedence, seq(
        field('left', $._number),
        field('operator', operator),
        field('right', $._number),
      ))),
    ),

    // Historical: XPIDL dictionaries (ex: `dictionary FooInit : EventInit {
    // DOMString name; };`, ~2011-2013), for generated C++ dictionary helpers.
    dictionary: $ => seq(
      optional($.attribute_list),
      'dictionary',
      field('name', $.identifier),
      optional(seq(':', field('base', $.identifier))),
      '{',
      repeat($.dictionary_member),
      '}',
      optional(';'),
    ),
    dictionary_member: $ => seq(
      optional($.attribute_list),
      field('type', $._type),
      field('name', $.identifier),
      optional(seq('=', field('default', choice($._number, $.string_literal)))),
      ';',
    ),

    // Historical: C preprocessor lines, which the libIDL-based xpidl (before
    // xpidl.py) passed through cpp (ex: `#ifndef nsIFoo_h__`), and lines left
    // by the build's preprocessor (ex: `# ***** BEGIN LICENSE BLOCK`), but not
    // `#include "..."`, an `include`.
    preprocessor_line: _ => token(seq('#', choice(
      seq(/[ \t]+/, /[^\n]*/),
      seq(
        choice('if', 'ifdef', 'ifndef', 'else', 'elif', 'endif', 'define', 'undef',
          'pragma', 'error', 'filter', 'unfilter', 'expand', 'literal'),
        optional(seq(/[ \t]/, /[^\n]*/)),
      ),
      seq('include', /[ \t]*/, '<', /[^\n]*/),
    ))),

    // `t_IDENTIFIER`
    identifier: _ => /_?[A-Za-z][A-Za-z_0-9]*/,

    // `t_multilinecomment` (`/**` ones are documentation),
    // `t_singlelinecomment`
    comment: _ => token(choice(
      seq('//', /[^\n]*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),
  },
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
