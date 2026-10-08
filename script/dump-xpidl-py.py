# Dump xpcom/idl-parser/xpidl/xpidl.py's parse of each file (paths on stdin,
# relative to the mozilla-central checkout that is the cwd), one line per
# declaration, like examples/dump.rs does this grammar's.
import sys, os
fx = os.getcwd()
sys.path.insert(0, os.path.join(fx, 'xpcom/idl-parser'))
sys.path.insert(0, os.path.join(fx, 'third_party/python/ply'))
from xpidl import xpidl

parser = xpidl.IDLParser()
for path in sys.stdin.read().split():
    try:
        idl = parser.parse(open(path).read(), filename=path)
    except Exception as e:
        print(f"{path}\tFAILED\t{type(e).__name__}: {str(e)[:100]}")
        continue
    for p in idl.productions:
        kind = type(p).__name__
        if kind == 'Interface':
            print(f"{path}\tinterface\t%\t{p.name}\t{p.base or ''}")
            for m in p.members:
                mk = type(m).__name__
                if mk == 'CDATA':
                    print(f"{path}\tcode\t{p.name}\t")
                elif mk == 'ConstMember':
                    print(f"{path}\tconst\t{p.name}\t{m.name}")
                elif mk == 'CEnum':
                    print(f"{path}\tcenum\t{p.name}\t{m.basename if hasattr(m, 'basename') else m.name}\t{len(m.variants)}")
                elif mk == 'Attribute':
                    print(f"{path}\tattribute\t{p.name}\t{m.name}\t{'readonly' if m.readonly else ''}")
                elif mk == 'Method':
                    print(f"{path}\tmethod\t{p.name}\t{m.name}\t{len(m.params)}")
                else:
                    print(f"{path}\t{mk}\t{p.name}\t?")
        elif kind == 'Forward':
            print(f"{path}\tforward\t%\t{p.name}")
        elif kind == 'Typedef':
            print(f"{path}\ttypedef\t%\t{p.name}")
        elif kind == 'Native':
            print(f"{path}\tnative\t%\t{p.name}")
        elif kind == 'WebIDL':
            print(f"{path}\twebidl\t%\t{p.name}")
        elif kind == 'Include':
            print(f"{path}\tinclude\t%\t{p.filename}")
        elif kind == 'CDATA':
            print(f"{path}\tcode\t%\t")
        else:
            print(f"{path}\t{kind}\t%\t?")
