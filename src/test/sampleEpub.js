// Builds a small, valid EPUB 3 in memory for tests and the end-to-end demo.
// Text: Jane Austen, "Pride and Prejudice" (1813) — public domain.

import { zipSync, strToU8 } from 'fflate'

const xhtml = (title, body, bodyType = 'bodymatter chapter') => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><title>${title}</title><style>p{margin:0}</style><script>alert(1)</script></head>
<body epub:type="${bodyType}">${body}</body></html>`

export const CHAPTER_1 = [
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
  'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
  '“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”',
  'Mr. Bennet replied that he had not.',
]

export const CHAPTER_2 = [
  'Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go.',
  '“I hope Mr. Bingley will like it, Lizzy.”',
]

export const CHAPTER_3 = [
  'Not all that Mrs. Bennet, however, with the assistance of her five daughters, could ask on the subject, was sufficient to draw from her husband any satisfactory description of Mr. Bingley.',
]

export function buildSampleEpub({ encryptText = false, obfuscatedFont = false, extraFiles = {} } = {}) {
  const files = {
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`),
    'OEBPS/content.opf': strToU8(`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:lantern:test:pp</dc:identifier>
    <dc:title>Pride and Prejudice</dc:title>
    <dc:creator>Jane Austen</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="copyright" href="text/copyright.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2-3" href="text/ch2-3.xhtml" media-type="application/xhtml+xml"/>
    <item id="notes" href="text/notes.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="cover"/>
    <itemref idref="copyright"/>
    <itemref idref="ch1"/>
    <itemref idref="ch2-3"/>
    <itemref idref="notes" linear="no"/>
  </spine>
</package>`),
    'OEBPS/text/nav.xhtml': strToU8(xhtml('Contents', `<nav epub:type="toc"><h1>Contents</h1><ol>
      <li><a href="cover.xhtml">Cover</a></li>
      <li><a href="copyright.xhtml">Copyright</a></li>
      <li><a href="ch1.xhtml">Chapter I</a></li>
      <li><a href="ch2-3.xhtml#c2">Chapter II</a></li>
      <li><a href="ch2-3.xhtml#c3">Chapter III</a></li>
    </ol></nav>`, 'toc')),
    'OEBPS/text/cover.xhtml': strToU8(xhtml('Cover', '<div><img src="../images/cover.jpg" alt="Cover"/></div>', 'cover')),
    'OEBPS/text/copyright.xhtml': strToU8(xhtml('Copyright', '<p>This edition is in the public domain.</p>', 'copyright-page')),
    'OEBPS/text/ch1.xhtml': strToU8(xhtml('Chapter I', `
      <section><h2 id="c1">Chapter I</h2>
      ${CHAPTER_1.map((p, i) => i === 0 ? `<p>${p}<a epub:type="noteref" href="notes.xhtml#n1">1</a></p>` : `<p onclick="evil()">${p}</p>`).join('\n')}
      <p class="scene">* * *</p>
      <p>Line one<br/>Line two</p>
      <span epub:type="pagebreak" id="page7" title="7"></span>
      </section>`)),
    'OEBPS/text/ch2-3.xhtml': strToU8(xhtml('Chapters II and III', `
      <h2 id="c2">Chapter II</h2>
      ${CHAPTER_2.map(p => `<p>${p}</p>`).join('\n')}
      <h2 id="c3">CHAPTER III</h2>
      ${CHAPTER_3.map(p => `<p>${p}</p>`).join('\n')}
      <aside epub:type="footnote" id="fn"><p>A footnote that should not be narrated.</p></aside>`)),
    'OEBPS/text/notes.xhtml': strToU8(xhtml('Notes', '<p id="n1">1. A note.</p>', 'backmatter endnotes')),
    ...extraFiles,
  }
  if (encryptText || obfuscatedFont) {
    const uri = encryptText ? 'OEBPS/text/ch1.xhtml' : 'OEBPS/fonts/font.otf'
    files['META-INF/encryption.xml'] = strToU8(`<?xml version="1.0"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#">
  <enc:EncryptedData><enc:CipherData><enc:CipherReference URI="${uri}"/></enc:CipherData></enc:EncryptedData>
</encryption>`)
  }
  return zipSync(files, { level: 0 })
}
