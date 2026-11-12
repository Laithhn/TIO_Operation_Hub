from pathlib import Path
from pypdf import PdfReader

OUT = Path(__file__).parent
mapping = dict(zip('AIJLNSUVW_bceompqtuz{|}~', 'abcdefghikmn oqrstuvwxyzz'.replace(' ', '')))
# Dubai font subset has glyph IDs in its broken ToUnicode table. Decode only that
# subset; retain correctly mapped font text unchanged. Rendered pages verify facts.
mapping = dict(zip('AIJLN SUVW_`bceompqtuz{|}', 'abcde fghiklmnopqrstu v wxy'.replace(' ', '')))
mapping = {'A':'a','I':'b','J':'c','L':'d','N':'e','S':'f','U':'g','V':'h','W':'i','X':'j','_':'k','`':'l','b':'m','c':'n','e':'o','m':'p','o':'q','p':'r','q':'s','t':'t','u':'u','z':'v','{':'w','|':'x','}':'y','~':'z',
           '\x04':'A','\x0c':'B','\r':'C','\x0f':'D','\x11':'E','\x16':'F','\x17':'G','\x18':'H','\x19':'I','\x1a':'J','\x1b':'K','\x1c':'L','"':'M','#':'N','%':'O','-':'P','.':'Q','0':'R','1':'S','3':'T','4':'U','9':'V',':':'W',';':'X','<':'Y','=':'Z',
           '\x03':' ','Ǎ':'.','Ǉ':',','Ǒ':"'",'Ƕ':'"','Ǔ':'-','ǆ':':','ǟ':'(','Ǡ':')','Ⱦ':'/','ȵ':'@'}
mapping.update(dict(zip('ŢţŤťŦŧŨũŪū','0123456789')))

for number, file in [(5194, 'DDGE Contract OYOON 182 AMC 2026 Al Qudra Bluscan SSPX-Print-CEsigned.pdf'),(5196, 'DDGE Contract OYOON 159 ANPR Data Management Solution-Print-CEsigned (002).pdf')]:
    reader=PdfReader(str(Path(r'C:\Users\lmh\Downloads') / file))
    pages=[]
    for i,page in enumerate(reader.pages):
        chunks=[]
        def visit(t,cm,tm,font,fs):
            if not font: return
            name=str(font.get('/BaseFont',''))
            if any(x in name for x in ['MAKDFK', 'MAKDFL', 'MEOAAC', 'MEOAAD']):
                if any(ord(c)>126 and c not in mapping for c in t):
                    return
                t=''.join(mapping.get(c,c) for c in t)
            elif any(ord(c)>126 and c not in '“”’–—' for c in t):
                return
            chunks.append(t)
        page.extract_text(visitor_text=visit)
        pages.append(f'\n=== PAGE {i+1} ===\n'+''.join(chunks))
    (OUT/f'contract-{number}-english.txt').write_text('\n'.join(pages), encoding='utf-8')
    print(number, len(reader.pages), 'pages extracted')
