//! Dump this grammar's parse of each file (paths on stdin), one line per
//! declaration, like script/dump-xpidl-py.py does xpidl.py's, for
//! script/compare-with-xpidl-py.sh.
use std::io::Read;

fn text<'a>(n: tree_sitter::Node, src: &'a str) -> &'a str {
    n.utf8_text(src.as_bytes()).unwrap()
}

fn field<'a>(n: tree_sitter::Node, name: &str, src: &'a str) -> &'a str {
    n.child_by_field_name(name).map(|c| text(c, src)).unwrap_or("")
}

fn main() {
    let mut paths = String::new();
    std::io::stdin().read_to_string(&mut paths).unwrap();
    let mut parser = tree_sitter::Parser::new();
    parser.set_language(&tree_sitter_xpidl::LANGUAGE.into()).unwrap();
    for path in paths.split_whitespace() {
        let src = std::fs::read_to_string(path).unwrap();
        let tree = parser.parse(&src, None).unwrap();
        let root = tree.root_node();
        if root.has_error() {
            println!("{}\tERROR", path);
        }
        let mut c = root.walk();
        for d in root.named_children(&mut c) {
            match d.kind() {
                "interface_definition" => {
                    let name = field(d, "name", &src);
                    match d.child_by_field_name("body") {
                        None => println!("{}\tforward\t%\t{}", path, name),
                        Some(body) => {
                            println!("{}\tinterface\t%\t{}\t{}", path, name, field(d, "base", &src));
                            let mut bc = body.walk();
                            for m in body.named_children(&mut bc) {
                                match m.kind() {
                                    "code_block" => println!("{}\tcode\t{}\t", path, name),
                                    "constant" => println!("{}\tconst\t{}\t{}", path, name, field(m, "name", &src)),
                                    "cenum" => {
                                        let mut vc = m.walk();
                                        let n = m.named_children(&mut vc).filter(|v| v.kind() == "cenum_variant").count();
                                        println!("{}\tcenum\t{}\t{}\t{}", path, name, field(m, "name", &src), n)
                                    }
                                    "attribute_declaration" => {
                                        let mut ac = m.walk();
                                        let readonly = m.children(&mut ac).any(|x| x.kind() == "readonly");
                                        println!("{}\tattribute\t{}\t{}\t{}", path, name, field(m, "name", &src), if readonly { "readonly" } else { "" })
                                    }
                                    "method" => {
                                        let params = m.child_by_field_name("parameters").unwrap();
                                        let mut pc = params.walk();
                                        let n = params.named_children(&mut pc).filter(|p| p.kind() == "parameter").count();
                                        println!("{}\tmethod\t{}\t{}\t{}", path, name, field(m, "name", &src), n)
                                    }
                                    "comment" => {}
                                    other => println!("{}\t{}\t{}\t?", path, other, name),
                                }
                            }
                        }
                    }
                }
                "typedef" => println!("{}\ttypedef\t%\t{}", path, field(d, "name", &src)),
                "native" => println!("{}\tnative\t%\t{}", path, field(d, "name", &src)),
                "webidl" => println!("{}\twebidl\t%\t{}", path, field(d, "name", &src)),
                "include" => println!("{}\tinclude\t%\t{}", path, field(d, "path", &src).trim_matches('"')),
                "code_block" => println!("{}\tcode\t%\t", path),
                "comment" => {}
                other => println!("{}\t{}\t%\t?", path, other),
            }
        }
    }
}
