// An original short story as a small EPUB 3, written for Lantern's visual
// journey tests and demo (not a real book; free to use). Its scenes change
// place, time, weather and light on purpose, so the scene planner has real
// context shifts to find, and later chapters hold words (snow, the forest)
// that must never reach an earlier painting.

import { zipSync, strToU8 } from 'fflate'

export const STORY_TITLE = 'The Lamp at Gull Point'
export const STORY_AUTHOR = 'Lantern Test Press'

export const STORY = [
  {
    title: 'Chapter One: The Harbour',
    paragraphs: [
      'The evening came down slowly over the harbour at Gull Point. The tide was out, and the boats leaned on their keels in the mud below the quay, their ropes slack, their masts tilted like tired men at the end of a long day. Gulls walked the stone of the quay as if they owned it, and in a way they did.',
      'Nell Arden sat on an upturned crate by the harbour wall with her knees drawn up and her coat buttoned to the chin. She had been told to wait for the carrier, and she had waited since the afternoon. The light on the water had gone from silver to gold and from gold to a dull copper, and still no cart came down the hill.',
      'Behind her the town climbed the slope in crooked rows: grey cottages, a chapel with a squat tower, the long white front of the Anchor Inn with its sign creaking in the breeze. Smoke rose straight from a dozen chimneys. Somewhere a door banged, and a woman called a child in for supper, and the child did not come.',
      'Out beyond the harbour mouth the sea lay flat and quiet, the colour of pewter. On the far point, alone on its rock, stood the lighthouse. It had not yet been lit. Nell watched it the way one watches a clock that has stopped, waiting for it to remember itself.',
      'Old Tom Pascoe came along the quay with a coil of rope over one shoulder and a lantern swinging from his hand, though it was not yet dark. He stopped beside her and looked out at the point. “Carrier’s not coming tonight,” he said. “Wheel’s off at Treloweth. You had better come and see the lamp lit, since you’re here.”',
      'Nell looked at him, and at the long causeway that ran out across the sand to the lighthouse rock, and at the sky, which had begun to turn the deep blue of a bruise along its eastern edge. She stood, brushed the salt from her skirt, and followed him down the steps to the sand.',
      'They walked out along the causeway as the last of the sun went under the hills behind the town. The wet sand on either side gave back the colours of the sky, so that they seemed to walk on a bridge across a great sheet of rose and violet glass. The harbour lights came on one by one behind them, small and yellow and far away.',
      'By the time they reached the rock the evening had turned to dusk, and the tower rose above them, white and enormous, a single small door at its foot. Tom found the key on a string around his neck, and the lock gave with a sound like a cough.',
    ],
  },
  {
    title: 'Chapter Two: The Lamp Room',
    paragraphs: [
      'Inside the lighthouse the air was cold and smelled of paraffin and whitewash. A stair wound up and up around the inside of the tower, iron and narrow, and Nell counted the steps as she climbed: a hundred and twelve to the first landing, where a small window showed the dark sea, and more after that than she could keep count of.',
      'At the top was the lamp room, round and glazed on every side, and in the middle of it stood the great lens, taller than Tom, made of rings of glass that caught the last grey light and broke it into thin cold rainbows. The night pressed against the windows. Far below, the sea had begun to stir.',
      'Tom trimmed the wick and struck a match, and the flame took, small at first, then steady. He wound the clockwork that turned the lens, and slowly, with a sound like a heavy breath, the light began to sweep. Each time it passed, the whole room flared gold and then fell back into the dark.',
      'The wind rose while they sat there. It came in from the west in long pushes that made the glass hum, and then the first rain struck the windows, a scatter of it, then a rush. The storm had come up out of nowhere, the way storms do on that coast. Lightning showed the whole sea white for an instant, every wave standing still.',
      'Nell pressed her forehead to the cold glass and watched the storm walk across the water. Thunder rolled under the tower and up through the soles of her boots. Rain streamed down the panes so that the beam of the lamp went out into the storm as a long blurred arm of light, reaching and reaching and finding nothing.',
      'They kept the lamp all night. Tom told her about the ships that had been lost on the Mare’s Teeth before the light was built, and about the keeper before him, who had kept a canary in the lamp room and claimed it sang when a ship was near. Nell fell asleep on the bench under the window with the beam passing over her face, gold, dark, gold.',
    ],
  },
  {
    title: 'Chapter Three: The Shore',
    paragraphs: [
      'The next morning the storm had blown itself out. Nell woke stiff and cold to a pale clear light and the sound of gulls. The sea was still rough, heaving and grey-green, but the sky above it was washed clean, the palest blue, with a few torn clouds racing east.',
      'Tom had gone down already. She found him on the beach below the rock, walking the tideline with a sack, picking up what the storm had brought in: a cork float, a length of good rope, a bottle with no message in it. The sand was strewn with weed, dark and glistening, and the air smelled of salt and iodine.',
      'They walked the whole length of the beach together as the morning went on, past the black rocks at the end of the bay and round into the next cove, where the cliffs rose sheer and the sand was so white it hurt to look at. Nobody else was there. Their footprints were the only marks on the shore.',
      'At the far end of the cove a path climbed the cliff in zigzags, worn into the turf by generations of feet. Tom said it was the old way inland, to the moor and the villages beyond, and that the carrier, if he ever came, would come that way. Nell looked up at it for a long time.',
    ],
  },
  {
    title: 'Chapter Four: The Moor',
    paragraphs: [
      'On the clifftop the land opened out all at once into the moor: miles of heather and bracken under a huge sky, rolling away to a line of low hills on the horizon. The wind up there was steady and clean. Larks went up singing out of the heather and hung so high they were only sound.',
      'Nell walked inland along the track with the sea at her back. The heather was in flower, a haze of purple and rust that ran right to the hills, broken here and there by a grey standing stone or a boulder spotted with yellow lichen. Sheep lifted their heads to watch her pass and went back to grazing.',
      'By the afternoon a mist began to come in off the sea behind her. It came quietly, filling the hollows first, then rising, until the far hills were gone and then the near ones, and the track ahead faded into white a few yards in front of her feet. The larks fell silent. Every sound was muffled.',
      'She walked on through the fog for a long while, following the ruts of the track and the occasional cairn that some kind traveller had built beside it. Once a shape loomed up out of the white and turned out to be a pony, wet and shaggy, which looked at her with mild surprise and wandered off again.',
      'At dusk the fog thinned, and she saw lights below her in a valley: a handful of cottages, a church, and at the crossroads a long low inn with smoke going up from its chimneys and every window yellow. She went down the hill towards it with her legs aching and her coat soaked through.',
    ],
  },
  {
    title: 'Chapter Five: The Inn',
    paragraphs: [
      'The inn was warm and low and full of firelight. A great fire burned in the hearth at the end of the room, and the beams overhead were black with years of smoke. Brass and pewter shone along the shelves. Men sat at the long tables with their pipes and their pots of ale, and the talk stopped for a moment when she came in, and then went on.',
      'The landlady put her by the fire and brought her bread and cheese and a bowl of broth, and asked no questions until she had eaten. Steam rose from Nell’s coat as it dried. The candles on the tables guttered whenever the door opened, and the shadows of the drinkers grew huge on the walls and shrank again.',
      'It was the carrier himself who sat across the fire from her, it turned out, a broad quiet man with a broken cart and a lame horse and no hurry about either. He had a letter in his bag with her name on it. He gave it to her, and she held it on her knee for a long time in the firelight without opening it.',
    ],
  },
  {
    title: 'Chapter Six: Winter',
    paragraphs: [
      'Weeks later, when the first snow came, Nell was still in the valley. She had taken work at the inn, carrying water and scrubbing tables, and the letter lay unopened in the bottom of her box under the eaves. The snow fell all one night without a sound, and in the morning the whole world was white.',
      'She went out early, before anyone was awake, into the forest that climbed the hill behind the inn. The trees stood black and silent, their branches lined with snow. The light under them was blue and dim. Her breath hung in the air, and the only sound was the creak of the snow under her boots and, now and then, a soft fall as a branch let go its load.',
      'Deep in the wood there was a clearing where an old oak had come down, and there she stopped and brushed the snow from the trunk and sat, and took the letter from her pocket, where she had put it that morning without quite deciding to. The sun came through the trees in long low bars, and the snow glittered.',
    ],
  },
]

