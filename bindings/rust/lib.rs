//! XPIDL (Mozilla's XPCOM interface definition language) for the
//! [tree-sitter][] parsing library.  See the README.
//!
//! ```
//! let code = r#"
//! #include "nsISupports.idl"
//!
//! [scriptable, uuid(a88e5a60-205a-4bb1-94e1-2628daf51eae)]
//! interface nsIFoo : nsISupports {
//!   readonly attribute AString name;
//!   void go(in unsigned long aCount, [optional] in nsIFoo aOther);
//! };
//! "#;
//! let mut parser = tree_sitter::Parser::new();
//! parser
//!     .set_language(&tree_sitter_xpidl::LANGUAGE.into())
//!     .expect("Error loading the XPIDL grammar");
//! let tree = parser.parse(code, None).unwrap();
//! assert!(!tree.root_node().has_error());
//! ```
//!
//! [tree-sitter]: https://tree-sitter.github.io/

use tree_sitter_language::LanguageFn;

extern "C" {
    fn tree_sitter_xpidl() -> *const ();
}

/// The tree-sitter [`LanguageFn`][LanguageFn] for this grammar.
///
/// [LanguageFn]: https://docs.rs/tree-sitter-language/*/tree_sitter_language/struct.LanguageFn.html
pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_xpidl) };

/// The content of the [`node-types.json`][] file for this grammar.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types
pub const NODE_TYPES: &str = include_str!("../../src/node-types.json");

#[cfg(test)]
mod tests {
    #[test]
    fn test_can_load_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE.into())
            .expect("Error loading the XPIDL grammar");
    }
}