const xhtml = (title, body) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><title>${title}</title></head>
<body epub:type="bodymatter chapter">${body}</body></html>`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function buildStoryEpub() {
  const chapters = STORY.map((c, i) => ({
    id: `ch${i + 1}`,
    file: `OEBPS/ch${i + 1}.xhtml`,
    body: `<h1>${esc(c.title)}</h1>` + c.paragraphs.map(p => `<p>${esc(p)}</p>`).join(''),
    title: c.title,
  }))
  const files = {
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`),
    'OEBPS/content.opf': strToU8(`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:lantern:test:gull-point</dc:identifier>
    <dc:title>${STORY_TITLE}</dc:title>
    <dc:creator>${STORY_AUTHOR}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-11-18T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${chapters.map(c => `<item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine>
    ${chapters.map(c => `<itemref idref="${c.id}"/>`).join('\n    ')}
  </spine>
</package>`),
    'OEBPS/nav.xhtml': strToU8(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head>
<body><nav epub:type="toc"><ol>${chapters.map(c => `<li><a href="${c.id}.xhtml">${esc(c.title)}</a></li>`).join('')}</ol></nav></body></html>`),
  }
  for (const c of chapters) files[c.file] = strToU8(xhtml(c.title, c.body))
  return zipSync(files, { level: 0 })
}
